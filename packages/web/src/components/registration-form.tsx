'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useAccount, useSignMessage } from 'wagmi'
import { createSiweMessage } from 'siwe'
import { z } from 'zod'
import { zodResolver } from '@hookform/resolvers/zod'

const registrationSchema = z.object({
  type: z.enum(['visitor', 'venue']),
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
})

type RegistrationData = z.infer<typeof registrationSchema>

export function RegistrationForm() {
  const { address, isConnected } = useAccount()
  const { signMessage } = useSignMessage()
  const [isRegistering, setIsRegistering] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegistrationData>({
    resolver: zodResolver(registrationSchema),
  })

  const onSubmit = async (data: RegistrationData) => {
    if (!address) return

    try {
      setIsRegistering(true)

      // Create SIWE message
      const message = createSiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to register for Visitor Information Center',
        uri: window.location.origin,
        version: '1',
        chainId: 8453, // Base mainnet
        nonce: 'nonce', // You should generate this server-side
      })

      // Sign the message
      const signature = await signMessage({ message: message.prepareMessage() })

      // Send registration data to your API
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...data,
          address,
          message,
          signature,
        }),
      })

      if (!response.ok) {
        throw new Error('Registration failed')
      }

      // Handle successful registration
      // You might want to redirect or show a success message
    } catch (error) {
      console.error('Registration error:', error)
      // Handle error appropriately
    } finally {
      setIsRegistering(false)
    }
  }

  return (
    <div className="max-w-md mx-auto">
      {!isConnected ? (
        <div className="text-center">
          <p className="mb-4">Connect your wallet to register</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium mb-2">
              Register as
            </label>
            <select
              {...register('type')}
              className="w-full p-2 border rounded-md bg-background text-foreground"
            >
              <option value="visitor" className="bg-black text-white">Visitor</option>
              <option value="venue" className="bg-black text-white">Venue</option>
            </select>
            {errors.type && (
              <p className="text-red-500 text-sm mt-1">{errors.type.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Name
            </label>
            <input
              type="text"
              {...register('name')}
              className="w-full p-2 border rounded-md bg-background text-foreground"
            />
            {errors.name && (
              <p className="text-red-500 text-sm mt-1">{errors.name.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Email
            </label>
            <input
              type="email"
              {...register('email')}
              className="w-full p-2 border rounded-md bg-background text-foreground"
            />
            {errors.email && (
              <p className="text-red-500 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={isRegistering}
            className="w-full bg-primary text-white p-2 rounded-md hover:bg-primary/90 disabled:opacity-50"
          >
            {isRegistering ? 'Registering...' : 'Register'}
          </button>
        </form>
      )}
    </div>
  )
} 