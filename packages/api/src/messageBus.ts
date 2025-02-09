// @ts-nocheck
import amqp, { ConsumeMessage } from 'amqplib'

export const Topics = {
  CHAT_MESSAGE: 'chat.message',
  VISITOR_QUERY: 'visitor.query',
  VISITOR_RESPONSE: 'visitor.response',
  AGENT_STATUS: 'agent.status'
} as const;

export class MessageBus {
  private connection: amqp.Connection | null = null
  private channel: amqp.Channel | null = null
  private readonly url: string
  private readonly exchange = 'vicci'
  private isConnecting: boolean = false
  private connectionPromise: Promise<void> | null = null
  private reconnectTimeout: NodeJS.Timeout | null = null

  constructor(url: string) {
    console.log('Creating MessageBus with URL:', url)
    this.url = url
  }

  private async ensureConnection(): Promise<void> {
    if (this.channel && this.connection) {
      return
    }

    if (this.isConnecting) {
      if (this.connectionPromise) {
        await this.connectionPromise
        return
      }
    }

    await this.connect()
  }

  async connect(): Promise<void> {
    if (this.isConnecting) {
      console.log('Connection already in progress')
      return this.connectionPromise
    }

    try {
      this.isConnecting = true
      this.connectionPromise = this._connect()
      await this.connectionPromise
    } finally {
      this.isConnecting = false
      this.connectionPromise = null
    }
  }

  private async _connect(): Promise<void> {
    try {
      console.log('\n=== Connecting to RabbitMQ ===')
      console.log('URL:', this.url)
      
      this.connection = await amqp.connect(this.url)
      console.log('✓ Connected to RabbitMQ')

      // Handle connection events
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err)
        this.handleDisconnect()
      })

      this.connection.on('close', () => {
        console.error('RabbitMQ connection closed')
        this.handleDisconnect()
      })

      this.channel = await this.connection.createChannel()
      console.log('✓ Created channel')

      await this.channel.assertExchange(this.exchange, 'topic', { durable: false })
      console.log('✓ Asserted exchange:', this.exchange)

      // Initialize channels for all topics
      for (const topic of Object.values(Topics)) {
        const { queue } = await this.channel.assertQueue('', { exclusive: true })
        await this.channel.bindQueue(queue, this.exchange, topic)
        console.log(`✓ Initialized channel for topic: ${topic}`)
      }

      console.log('=== RabbitMQ Setup Complete ===\n')
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error)
      this.handleDisconnect()
      throw error
    }
  }

  private handleDisconnect() {
    this.channel = null
    this.connection = null
    this.isConnecting = false
    this.connectionPromise = null

    // Attempt to reconnect after a delay
    if (!this.reconnectTimeout) {
      this.reconnectTimeout = setTimeout(async () => {
        this.reconnectTimeout = null
        try {
          console.log('Attempting to reconnect...')
          await this.connect()
        } catch (error) {
          console.error('Reconnection failed:', error)
        }
      }, 5000) // Wait 5 seconds before reconnecting
    }
  }

  async close(): Promise<void> {
    try {
      if (this.reconnectTimeout) {
        clearTimeout(this.reconnectTimeout)
        this.reconnectTimeout = null
      }

      if (this.channel) {
        await this.channel.close()
        this.channel = null
      }
      if (this.connection) {
        await this.connection.close()
        this.connection = null
      }
      console.log('✓ Closed RabbitMQ connection')
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error)
      throw error
    }
  }

  async publish<T>(topic: string, payload: T): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error('Channel not initialized - connection failed')
    }

    try {
      const message = {
        topic,
        payload,
        metadata: {
          timestamp: new Date().toISOString(),
        },
      }

      await this.channel.publish(
        this.exchange,
        topic,
        Buffer.from(JSON.stringify(message))
      )
    } catch (error) {
      console.error('Error publishing message:', error)
      this.handleDisconnect()
      throw error
    }
  }

  async subscribe<T>(topic: string, callback: (payload: T) => void): Promise<void> {
    await this.ensureConnection()

    if (!this.channel) {
      throw new Error('Channel not initialized - connection failed')
    }

    try {
      const { queue } = await this.channel.assertQueue('', { exclusive: true })
      await this.channel.bindQueue(queue, this.exchange, topic)

      await this.channel.consume(queue, (msg: ConsumeMessage | null) => {
        if (msg) {
          try {
            const message = JSON.parse(msg.content.toString())
            callback(message.payload)
            this.channel?.ack(msg)
          } catch (error) {
            console.error('Error processing message:', error)
            // Reject the message and don't requeue
            this.channel?.nack(msg, false, false)
          }
        }
      })
    } catch (error) {
      console.error('Error subscribing to topic:', error)
      this.handleDisconnect()
      throw error
    }
  }
} 