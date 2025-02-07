'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"
import { useAccount, usePublicClient, useWalletClient } from 'wagmi'
import MockERC20 from '@/lib/MockERC20.json'

interface Message {
  role: "agent" | "user" | "system" | "action"
  content: string
  timestamp: string
  action?: {
    type: "permit_sign"
    data: {
      owner: string
      spender: string
      value: string
      nonce: number
      deadline: number
    }
  }
}

interface ChatWindowProps {
  agentType: 'counsellor' | 'campaignManager'
}

const getWelcomeMessage = (agentType: string): string => {
  if (agentType === 'counsellor') {
    return "Hello! I'm your Visitor Information Counsellor. I can help you check venue access eligibility, verify credentials, and answer questions about venue requirements. How can I assist you today?"
  }
  return "Welcome! I'm your Campaign Manager assistant. I can help you create and manage token-gating campaigns, set up rewards, and handle venue credentials. What would you like to do?"
}

export function ChatWindow({ agentType }: ChatWindowProps) {
  const { address } = useAccount()
  const publicClient = usePublicClient()
  const { data: walletClient } = useWalletClient()
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connecting, setConnecting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const PERMIT_REQUEST_REGEX = /\[PERMIT_REQUEST\](.*?)\[\/PERMIT_REQUEST\]/s;

  useEffect(() => {
    if (isOpen && !ws) {
      setConnecting(true)
      const websocket = new WebSocket(`ws://${window.location.hostname}:3000/ws/agent`)
      
      websocket.onopen = () => {
        console.log('WebSocket connected, initializing agent...');
        websocket.send(JSON.stringify({
          type: 'init',
          agentType
        }));
        
        // Add welcome message
        setMessages([{
          role: 'system',
          content: getWelcomeMessage(agentType),
          timestamp: new Date().toLocaleTimeString()
        }])
      }

      websocket.onmessage = (event) => {
        const response = JSON.parse(event.data)
        console.log('Received WebSocket response:', response)
        
        if (response.type === 'init' && response.success) {
          console.log('Agent initialized successfully')
          setConnecting(false)
        }
        else if (response.type === 'chat' && response.success) {
          const message = Array.isArray(response.message) ? response.message.join('\n') : response.message;
          console.log('Checking message for permit request:', message);
          
          const permitMatch = message.match(PERMIT_REQUEST_REGEX);
          if (permitMatch) {
            console.log('Found permit request in message');
            
            // Use a fixed far future deadline (Year 2055)
            const deadline = 2703166645;
            
            const permitData = {
              owner: "0x788CED731764Cf1BdBF0DA8aCEdAcA7CaE4C9997",
              spender: "0xbb7e1ceeb5c62f11ae93341bfbe5d94d407c4e71",
              value: "1000",
              nonce: 0,
              deadline
            };

            setMessages(prev => [...prev, {
              role: 'action',
              content: 'Please sign the permit message to allow token transfer.',
              timestamp: new Date().toLocaleTimeString(),
              action: {
                type: 'permit_sign',
                data: permitData
              }
            }]);
          }
          
          setMessages(prev => [...prev, {
            role: 'agent',
            content: message,
            timestamp: new Date().toLocaleTimeString()
          }]);
        }
        else if (response.type === 'permit_request') {
          console.log('Received permit request:', response.data);
          // Add message showing permit request
          setMessages(prev => [...prev, {
            role: 'action',
            content: 'Please sign the permit message to allow token transfer.',
            timestamp: new Date().toLocaleTimeString(),
            action: {
              type: 'permit_sign',
              data: response.data
            }
          }])
          // Trigger permit signing
          handlePermitSign(response.data)
        }
      }

      websocket.onerror = (error) => {
        console.error('WebSocket error:', error)
        setMessages(prev => [...prev, {
          role: 'system',
          content: 'Error connecting to agent. Please try again later.',
          timestamp: new Date().toLocaleTimeString()
        }])
        setConnecting(false)
      }

      websocket.onclose = () => {
        console.log('WebSocket closed')
        setWs(null)
        setConnecting(false)
      }

      setWs(websocket)

      return () => {
        websocket.close()
        setWs(null)
      }
    }
  }, [isOpen, agentType, address])

  const handleSend = () => {
    if (!input.trim() || !ws || connecting) return;

    const userMessage: Message = {
      role: 'user',
      content: input,
      timestamp: new Date().toLocaleTimeString()
    }

    console.log('Sending message:', {
      type: 'chat',
      message: input
    });

    setMessages(prev => [...prev, userMessage]);
    
    try {
      ws.send(JSON.stringify({
        type: 'chat',
        message: input
      }));
      setInput(''); // Clear input after sending
    } catch (error) {
      console.error('Error sending message:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const handlePermitSign = async (data: Message['action']['data']) => {
    console.log('=== Starting Permit Sign Process ===');
    try {
      const mockERC20Address = MockERC20.addresses['84532']
      
      // Get current nonce using readContract
      console.log('Fetching nonce for address:', data.owner);
      const nonce = await publicClient.readContract({
        address: mockERC20Address as `0x${string}`,
        abi: MockERC20.abi,
        functionName: 'nonces',
        args: [data.owner]
      })
      console.log('Current nonce:', nonce);

      if (!walletClient) throw new Error('Wallet not connected');

      // Get domain separator from contract
      const domainSeparator = await publicClient.readContract({
        address: mockERC20Address as `0x${string}`,
        abi: MockERC20.abi,
        functionName: 'DOMAIN_SEPARATOR',
      })
      console.log('Domain Separator:', domainSeparator);
      
      const typedData = {
        types: {
          EIP712Domain: [
            { name: 'name', type: 'string' },
            { name: 'version', type: 'string' },
            { name: 'chainId', type: 'uint256' },
            { name: 'verifyingContract', type: 'address' }
          ],
          Permit: [
            { name: 'owner', type: 'address' },
            { name: 'spender', type: 'address' },
            { name: 'value', type: 'uint256' },
            { name: 'nonce', type: 'uint256' },
            { name: 'deadline', type: 'uint256' }
          ]
        },
        primaryType: 'Permit',
        domain: {
          name: 'MockERC20',
          version: '1',
          chainId: 84532,
          verifyingContract: mockERC20Address
        },
        message: {
          owner: data.owner,
          spender: data.spender,
          value: data.value,
          nonce: nonce.toString(),
          deadline: data.deadline.toString()
        }
      };

      console.log('Signing data:', JSON.stringify(typedData, null, 2));
      
      // Try with eth_signTypedData
      const signature = await walletClient.request({
        method: 'eth_signTypedData_v4',
        params: [data.owner, typedData]
      });


      console.log('Got signature:', signature);

      ws?.send(JSON.stringify({
        type: 'chat',
        message: `Signature completed: ${signature}`
      }));

      setMessages(prev => [...prev, {
        role: 'system',
        content: 'Permit signature provided successfully.',
        timestamp: new Date().toLocaleTimeString()
      }]);

    } catch (error) {
      console.error('Permit signing error:', error);
      setMessages(prev => [...prev, {
        role: 'system',
        content: error instanceof Error ? 
          `Failed to sign permit: ${error.message}` : 
          'Failed to sign permit. Please try again.',
        timestamp: new Date().toLocaleTimeString()
      }]);
    }
  }

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const renderMessage = (message: Message) => {
    console.log('Rendering message:', message);
    if (message.role === 'action' && message.action?.type === 'permit_sign') {
      console.log('Rendering permit sign action');
      return (
        <div className="bg-yellow-100 dark:bg-yellow-900 p-3 rounded-lg">
          <p>{message.content}</p>
          <Button 
            onClick={() => {
              console.log('Sign permit button clicked');
              handlePermitSign(message.action!.data);
            }}
            disabled={connecting}
            className="mt-2"
          >
            {connecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Signing...
              </>
            ) : (
              'Sign Permit'
            )}
          </Button>
        </div>
      )
    }
    
    return (
      <div className={cn(
        "p-3 rounded-lg",
        message.role === "system" && "bg-muted text-muted-foreground text-center",
        message.role === "agent" && "bg-accent text-accent-foreground",
        message.role === "user" && "bg-primary text-primary-foreground"
      )}>
        <p className="text-base whitespace-pre-wrap">{message.content}</p>
      </div>
    )
  }

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 h-12 w-12 rounded-full bg-primary text-primary-foreground"
      >
        <MessageSquare className="h-6 w-6" />
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 flex  items-center justify-center">
      <div className="w-2/3 h-[600px] bg-card text-card-foreground border bg-black shadow-lg rounded-lg flex flex-col">
        <div className="p-4 border-b flex justify-between items-center bg-card">
          <h2 className="font-semibold text-lg flex items-center gap-2 text-foreground">
            {agentType === 'counsellor' ? 'Visitor Information' : 'Campaign Manager'}
            {connecting && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
          </h2>
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => setIsOpen(false)}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        <ScrollArea className="flex-1 p-4 bg-card" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div
                key={index}
                className={cn(
                  "flex gap-2 max-w-[80%]",
                  message.role === "user" && "ml-auto",
                  message.role === "system" && "mx-auto"
                )}
              >
                {message.role === "agent" && (
                  <div className="h-8 w-8 rounded-full bg-primary flex-shrink-0" />
                )}
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {message.timestamp}
                    </span>
                  </div>
                  {renderMessage(message)}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t bg-card">
          <form 
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }} 
            className="flex gap-2"
          >
            <Textarea
              placeholder="Type a message..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyPress}
              disabled={connecting}
              className="min-h-[44px] max-h-32 text-base bg-background text-foreground border-input"
            />
            <Button 
              type="submit"
              disabled={connecting || !input.trim()}
              className="text-base bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Send
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
} 