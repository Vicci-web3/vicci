import { z } from "zod";
import { ActionProvider, Network, CreateAction } from "@coinbase/agentkit";
import { ViemWalletProvider } from "@coinbase/agentkit";
import VicciRewardERC20ABI from '../abi/VicciRewardERC20.json';
import { PrismaClient } from "@prisma/client";
import { createWalletClient, createPublicClient, http } from 'viem'
import { privateKeyToAccount } from 'viem/accounts'
import { baseSepolia } from 'viem/chains'

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
  private prisma: PrismaClient;
  private walletClient: any;
  private publicClient: any;

  constructor(walletProvider: ViemWalletProvider) {
    console.log('Constructing VicciCouponProvider');
    super("vicci-coupon-provider", []);
    this.walletProvider = walletProvider;
    this.prisma = new PrismaClient();

    // Initialize viem clients
    const privateKey = process.env.AGENT_PRIVATE_KEY
    if (!privateKey) {
      throw new Error('AGENT_PRIVATE_KEY environment variable is required')
    }

    const transport = http(`https://base-sepolia.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`)
    const account = privateKeyToAccount(privateKey as `0x${string}`)

    this.publicClient = createPublicClient({
      chain: baseSepolia,
      transport,
    })

    this.walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport,
    })
  }

  @CreateAction({
    name: "create-coupon",
    description: `Creates a signed permit for a visitor to claim rewards`,
    schema: CreateCouponSchema,
  })
  async createCoupon(args: z.infer<typeof CreateCouponSchema>): Promise<string> {
    try {
      // Use findFirst instead of findUnique
      const campaign = await this.prisma.campaign.findFirst({
        where: {
          objective: args.campainId
        },
        select: {
          id: true,
          rewardContractAddress: true
        }
      });
      
      if (!campaign) {
        throw new Error(`Campaign not found with objective: ${args.campainId}`);
      }

      // Find visitor
      const visitor = await this.prisma.visitor.findUnique({
        where: {
          address: args.user.toLowerCase()
        }
      });

      if (!visitor) {
        throw new Error(`Visitor not found with address: ${args.user}`);
      }

      // Use publicClient for reading contract data
      const nonce = await this.publicClient.readContract({
        address: campaign.rewardContractAddress as `0x${string}`,
        abi: VicciRewardERC20ABI.abi,
        functionName: 'nonces',
        args: [args.user as `0x${string}`]
      });

      // Default deadline to 60 days from now if not specified
      const deadline = args.deadline ? 
        BigInt(args.deadline) : 
        BigInt(Math.floor(Date.now() / 1000) + 3600 * 24 * 60);

      // Use walletClient for signing
      const signature = await this.walletClient.signTypedData({
        domain: {
          name: "VicciReward",
          version: "4",
          chainId: await this.publicClient.getChainId(),
          verifyingContract: campaign.rewardContractAddress as `0x${string}`
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

      // Store the permit
      const permit = await this.prisma.permit.create({
        data: {
          id: `${campaign.id}-${visitor.id}`,
          campaignId: campaign.id,
          visitorId: visitor.id,
          signature: signature,
          claimed: false,
          createdAt: new Date()
        }
      });

      console.log('Stored permit:', permit);

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