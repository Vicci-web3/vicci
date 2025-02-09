# 🎯 Vicci: AI-Powered Protocol Growth Engine

<div align="center">
  <img src="../images/banner.jpg" alt="Project Banner" width="800"/>
</div>

## 🌟 Overview

Vicci is a revolutionary decentralized system for protocol growth that leverages AI agents to analyze on-chain behavior and distribute targeted reward permits to high-value potential users. Our platform enables protocols to acquire users based on demonstrated on-chain behaviors rather than traditional marketing channels.

<div align="center">
  <img src="../images/logo-square.jpg" alt="Logo" width="200"/>
</div>

## 🏗️ Tech Stack

Our system uses a modern, scalable architecture:

- **Frontend**: 
  - Next.js with OnchainKit integration
  - Real-time WebSocket updates
  - Responsive UI/UX

- **Backend**: 
  - Node.js API service
  - WebSocket server for real-time updates
  - Multi-agent architecture

- **Data Layer**:
  - PostgreSQL with pgvector for embeddings
  - RabbitMQ for inter-service communication
  - The Graph for blockchain indexing

- **AI Integration**: 
  - Cohere for embeddings and analysis
  - Anthropic for intelligent targeting
  - Custom agent frameworks

- **Blockchain**: 
  - Alchemy SDK
  - EigenLayer AVS
  - Multi-chain support

## 🚀 Development Setup

1. Enable corepack to manage package managers:
```bash
corepack enable
```

2. Install pnpm:
```bash
corepack use pnpm@latest
```

3. Install dependencies:
```bash
pnpm install
```

4. Set up environment variables:
```bash
cp .env.template .env
cd packages/indexer-agent
cp .env.example .env
# Add your GRAPH_API_KEY to .env
pnpm generate
cd ../..
```

5. Start the development environment:
```bash
docker compose -f docker-compose.dev.yml up
```

## 📦 Project Structure

```
vic/
├── packages/
│   ├── api/           # Main API service
│   ├── web/           # Next.js frontend
│   ├── indexer-agent/ # Blockchain indexing service
│   └── shared/        # Shared utilities and types
├── docker/            # Docker configuration
└── docs/             # Documentation
```

## 🔧 Troubleshooting

### Common Issues

1. **Indexer Agent Module Error**
If you see the error `Cannot find module '/usr/src/app/packages/indexer-agent/src/src/resolvers/positions.ts'`:
```bash
cd packages/indexer-agent
pnpm generate
pnpm build
```

2. **Database Connection Issues**
Ensure PostgreSQL is running and the connection URL is correct in your `.env` file:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
```

3. **Graph API Issues**
Make sure you've added your Graph API key to both root `.env` and `packages/indexer-agent/.env`

## 🌐 Live Demo

Visit [vicci-web3.info](https://vicci-web3.info) to see the platform in action!

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT

## 🙏 Acknowledgments

Built with ❤️ by the Vicci team for the Ethereum protocol ecosystem.

<div align="center">
  <img src="../images/image (8).jpg" alt="Additional Visual" width="400"/>
</div>
