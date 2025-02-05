'use client'
import { Header } from "@/components/header"
import { RegistrationForm } from "@/components/registration-form"

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-grow container py-8">
        <h1 className="text-3xl font-bold mb-6">Register</h1>
        <RegistrationForm />
      </main>
    </div>
  )
} 