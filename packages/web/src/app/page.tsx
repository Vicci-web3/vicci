'use client'
import { Header } from "@/components/header"

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container py-8">
        <h1 className="text-4xl font-bold mb-6">Welcome to Visitor Information Center</h1>
        <p className="text-xl mb-4">Discover and claim rewards from various protocols</p>
      </main>
    </div>
  )
}

