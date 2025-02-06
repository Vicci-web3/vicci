'use client'

import { LoginForm } from '@/components/login-form'
import { Header } from '@/components/header'

export default function LoginPage() {
  return (
    <>
      <Header />
      <main className="container mx-auto px-4 py-8">
        <LoginForm />
      </main>
    </>
  )
} 