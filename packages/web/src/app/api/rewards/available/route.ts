import { NextResponse } from "next/server"

export async function GET() {
  // TODO: Implement actual reward fetching logic
  const mockRewards = [
    { id: 1, name: "Protocol A Reward", description: "Claim your reward from Protocol A" },
    { id: 2, name: "Protocol B Discount", description: "20% off on Protocol B services" },
  ]

  return NextResponse.json(mockRewards)
}

