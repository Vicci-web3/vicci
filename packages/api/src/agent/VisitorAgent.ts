import {
    AgentKit,
    CdpWalletProvider,
    wethActionProvider,
    walletActionProvider,
    erc20ActionProvider,
    cdpApiActionProvider,
    cdpWalletActionProvider,
    pythActionProvider,
} from "@coinbase/agentkit";

import { ViemWalletProvider } from "@coinbase/agentkit";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { createPublicClient, http } from "viem";

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { Tool } from "@langchain/core/tools";
import { BaseLanguageModel } from "@langchain/core/language_models/base";
import { BaseMemory } from "@langchain/core/memory";
import { DynamicStructuredTool } from "@langchain/core/tools";
import { z } from 'zod';
import * as fs from "fs";
import * as readline from "readline";
import { createWalletProvider } from '../utils/wallet-provider'
import { vicciCampaignProvider } from '../actions/create-campaign';
import { vicciCouponProvider } from '../actions/create-coupon';

import { PrismaClient } from '@prisma/client';
import { MessageBus } from '../messageBus';
import { globalMessageBus } from '../server';

// Define message topics
export const Topics = {
  CHAT_MESSAGE: 'chat.message',
  VISITOR_QUERY: 'visitor.query',
  VISITOR_RESPONSE: 'visitor.response',
  AGENT_STATUS: 'agent.status'
} as const;

// Define payload types for each topic
export interface TopicPayloadMap {
  [Topics.CHAT_MESSAGE]: {
    type: 'user' | 'assistant';
    role: 'venue' | 'visitor';
    content: string;
    timestamp: string;
  };
  [Topics.VISITOR_QUERY]: {
    visitorId: string;
    content: string;
  };
  [Topics.VISITOR_RESPONSE]: {
    visitorId: string;
    response: string;
    confidence: number;
    relevantDocs: {
      content: string;
      metadata: any;
    }[];
  };
  [Topics.AGENT_STATUS]: {
    agentId: string;
    status: string;
    config: any;
    timestamp: string;
  };
}

type AgentType = 'counsellor' | 'campaignManager';

interface AgentConfig {
    messageModifier: string;
    actionProviders: any[];
}

console.log('Loading agent/index.ts');

interface AgentCallbacks {
    sendMessage: (message: string) => void;
    requestPermit: (permitData: any) => void;
}

const WALLET_DATA_FILE = "wallet_data.txt";

interface BoxConfig {
  name: 'rewardAmount' | 'venueAddress';
  regex: RegExp;
  validator: RegExp;
  errorMessage: string;
}

interface CurrentValues {
  rewardAmount?: string;
  venueAddress?: string;
}

interface RAGResponse {
  response: string
  confidence: number
  relevantDocs: {
    content: string
    metadata: any
  }[]
}

export default class VisitorAgent {
    private agent: any;
    private prisma: PrismaClient;
    private config: any;
    private rl: readline.Interface | null = null;
    private walletProvider: ViemWalletProvider;
    private tools: DynamicStructuredTool[] = [];
    private chain!: BaseLanguageModel;
    private memory!: BaseMemory;
    private callbacks: AgentCallbacks;
    private permitSignaturePromise: Promise<string> | null = null;
    private permitSignatureResolve: ((signature: string) => void) | null = null;
    private messageBus: MessageBus;
    private visitorId: string | null = null;
    
    private static PERMIT_REQUEST_REGEX = /permit request for (\d+(\.\d+)?)/i;

    private static AMOUNT_VALIDATOR = /^\d+(\.\d+)?$/;
    private static ADDRESS_VALIDATOR = /^0x[a-fA-F0-9]{40}$/;

    private currentValues: CurrentValues | null = null;

    private static readonly BOX_CONFIGS: BoxConfig[] = [
        {
            name: 'rewardAmount',
            regex: /reward amount:\s*(\d+(\.\d+)?)/i,
            validator: VisitorAgent.AMOUNT_VALIDATOR,
            errorMessage: 'Invalid reward amount format'
        },
        {
            name: 'venueAddress',
            regex: /venue address:\s*(0x[a-fA-F0-9]{40})/i,
            validator: VisitorAgent.ADDRESS_VALIDATOR,
            errorMessage: 'Invalid venue address format'
        }
    ];

    private static REWARD_AMOUNT_INPUT_REGEX = /(?:reward|amount|pool)\s*(?:of|:)?\s*(\d+)/i;
    private static VENUE_ADDRESS_INPUT_REGEX = /(?:venue|address|from):?\s*(0x[a-fA-F0-9]{40})/i;

    private static instance: VisitorAgent | null = null;
    private static currentValues: Record<string, any> = {};

    constructor(callbacks: AgentCallbacks, visitorId?: string) {
        console.log('Creating wallet provider...');
        this.walletProvider = createWalletProvider();
        this.callbacks = callbacks;
        this.prisma = new PrismaClient();
        this.messageBus = globalMessageBus;
        this.visitorId = visitorId || null;
        this.initialize().catch(console.error);
    }

    private getAgentConfig(): AgentConfig {
        console.log('Getting agent config...');
        const baseProviders = [
            //wethActionProvider(),
            //pythActionProvider(),
            //walletActionProvider(),
            //erc20ActionProvider(),
            vicciCampaignProvider(this.walletProvider),
            vicciCouponProvider(this.walletProvider),
        ];

        const cdpProviders = [
            /*
            cdpApiActionProvider({
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
            cdpWalletActionProvider({
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
            */
        ];

        const config: AgentConfig = {
                messageModifier: `
                `,
                actionProviders: [vicciCouponProvider(this.walletProvider)],
            }

        return config;
    }

    private validateEnvironment(): void {
        console.log('Validating environment variables...')
        const missingVars: string[] = [];

        const requiredVars = [
            "ANTHROPIC_API_KEY",
            "CDP_API_KEY_NAME", 
            "CDP_API_KEY_PRIVATE_KEY"
        ];

        requiredVars.forEach(varName => {
            if (!process.env[varName]) {
                console.warn(`Missing environment variable: ${varName}`)
                missingVars.push(varName);
            }
        });

        if (missingVars.length > 0) {
            console.error("Error: Required environment variables are not set:", missingVars)
            throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
        }

        if (!process.env.NETWORK_ID) {
            console.warn("Warning: NETWORK_ID not set, defaulting to base-sepolia testnet");
        }
        
        console.log('Environment validation successful')
    }

    private async initialize() {
        console.log('Initializing agent...');
        try {
            // Remove MessageBus connection since we're using the shared instance
            console.log('\n=== Setting up VisitorAgent ===');
            console.log('Using shared message bus instance');

            const llm = new ChatAnthropic({
                anthropicApiKey: process.env.ANTHROPIC_API_KEY,
                temperature: 0,
                modelName: "claude-3-5-sonnet-latest",
            });

            let walletDataStr: string | null = null;

            if (fs.existsSync(WALLET_DATA_FILE)) {
                try {
                    walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
                } catch (error) {
                    console.error("Error reading wallet data:", error);
                }
            }
            /*
            const config = {
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                cdpWalletData: walletDataStr || undefined,
                networkId: process.env.NETWORK_ID || "base-sepolia",
            };

            const walletProvider = await CdpWalletProvider.configureWithWallet(config);
            */
            const agentConfig = this.getAgentConfig();
            console.log('this.walletProvider', this.walletProvider);
            const agentkit = await AgentKit.from({
                //this.walletProvider,
                cdpApiKeyName: process.env.CDP_API_KEY_NAME,
                cdpApiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                actionProviders: [vicciCouponProvider(this.walletProvider)],
            });

            const tools = await getLangChainTools(agentkit);
            this.tools = tools as DynamicStructuredTool[];
            this.chain = llm;
            this.memory = new MemorySaver() as unknown as BaseMemory;

            // Type-safe campaign query
            type Campaign = {
                objective: string;
            };
            
            const campainIdOptions = await (this.prisma as any).campaign.findMany({
                take: 50,
                orderBy: {
                    createdAt: 'desc'
                },
                select: {
                    objective: true
                }
            }).then((campaigns: Campaign[]) => campaigns.map((c: Campaign) => c.objective));
            console.log('campainIdOptions', campainIdOptions)
            const messageModifier = `
                You are a helpful Visitor Information Counsellor that can interact onchain using the Coinbase Developer Platform AgentKit.
                You can help visitors with:
                - counselling them on onchain experiences they may like
                - provide venue coupons and rewards for onchain experiences
                Required parameters:
                [AGENT_ADDRESS]"0x8f5c3EE4007ad86F38288b78A9ED7C54afBcA87f"[/AGENT_ADDRESS]
                [VISITOR_ADDRESS]<0x address>[/VISITOR_ADDRESS]
                [REWARD_AMOUNT]<number between 100-1000>[/REWARD_AMOUNT]
                Depending on how much information they offer you can offer them a reward between 100-1000
                1. Before Attempting to Offer a Reward Claim you must first gather some information from the visitor.
                2. once you have gathered some information about what sort of experiences they want to explore in blockchain you can run the create-coupon tool
                Here is an array of options to choose from: ${campainIdOptions}
                let them choose one option from the list and add it to the message:
                [CAMPAIGN_ID]<campaignId>[/CAMPAIGN_ID]
            `
            
            this.config = { configurable: { thread_id: `CDP Visitor Agent` } };
            this.agent = createReactAgent({
                llm,
                tools,
                messageModifier: messageModifier,
            });

            //const exportedWallet = await walletProvider.exportWallet();
            //fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

            console.log('Agent initialized successfully');
        } catch (error) {
            console.error('Failed to initialize agent:', error);
            throw error;
        }
    }

    /**
     * Start an interactive chat session with the agent
     */
    public async startChat(): Promise<void> {
        console.log(`Starting Visitor Agent chat session... Type 'exit' to end.`);

        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
        });

        try {
            while (true) {
                const userInput = await this.question("\nPrompt: ");

                if (userInput.toLowerCase() === "exit") {
                    break;
                }

                await this.processUserInput(userInput);
            }
        } catch (error) {
            console.error("Chat error:", error);
            throw error;
        } finally {
            this.closeChat();
        }
    }

    /**
     * Process a single user input and return the agent's response
     */
    public async processUserInput(input: string): Promise<string[]> {
        try {
            console.log('\n=== VisitorAgent Processing User Input ===');
            console.log('Raw input:', input);

            // Extract venue address if present
            const venueAddressMatch = input.match(/\[VENUE_ADDRESS\](.*?)\[\/VENUE_ADDRESS\]/);
            const venueAddress = venueAddressMatch ? venueAddressMatch[1] : null;
            console.log('Extracted venue address:', venueAddress);

            // Publish user message to indexer
            console.log('\nPublishing message to chat.message topic...');
            const chatMessage: TopicPayloadMap[typeof Topics.CHAT_MESSAGE] = {
                type: 'user',
                role: 'visitor',
                content: input,
                timestamp: new Date().toISOString()
            };
            console.log('Message payload:', chatMessage);
            
            await this.messageBus.publish(Topics.CHAT_MESSAGE, chatMessage);
            console.log('✓ Successfully published to chat.message topic');

            // Request RAG-enhanced context if we have a visitor ID
            let ragResponse: RAGResponse | null = null;
            if (this.visitorId) {
                try {
                    // Request RAG response
                    const queryPayload: TopicPayloadMap[typeof Topics.VISITOR_QUERY] = {
                        visitorId: this.visitorId,
                        content: input
                    };
                    await this.messageBus.publish(Topics.VISITOR_QUERY, queryPayload);

                    // Wait for response with timeout
                    const responsePromise = new Promise<RAGResponse>((resolve) => {
                        this.messageBus.subscribe(Topics.VISITOR_RESPONSE, async (response: TopicPayloadMap[typeof Topics.VISITOR_RESPONSE]) => {
                            if (response.visitorId === this.visitorId) {
                                resolve(response);
                            }
                            return Promise.resolve();
                        });
                    });

                    // Wait for response with 5 second timeout
                    ragResponse = await Promise.race([
                        responsePromise,
                        new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000))
                    ]);
                } catch (error) {
                    console.error('Error getting RAG response:', error);
                }
            }

            // Enhance the user input with RAG context if available
            let enhancedInput = input;
            if (ragResponse) {
                enhancedInput = `
                    Original user query: ${input}

                    Relevant historical context:
                    ${ragResponse.relevantDocs.map(doc => `
                        ${doc.content}
                        (From ${doc.metadata.role} at ${doc.metadata.timestamp})
                    `).join('\n')}

                    Previous AI suggestion:
                    ${ragResponse.response}
                    (Confidence: ${ragResponse.confidence})

                    Please provide a response that:
                    1. Addresses the user's query
                    2. Takes into account the historical context
                    3. Maintains consistency with previous responses
                    4. Is helpful and actionable
                `;
            }

            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Processing timeout')), 30000);
            });

            const streamPromise = this.agent.stream(
                { messages: [new HumanMessage(enhancedInput)] }, 
                this.config
            );

            const stream = await Promise.race([streamPromise, timeoutPromise]);
            console.log('Got stream, starting to process chunks');

            let chunkCount = 0;
            const responses: string[] = [];
            for await (const chunk of stream) {
                console.log('Processing chunk:', chunk);
                chunkCount++;
                if (chunkCount > 100) {
                    throw new Error('Too many chunks received');
                }

                let content = '';
                if ("agent" in chunk) {
                    content = chunk.agent.messages[0].content;
                } else if ("tools" in chunk) {
                    content = chunk.tools.messages[0].content;
                }
                
                if (content) {
                    responses.push(content);
                    this.callbacks.sendMessage(content);
                    
                    // Publish agent response to indexer
                    const assistantMessage: TopicPayloadMap[typeof Topics.CHAT_MESSAGE] = {
                        type: 'assistant',
                        role: 'visitor',
                        content: content,
                        timestamp: new Date().toISOString()
                    };
                    await this.messageBus.publish(Topics.CHAT_MESSAGE, assistantMessage);
                }
            }
            console.log('Finished processing all chunks');
            return responses;
        } catch (error) {
            console.error("Error processing input:", error);
            this.callbacks.sendMessage('Failed to process message: ' + (error instanceof Error ? error.message : 'Unknown error'));
            throw error;
        }
    }

    private question(prompt: string): Promise<string> {
        return new Promise((resolve) => {
            if (this.rl) {
                this.rl.question(prompt, resolve);
            } else {
                throw new Error("Readline interface not initialized");
            }
        });
    }

    private closeChat(): void {
        if (this.rl) {
            this.rl.close();
            this.rl = null;
        }
    }

    async requestPermitSignature(permitData: any): Promise<string> {
        this.permitSignaturePromise = new Promise((resolve) => {
            this.permitSignatureResolve = resolve;
        });

        // Request permit signature from frontend
        this.callbacks.requestPermit(permitData);

        // Wait for signature
        return this.permitSignaturePromise;
    }

    async handlePermitSignature(signature: string) {
        try {
            console.log('\n=== Handling Permit Signature ===');
            console.log('Current stored values:', this.currentValues);
            
            if (this.permitSignatureResolve) {
                // Store the signature with the current values
                if (this.currentValues?.rewardAmount && this.currentValues?.venueAddress) {
                    console.log('✓ Using stored values for campaign creation:', {
                        rewardAmount: this.currentValues.rewardAmount,
                        venueAddress: this.currentValues.venueAddress
                    });
                    
                    // Create campaign with stored values
                    this.callbacks.sendMessage(
                        `Great! Creating campaign with stored values:\n` +
                        `[REWARD_AMOUNT]${this.currentValues.rewardAmount}[/REWARD_AMOUNT]\n` +
                        `[VENUE_ADDRESS]${this.currentValues.venueAddress}[/VENUE_ADDRESS]\n\n` +
                        `Using the provided signature to create the campaign...`
                    );
                    
                    this.permitSignatureResolve(signature);
                } else {
                    console.log('⚠️ Missing stored values when handling signature');
                    this.callbacks.sendMessage(
                        "Error: Required values were lost. Please start the campaign creation process again."
                    );
                }
                
                this.permitSignatureResolve = null;
                this.permitSignaturePromise = null;
            }
        } catch (error) {
            console.error('Error handling permit signature:', error);
            this.callbacks.sendMessage(
                "Error handling signature. Please try the campaign creation process again."
            );
        }
    }

    private initializeCurrentValues() {
        if (this.currentValues === null) {
            console.log('Initializing new current values storage');
            this.currentValues = {
                rewardAmount: null,
                venueAddress: null,
                rewardToken: null,
                agentAddress: null,
                campaignId: null,
                signature: null
            };
        } else {
            console.log('Using existing stored values:', this.currentValues);
        }
    }

    private checkInputMessage(message: string) {
        try {
            console.log('\n=== Checking Input Message ===');
            console.log('Raw message:', message);

            const results = VisitorAgent.BOX_CONFIGS.map(config => {
                const match = message.match(config.regex);
                const matchDetails = {
                    name: config.name,
                    found: !!match,
                    fullMatch: match?.[0],
                    capturedValue: match?.[1],
                    isValid: match ? config.validator.test(match[1]) : false
                };

                if (!matchDetails.found) {
                    console.log(`⚠️ No ${config.name} found in message`);
                } else if (!matchDetails.isValid) {
                    console.log(`⚠️ Found ${config.name} but failed validation:`, matchDetails.capturedValue);
                } else {
                    console.log(`✓ Valid ${config.name} found:`, matchDetails.capturedValue);
                }

                return {
                    config,
                    match,
                    details: matchDetails
                };
            });

            console.log('Match results:', results);

            return {
                matches: results,
                matchDetails: Object.fromEntries(
                    results.map(r => [r.config.name, r.details])
                )
            };
        } catch (error) {
            console.error('Error checking input message:', error);
            return {
                matches: [],
                matchDetails: {}
            };
        }
    }

    private updateStoredValues(results: { config: typeof VisitorAgent.BOX_CONFIGS[0], match: RegExpMatchArray | null }[]) {
        try {
            results.forEach(({ config, match }) => {
                if (match && config.validator.test(match[1])) {
                    console.log(`✓ Storing valid ${config.name}:`, match[1]);
                    if (this.currentValues) {
                        this.currentValues[config.name] = match[1];
                    }
                }
            });
        } catch (error) {
            console.error('Error updating stored values:', error);
        }
    }

    private async handlePermitRequest(response: string) {
        try {
            const permitMatch = response.match(VisitorAgent.PERMIT_REQUEST_REGEX);
            console.log('Permit Request Match:', {
                found: !!permitMatch,
                match: permitMatch,
                currentValues: this.currentValues // Log current values for debugging
            });

            if (!permitMatch) return false;

            console.log('\n=== Found Permit Request ===');
            console.log('Using stored values:', this.currentValues);

            // If we have both values stored, proceed with permit request
            if (this.currentValues?.rewardAmount && this.currentValues?.venueAddress) {
                console.log('✓ Using previously stored values for permit request');
                await this.requestPermitSignatureWithValues(permitMatch[1].trim());
                return true;
            }

            // Only ask for missing values if we don't have them
            const missingParams = [];
            if (!this.currentValues?.rewardAmount) {
                missingParams.push("[REWARD_AMOUNT]<number>[/REWARD_AMOUNT]");
            }
            if (!this.currentValues?.venueAddress) {
                missingParams.push("[VENUE_ADDRESS]<0x address>[/VENUE_ADDRESS]");
            }

            if (missingParams.length > 0) {
                this.callbacks.sendMessage(
                    "I still need the following information:\n" + 
                    missingParams.join('\n') +
                    "\n\nPlease provide the missing information in exactly this format."
                );
                return true;
            }

            return false;
        } catch (error) {
            console.error('Error handling permit request:', error);
            return false;
        }
    }

    private async requestPermitSignatureWithValues(permitMessage: string) {
        try {
            const mockERC20Address = "0xd1e07d461df1371d7379e77d09a9d73f0d358f3f";
            const nonce = await this.walletProvider.readContract({
                address: mockERC20Address as `0x${string}`,
                abi: MockERC20ABI.abi,
                functionName: 'nonces',
                args: [this.currentValues!.venueAddress as `0x${string}`]
            });

            const deadline = 2703166645;
            
            const permitData = {
                owner: this.currentValues!.venueAddress,
                spender: "0xbb7e1ceeb5c62f11ae93341bfbe5d94d407c4e71",
                value: this.currentValues!.rewardAmount,
                nonce: Number(nonce),
                deadline
            };

            this.callbacks.requestPermit(permitData);
            this.callbacks.sendMessage(
                `Using stored values:\n` +
                `[REWARD_AMOUNT]${this.currentValues!.rewardAmount}[/REWARD_AMOUNT]\n` +
                `[VENUE_ADDRESS]${this.currentValues!.venueAddress}[/VENUE_ADDRESS]\n\n` +
                permitMessage
            );
        } catch (error) {
            console.error('Error requesting permit signature:', error);
            throw error;
        }
    }

    private preprocessMessage(message: string) {
        try {
            console.log('\n=== Preprocessing User Message ===');
            console.log('Raw message:', message);

            // Extract values from raw input
            const rewardMatch = message.match(VisitorAgent.REWARD_AMOUNT_INPUT_REGEX);
            const venueMatch = message.match(VisitorAgent.VENUE_ADDRESS_INPUT_REGEX);

            console.log('Preprocessing matches:', {
                reward: {
                    found: !!rewardMatch,
                    value: rewardMatch?.[1]
                },
                venue: {
                    found: !!venueMatch,
                    value: venueMatch?.[1]
                }
            });

            // Validate and store values if found
            if (rewardMatch && VisitorAgent.AMOUNT_VALIDATOR.test(rewardMatch[1])) {
                console.log('✓ Found valid reward amount in input:', rewardMatch[1]);
                this.currentValues!.rewardAmount = rewardMatch[1];
            }
            if (venueMatch && VisitorAgent.ADDRESS_VALIDATOR.test(venueMatch[1])) {
                console.log('✓ Found valid venue address in input:', venueMatch[1]);
                this.currentValues!.venueAddress = venueMatch[1];
            }

            return message;
        } catch (error) {
            console.error('Error preprocessing message:', error);
            return message;
        }
    }

    async handleMessage(message: string) {
        try {
            console.log('\n=== Starting Message Processing ===');
            
            if (!this.currentValues) {
                this.initializeCurrentValues();
            }

            // Check for boxed values in message
            const { matches } = this.checkInputMessage(message);
            this.updateStoredValues(matches);
            
            console.log('Current values after processing:', this.currentValues);

            // Process agent responses
            const responses = await this.processUserInput(message);
            
            for (const response of responses) {
                try {
                    console.log('\n=== Checking Agent Response ===');
                    console.log('Response Content:', response);
                    
                    // Check for boxed values in response
                    const { matches: responseMatches } = this.checkInputMessage(response);
                    this.updateStoredValues(responseMatches);
                    
                    console.log('Current values after response:', this.currentValues);

                    const handledPermit = await this.handlePermitRequest(response);
                    if (!handledPermit) {
                        this.callbacks.sendMessage(response);
                    }
                } catch (error) {
                    console.error('Error processing response:', error);
                    continue;
                }
            }
        } catch (error) {
            console.error('Error in handleMessage:', error);
            this.callbacks.sendMessage("Sorry, there was an error processing your request. Please try again.");
        }
    }
}