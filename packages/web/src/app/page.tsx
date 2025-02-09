'use client'
import { Header } from "@/components/header"
import { ArrowRight, Target, Users, Database, Bot } from 'lucide-react'
import Link from 'next/link'
import { MermaidDiagram } from '@/components/mermaid-diagram'


export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-gray-900 to-black">
      <main className="flex-grow container mx-auto px-4 py-16">
        {/* Hero Section */}
        <div className="text-center mb-24 py-20">
          <div className="inline-block py-4">
            <h1 className="text-6xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 px-4">
              Welcome to VICCI
            </h1>
          </div>
          <div className="inline-block py-4">
          <p className="text-2xl text-white/80 mb-12">
            Visitor Information Center Coupon Exchange - Your Gateway to Onchain Experiences
          </p>
          </div>
          <div className="block px-2 py-4">
          <Link 
            href="/register" 
            className="inline-flex items-center px-8 py-4 text-lg font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Get Started <ArrowRight className="ml-2" />
          </Link>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 mb-16">
          {/* Campaign Agent */}
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-blue-500/50 transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-blue-500/20 flex items-center justify-center">
              <Target className="w-6 h-6 text-blue-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Campaign Agent</h3>
            <p className="text-white/70">
              AI-powered campaign design for targeted promotional strategies and reward distribution.
              Deploys RewardContracts that provide EIP-712 messages for Venue bonuses.
              Done with Claude, Langchain, OnchainKit, AgentKit
            </p>
          </div>

          {/* Visitor Agent */}
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-purple-500/50 transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Visitor Agent</h3>
            <p className="text-white/70">
              Personalized information counseling services for discovering web3 opportunities
              Done with Claude, Langchain, OnchainKit, AgentKit
            </p>
          </div>

          {/* Indexer Agent */}
          <div className="p-6 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10 hover:border-pink-500/50 transition-colors">
            <div className="w-12 h-12 mb-4 rounded-lg bg-pink-500/20 flex items-center justify-center">
              <Database className="w-6 h-6 text-pink-400" />
            </div>
            <h3 className="text-xl font-semibold text-white mb-3">Indexer Agent</h3>
            <p className="text-white/70">
              Graph-powered data pipeline for analyzing user interactions and onchain activities. to Empower both the Visitor and Promoter Agents.
              Done with Cohere RAG, OnchainKit, Langchain and TheGraph
            </p>
          </div>
        </div>

        {/* Hackathon Highlight */}
        <div className="p-8 rounded-xl bg-white/5 backdrop-blur-sm border border-white/10">
          <div className="flex items-center mb-6">
            <Bot className="w-8 h-8 text-blue-400 mr-3" />
            <h2 className="text-2xl font-bold text-white">Multiagent System for Connecting Onchain Experiences with Users</h2>
          </div>
          <p className="text-white/70 mb-6">
            VICCI combines multiple AI agents with blockchain technology to create a seamless experience for both venues and visitors. Built for the Agentic Ethereum Hackathon, our platform showcases:
          </p>
          <ul className="space-y-3 text-white/70">
            <li className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-blue-500 mr-3" />
              AI-powered applications on Base
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-purple-500 mr-3" />
              Integration of AgentKit and OnchainKit
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-pink-500 mr-3" />
              The Graph protocol for data indexing
            </li>
            <li className="flex items-center">
              <div className="w-2 h-2 rounded-full bg-green-500 mr-3" />
              Consumer-friendly web3 interface
            </li>
          </ul>
        </div>
      </main>
    </div>
  )
}

