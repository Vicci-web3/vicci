import { z } from "zod";
import { ActionProvider, Network, CreateAction } from "@coinbase/agentkit";
import { ViemWalletProvider } from "@coinbase/agentkit";
import { encodeFunctionData } from "viem";
import VicciFactoryABI from '../abi/VicciRewardERC20Factory.json';
import MockERC20ABI from '../abi/MockERC20.json';

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

  constructor(walletProvider: ViemWalletProvider) {
    console.log('Constructing VicciCampaignProvider');
    super("vicci-campaign-provider", []);
    this.walletProvider = walletProvider;
    this.factoryAddress = VicciFactoryABI.addresses["84532"];
    this.mockTokenAddress = MockERC20ABI.addresses["84532"];
  }

  @CreateAction({
    name: "create-new-campaign",
    description: `
    This tool handles the workflow to handling creating a new campaign
    It follows two steps:
    1. requesting an EIP-2612 permit signature from the venue that authorizes you the agent to take the reward token and paste it into the factory created reward contract
    - please make these parameters clear to the user on replay with a format like this:
    - campaignId: 1
    - initialRewardPool: 1000
    - venue: 0x1234567890123456789012345678901234567890
    - agent: 0x8f5c3EE4007ad86F38288b78A9ED7C54afBcA87f
    - deadline: 1717987200

    2. consuming that signature to call the deployRewardContract function on the factory contract
    - the factory contract is:  "0xbb7e1ceeb5c62f11ae93341bfbe5d94d407c4e71"
    - the reward token is:  "0xd1e07d461df1371d7379e77d09a9d73f0d358f3f"
    - the venue is the signer of the permit
    - you are the agent: (with public key: 0x8f5c3EE4007ad86F38288b78A9ED7C54afBcA87f)

    - we will need to ask the venue for the campaignId, initialRewardPool
    - we than can call the createCampaign function that is attached to this tool
    `,
    schema: CreateCampaignSchema,
  })
  async createCampaign(args: z.infer<typeof CreateCampaignSchema>): Promise<string> {
    try {
      const client = (this.walletProvider as any)['#walletClient'];
      
      // Convert signature to v,r,s components
      const signatureSans0x = args.signature.substring(2);
      const r = '0x' + signatureSans0x.substring(0, 64);
      const s = '0x' + signatureSans0x.substring(64, 128);
      const v = parseInt(signatureSans0x.substring(128, 130), 16);

      // Convert amount to BigInt directly (assuming it's already in wei)
      const amount = BigInt(args.initialRewardPool);
      
      console.log('Creating campaign with exact parameters:', {
        rewardToken: args.rewardToken,
        campaignId: args.campaignId,
        agent: args.agent,
        venue: args.venue,
        initialRewardPool: amount.toString(),
        deadline: "2703166645",
        v, r, s
      });

      const data = encodeFunctionData({
        abi: VicciFactoryABI.abi,
        functionName: 'deployRewardContract',
        args: [
          args.rewardToken as `0x${string}`,
          args.campaignId,
          args.agent as `0x${string}`,
          args.venue as `0x${string}`,
          amount, // Use BigInt amount directly instead of parseEther
          BigInt("2703166645"),
          v,
          r as `0x${string}`,
          s as `0x${string}`
        ]
      });

      console.log('Encoded function data:', data);

      const hash = await this.walletProvider.sendTransaction({
        to: this.factoryAddress as `0x${string}`,
        data
      });
      console.log('Transaction hash:', hash);
      const receipt = await this.walletProvider.waitForTransactionReceipt(hash);
      console.log('Transaction receipt:', receipt);
      // Find the RewardContractDeployed event
      const deployEvent = receipt.logs.find(log => 
        log.topics[0] === encodeFunctionData({
          abi: VicciFactoryABI.abi,
          functionName: 'RewardContractDeployed',
          args: []
        })
      );

      if (!deployEvent) {
        throw new Error("Failed to find deployment event");
      }

      const rewardContractAddress = deployEvent.topics[1] as `0x${string}`;
      return `Successfully deployed reward contract at ${rewardContractAddress}`;
    } catch (error) {
      console.error('Campaign creation failed:', error);
      throw new Error(`Failed to create campaign: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  supportsNetwork = (network: Network): boolean => true;

  // Add this method to expose the actions
  getActions(walletProvider: ViemWalletProvider) {
    return [{
      name: "create-new-campaign",
      description: "Deploys a new Vicci ERC20 rewards contract",
      schema: CreateCampaignSchema,
      invoke: async (args) => this.createCampaign(args)
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