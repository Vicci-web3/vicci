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

  constructor(url: string) {
    this.url = url
  }

  async connect(): Promise<void> {
    try {
      console.log('Connecting to RabbitMQ:', this.url)
      this.connection = await amqp.connect(this.url)
      console.log('Connected to RabbitMQ')
      this.channel = await this.connection.createChannel()
      await this.channel.assertExchange(this.exchange, 'topic', { durable: false })
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error)
      throw error
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close()
      }
      if (this.connection) {
        await this.connection.close()
      }
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error)
      throw error
    }
  }

  async publish<T>(topic: string, payload: T): Promise<void> {
    if (!this.channel) {
      throw new Error('Channel not initialized')
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
      throw error
    }
  }

  async subscribe<T>(topic: string, callback: (payload: T) => void): Promise<void> {
    console.log('Subscribing to topic:', topic)
    if (!this.channel) {
      throw new Error('Channel not initialized')
    }

    try {
      const { queue } = await this.channel.assertQueue('', { exclusive: true })
      await this.channel.bindQueue(queue, this.exchange, topic)

      await this.channel.consume(queue, (msg: ConsumeMessage | null) => {
        if (msg) {
          const message = JSON.parse(msg.content.toString())
          callback(message.payload)
          this.channel?.ack(msg)
        }
      })
    } catch (error) {
      console.error('Error subscribing to topic:', error)
      throw error
    }
  }
} 