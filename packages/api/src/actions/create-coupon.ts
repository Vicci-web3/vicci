import { z } from "zod";
import { ActionProvider, Network, CreateAction } from "@coinbase/agentkit";
import { ViemWalletProvider } from "@coinbase/agentkit";
import VicciFactoryABI from '../abi/VicciRewardERC20Factory.json';

console.log('Loading create-coupon.ts');

// Define the schema for coupon creation
console.log('Defining CreateCouponSchema');
export const CreateCouponSchema = z.object({
  campainId: z.string().describe("The id of the campaign to create a coupon for"),
  user: z.string().describe("Address of the visitor claiming the reward"),
  amount: z.string().describe("Amount of tokens to reward"),
  deadline: z.string().optional().describe("Optional deadline for the claim (defaults to 1 hour from now)")
});

class VicciCouponProvider extends ActionProvider<ViemWalletProvider> {
  protected walletProvider: ViemWalletProvider;

  constructor(walletProvider: ViemWalletProvider) {
    console.log('Constructing VicciCouponProvider');
    super("vicci-coupon-provider", []);
    this.walletProvider = walletProvider;
  }

  @CreateAction({
    name: "create-coupon",
    description: `
    Creates a signed permit for a visitor to claim rewards from a VicciRewardERC20 contract.
    
    Required parameters:
    - rewardContract: Address of the reward contract
    - user: Address of the visitor claiming the reward
    - amount: Amount of tokens to reward
    - deadline: (Optional) Timestamp when the permit expires

    Returns a signed permit that can be used with the claimReward function.
    `,
    schema: CreateCouponSchema,
  })
  async createCoupon(args: z.infer<typeof CreateCouponSchema>): Promise<string> {
    try {
      const client = (this.walletProvider as any)['#walletClient'];
      
      // Get the nonce for the user from the reward contract
      const nonce = await this.walletProvider.readContract({
        address: args.rewardContract as `0x${string}`,
        abi: VicciFactoryABI.abi,
        functionName: 'nonces',
        args: [args.user as `0x${string}`]
      });

      // Default deadline to 1 hour from now if not specified
      const deadline = args.deadline ? 
        BigInt(args.deadline) : 
        BigInt(Math.floor(Date.now() / 1000) + 3600);

      // Sign the permit using EIP-712
      const signature = await client.signTypedData({
        domain: {
          name: "VicciReward",
          version: "4",
          chainId: await client.getChainId(),
          verifyingContract: args.rewardContract
        },
        types: {
          RewardClaim: [
            { name: "user", type: "address" },
            { name: "amount", type: "uint256" },
            { name: "deadline", type: "uint256" },
            { name: "nonce", type: "uint256" }
          ]
        },
        primaryType: "RewardClaim",
        message: {
          user: args.user,
          amount: BigInt(args.amount),
          deadline,
          nonce
        }
      });

      return signature;

    } catch (error) {
      console.error('Coupon creation failed:', error);
      throw new Error(`Failed to create coupon: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  supportsNetwork = (network: Network): boolean => true;

  getActions(walletProvider: ViemWalletProvider) {
    return [{
      name: "create-coupon", 
      description: "Creates a signed permit for claiming rewards",
      schema: CreateCouponSchema,
      invoke: async (args) => this.createCoupon(args)
    }];
  }
}

// Export a singleton instance
export const vicciCouponProvider = (walletProvider: ViemWalletProvider) => {
  const provider = new VicciCouponProvider(walletProvider);
  return provider;
} 