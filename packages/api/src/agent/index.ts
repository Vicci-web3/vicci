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

import { getLangChainTools } from "@coinbase/agentkit-langchain";
import { HumanMessage } from "@langchain/core/messages";
import { MemorySaver } from "@langchain/langgraph";
import { createReactAgent } from "@langchain/langgraph/prebuilt";
import { ChatAnthropic } from "@langchain/anthropic";
import { z } from 'zod';

import * as fs from "fs";
import * as readline from "readline";

const WALLET_DATA_FILE = "wallet_data.txt";

type AgentType = 'counsellor' | 'campaignManager';

interface AgentConfig {
    type: AgentType;
    messageModifier: string;
    actionProviders: any[];
}

export default class CoinbaseAgent {
    private agent: any;
    private config: any;
    private rl: readline.Interface | null = null;
    private agentType: AgentType;
    
    constructor(type: AgentType = 'counsellor') {
        console.log(`Creating new CoinbaseAgent of type: ${type}`)
        this.agentType = type;
        try {
            this.validateEnvironment();
            this.initialize();
        } catch (error) {
            console.error('Failed to create CoinbaseAgent:', error)
            throw error;
        }
    }

    private getAgentConfig(): AgentConfig {
        const baseProviders = [
            wethActionProvider(),
            pythActionProvider(),
            walletActionProvider(),
            erc20ActionProvider(),
        ];

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
                    - Creating and managing token-gating campaigns
                    - Setting up reward distributions
                    - Managing venue credentials
                    - Monitoring campaign metrics
                    - Handling token distributions
                    
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
        console.log('Initializing agent...')
        try {
            let llm = new ChatAnthropic({
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
            console.log(tools)

            const memory = new MemorySaver();
            this.config = { configurable: { thread_id: `CDP ${this.agentType} Agent` } };

            this.agent = await createReactAgent({
                llm,
                tools,
                checkpointSaver: memory,
                messageModifier: agentConfig.messageModifier,
            });

            const exportedWallet = await walletProvider.exportWallet();
            fs.writeFileSync(WALLET_DATA_FILE, JSON.stringify(exportedWallet));

            console.log('Agent initialized successfully')
        } catch (error) {
            console.error('Failed to initialize agent:', error)
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