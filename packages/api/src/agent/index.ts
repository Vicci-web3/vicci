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

const WALLET_DATA_FILE = "wallet_data.txt";

type AgentType = 'counsellor' | 'campaignManager';

interface AgentConfig {
    type: AgentType;
    messageModifier: string;
    actionProviders: any[];
}

console.log('Loading agent/index.ts');

export default class CoinbaseAgent {
    private agent: any;
    private config: any;
    private rl: readline.Interface | null = null;
    private agentType: AgentType;
    private walletProvider: ViemWalletProvider
    private tools: Tool[] = [];
    private chain: BaseLanguageModel;
    private memory: BaseMemory;
    
    constructor(type: AgentType = 'counsellor') {
        console.log(`Creating new CoinbaseAgent of type: ${type}`);
        this.agentType = type;
        console.log('Creating wallet provider...');
        this.walletProvider = createWalletProvider();
        console.log('Wallet provider created:', this.walletProvider);
        try {
            this.validateEnvironment();
            this.initialize();
        } catch (error) {
            console.error('Failed to create CoinbaseAgent:', error);
            throw error;
        }
    }

    private getAgentConfig(): AgentConfig {
        console.log('Getting agent config...');
        const baseProviders = [
            //wethActionProvider(),
            //pythActionProvider(),
            //walletActionProvider(),
            //erc20ActionProvider(),
            vicciCampaignProvider(this.walletProvider),
        ];
        console.log('Base providers created:', baseProviders);

        const cdpProviders = [
            cdpApiActionProvider({
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
            cdpWalletActionProvider({
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
            }),
        ];

        const configs: Record<AgentType, AgentConfig> = {
            counsellor: {
                type: 'counsellor',
                messageModifier: `
                    You are a helpful Visitor Information Counsellor that can interact onchain using the Coinbase Developer Platform AgentKit.
                    Your primary role is to assist visitors with:
                    - Checking their eligibility for venue access
                    - Verifying their credentials and tokens
                    - Helping with token-gating issues
                    - Providing information about venue requirements
                    
                    If you ever need funds, you can request them from the faucet if you are on network ID 'base-sepolia'.
                    Before executing your first action, get the wallet details to see what network you're on.
                    If there is a 5XX error, ask the user to try again later.
                    Be concise and helpful with your responses.
                `,
                actionProviders: [...baseProviders, ...cdpProviders],
            },
            campaignManager: {
                type: 'campaignManager',
                messageModifier: `
                    You are a Campaign Manager agent that can interact onchain using the Coinbase Developer Platform AgentKit.
                    Your primary role is to help venues with:
                    - Deploying new campaign by sending the appropriate transaction to the VicciFactory contract.
                    - collecting campaign name, reward token address, venue address, initial reward pool, deadline
                    
                    If you ever need funds, you can request them from the faucet if you are on network ID 'base-sepolia'.
                    Before executing your first action, get the wallet details to see what network you're on.
                    If there is a 5XX error, ask the user to try again later.
                    Be concise and helpful with your responses.
                `,
                actionProviders: [...baseProviders, ...cdpProviders],
            },
        };

        return configs[this.agentType];
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
            const llm = new ChatAnthropic({
                anthropicApiKey: process.env.ANTHROPIC_API_KEY,
                temperature: 0,
                modelName: "claude-3-sonnet-20240229",
            });

            let walletDataStr: string | null = null;

            if (fs.existsSync(WALLET_DATA_FILE)) {
                try {
                    walletDataStr = fs.readFileSync(WALLET_DATA_FILE, "utf8");
                } catch (error) {
                    console.error("Error reading wallet data:", error);
                }
            }

            const config = {
                apiKeyName: process.env.CDP_API_KEY_NAME,
                apiKeyPrivateKey: process.env.CDP_API_KEY_PRIVATE_KEY?.replace(/\\n/g, "\n"),
                cdpWalletData: walletDataStr || undefined,
                networkId: process.env.NETWORK_ID || "base-sepolia",
            };

            const walletProvider = await CdpWalletProvider.configureWithWallet(config);
            const agentConfig = this.getAgentConfig();

            const agentkit = await AgentKit.from({
                walletProvider,
                actionProviders: agentConfig.actionProviders,
            });

            const tools = await getLangChainTools(agentkit);
            this.tools = tools;
            this.chain = llm;
            this.memory = new MemorySaver();
            
            this.config = { configurable: { thread_id: `CDP ${this.agentType} Agent` } };
            console.log('***Tools***:', tools);
            this.agent = createReactAgent({
                llm,
                tools,
                messageModifier: agentConfig.messageModifier,
            });

            const exportedWallet = await walletProvider.exportWallet();
            fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

            // Initialize tools with wallet provider
            this.tools = [
                new DynamicStructuredTool({
                    name: 'CdpWalletActionProvider_deploy_token',
                    description: 'This tool will deploy an ERC20 token smart contract...',
                    schema: z.object({
                        // ... schema definition
                    }),
                    func: async (args) => {
                        // Use wallet provider in tools
                        return await this.walletProvider.deployToken(args)
                    }
                }),
                new DynamicStructuredTool({
                    name: 'CdpWalletActionProvider_trade',
                    description: 'This tool will trade assets...',
                    schema: z.object({
                        // ... schema definition
                    }),
                    func: async (args) => {
                        // Use wallet provider in tools
                        return await this.walletProvider.trade(args)
                    }
                })
                // ... other tools
            ]

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
        console.log(`Starting ${this.agentType} chat session... Type 'exit' to end.`);

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
    public async processUserInput(input: string, callback?: (chunk: any) => void): Promise<string[]> {
        const responses: string[] = [];
        try {
            console.log('Starting to process input:', input);
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => reject(new Error('Processing timeout')), 30000);
            });

            const streamPromise = this.agent.stream(
                { messages: [new HumanMessage(input)] }, 
                this.config
            );

            const stream = await Promise.race([streamPromise, timeoutPromise]);
            console.log('Got stream, starting to process chunks');

            let chunkCount = 0;
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
                    if (callback) {
                        console.log('Sending response through callback:', content);
                        callback({
                            type: 'chat',
                            success: true,
                            message: content
                        });
                    }
                }
            }
            console.log('Finished processing all chunks');
            return responses;
        } catch (error) {
            console.error("Error processing input:", error);
            if (callback) {
                callback({
                    type: 'error',
                    message: 'Failed to process message: ' + (error instanceof Error ? error.message : 'Unknown error')
                });
            }
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
}