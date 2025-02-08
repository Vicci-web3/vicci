import { z } from "zod";
import { ActionProvider, Network, CreateAction } from "@coinbase/agentkit";
import { ViemWalletProvider } from "@coinbase/agentkit";
import { 
  parseEventLogs, 
  createWalletClient, 
  createPublicClient, 
  http, 
  getContract,
  decodeEventLog,
  type Log,
  type Abi 
} from "viem";
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'
import VicciFactoryABI from '../abi/VicciRewardERC20Factory.json';
import MockERC20ABI from '../abi/MockERC20.json';
import { PrismaClient } from '@prisma/client';
console.log('Loading create-campaign.ts');

// Define the schema for campaign creation
console.log('Defining CreateCampaignSchema');
export const CreateCampaignSchema = z.object({
  rewardToken: z.string().describe("The address of the ERC20 token to be used as rewards"),
  campaignId: z.string().describe("Unique identifier for the campaign"),
  agent: z.string().describe("Address of the agent that will sign reward claims"),
  venue: z.string().describe("Address of the venue providing the reward tokens"),
  initialRewardPool: z.string().describe("Amount of tokens to initialize the reward pool with"),
  signature: z.string().describe("The raw permit signature from the venue")
});

class VicciCampaignProvider extends ActionProvider<ViemWalletProvider> {
  private factoryAddress: string;
  private mockTokenAddress: string;
  protected walletProvider: ViemWalletProvider;
  private prisma: PrismaClient;
  private walletClient: any;
  private publicClient: any;
  private account: any;
  private factoryContract: any;

  constructor(walletProvider: ViemWalletProvider) {
    console.log('Constructing VicciCampaignProvider');
    super("vicci-campaign-provider", []);
    this.walletProvider = walletProvider;
    this.factoryAddress = VicciFactoryABI.addresses["84532"];
    this.mockTokenAddress = MockERC20ABI.addresses["84532"];
    this.prisma = new PrismaClient();

    // Initialize viem clients
    const privateKey = process.env.AGENT_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required')
    }

    const transport = http(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
    this.account = privateKeyToAccount(privateKey as `0x${string}`)

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    })

    this.walletClient = createWalletClient({
      account: this.account,
      chain: baseSepolia,
      transport,
    })

    // Initialize factory contract
    this.factoryContract = getContract({
      address: this.factoryAddress as `0x${string}`,
      abi: VicciFactoryABI.abi,
      client: this.walletClient
    })
  }

  @CreateAction({
    name: "create-new-campaign",
    description: `
    This tool handles the workflow to handling creating a new campaign
    It follows two steps:

    1. Request permit signature:
       [PERMIT_REQUEST]
       Please sign the permit message to authorize token transfer.
       [/PERMIT_REQUEST]

       Required parameters:
       [REWARD_AMOUNT]<number>[/REWARD_AMOUNT]
       [VENUE_ADDRESS]<0x address>[/VENUE_ADDRESS]

    2. Create campaign with:
       - rewardToken: "0x44a1e87d54c84ce63d5c09cf8de3200a5e85d7c4"
       - agent: "0x8f5c3EE4007ad86F38288b78A9ED7C54afBcA87f"
       - campaignId: <user-provided>
       - venue: [VENUE_ADDRESS]from step 1[/VENUE_ADDRESS]
       - initialRewardPool: [REWARD_AMOUNT]from step 1[/REWARD_AMOUNT]
       - signature: <from step 1>

    Factory contract: "0xaefc7ae8b3457515564943992fe08b7bd144e239"
    Reward token: "0x44a1e87d54c84ce63d5c09cf8de3200a5e85d7c4"
    Agent address: "0x8f5c3EE4007ad86F38288b78A9ED7C54afBcA87f"
    `,
    schema: CreateCampaignSchema,
  })
  async createCampaign(args: z.infer<typeof CreateCampaignSchema>): Promise<string> {
    try {
      // Convert signature to v,r,s components
      const signatureSans0x = args.signature.substring(2);
      const r = '0x' + signatureSans0x.substring(0, 64);
      const s = '0x' + signatureSans0x.substring(64, 128);
      const v = parseInt(signatureSans0x.substring(128, 130), 16);

      // Convert amount to BigInt directly (assuming it's already in wei)
      const amount = BigInt(args.initialRewardPool);
      const deadline = 2703166645;
      
      console.log('Creating campaign with exact parameters:', {
        rewardToken: args.rewardToken,
        campaignId: args.campaignId,
        agent: args.agent,
        venue: args.venue,
        initialRewardPool: amount.toString(),
        deadline: deadline,
        v, r, s
      });

      // Call contract method directly
      const hash = await this.factoryContract.write.deployRewardContract([
        args.rewardToken as `0x${string}`,
        args.campaignId,
        args.agent as `0x${string}`,
        args.venue as `0x${string}`,
        amount,
        BigInt(deadline),
        v,
        r as `0x${string}`,
        s as `0x${string}`
      ]);
      console.log('Transaction hash:', hash);
      
      // Wait for receipt
      const receipt = await this.publicClient.waitForTransactionReceipt({
        hash: hash
      });
      console.log('Transaction receipt:', receipt);

      // Parse event logs
      const deployEvent = receipt.logs.find((log: Log) => 
        log.address.toLowerCase() === this.factoryAddress.toLowerCase()
      );

      if (!deployEvent) {
        throw new Error("Failed to find deployment event");
      }

      const decodedLog = decodeEventLog({
        abi: VicciFactoryABI.abi as Abi,
        eventName: 'RewardContractDeployed',
        data: deployEvent.data,
        topics: deployEvent.topics,
      });

      // Type assertion after decoding
      const rewardContractAddress = (decodedLog.args as any).rewardContract as `0x${string}`;

      // Look up venue by address to get the venue ID
      const venue = await (this.prisma as any).venue.findUnique({
        where: {
          address: args.venue.toLowerCase()
        }
      });

      if (!venue) {
        throw new Error(`No venue found with address ${args.venue}. Please ensure the venue is registered first.`);
      }

      // Add campaign to database
      await (this.prisma as any).campaign.create({
        data: {
          venueId: venue.id,
          protocol: this.factoryAddress,
          objective: args.campaignId,
          rewardToken: args.rewardToken,
          rewardType: 'ERC20',
          rewardContractAddress: rewardContractAddress,
          amount: BigInt(args.initialRewardPool),
          validUntil: new Date('2050-01-01'),
          createdAt: new Date()
        }
      });
      
      return `Successfully deployed reward contract at ${rewardContractAddress}`;
    } catch (error) {
      console.error('Campaign creation failed:', error);
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  supportsNetwork = (network: Network): boolean => true;

  getActions(walletProvider: ViemWalletProvider) {
    return [{
      name: "create-new-campaign",
      description: "Deploys a new Vicci ERC20 rewards contract",
      schema: CreateCampaignSchema,
      invoke: async (args: z.infer<typeof CreateCampaignSchema>) => this.createCampaign(args)
    }];
  }

  // Helper method to get the mock token address
  getMockTokenAddress(): string {
    return this.mockTokenAddress;
  }
}

// Export a singleton instance since we don't need factory address parameter anymore
export const vicciCampaignProvider = (walletProvider: ViemWalletProvider) => {
  const provider = new VicciCampaignProvider(walletProvider);
  return provider;
} 