'use client'
import { Header } from "@/components/header"

export default function ProfilePage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container py-8">
        <h1 className="text-3xl font-bold mb-6">Your Profile</h1>
        {/* Add profile management components here */}
      </main>
    </div>
  )
}

