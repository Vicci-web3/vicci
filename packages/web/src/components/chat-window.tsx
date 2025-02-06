'use client'

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageSquare, X, Loader2 } from 'lucide-react'
import { cn } from "@/lib/utils"

interface Message {
  role: "agent" | "user" | "system"
  content: string
  timestamp: string
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
  const [isOpen, setIsOpen] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [ws, setWs] = useState<WebSocket | null>(null)
  const [connecting, setConnecting] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && !ws) {
      setConnecting(true)
      console.log('Attempting WebSocket connection to:', `ws://${window.location.hostname}:3000/ws/agent`)
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
          console.log('Received chat response:', response.message)
          setMessages(prev => [...prev, {
            role: 'agent',
            content: Array.isArray(response.message) ? response.message.join('\n') : response.message,
            timestamp: new Date().toLocaleTimeString()
          }])
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
  }, [isOpen, agentType])

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

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

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
                  <div className={cn(
                    "p-3 rounded-lg",
                    message.role === "system" && "bg-muted text-muted-foreground text-center",
                    message.role === "agent" && "bg-accent text-accent-foreground",
                    message.role === "user" && "bg-primary text-primary-foreground"
                  )}>
                    <p className="text-base whitespace-pre-wrap">{message.content}</p>
                  </div>
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