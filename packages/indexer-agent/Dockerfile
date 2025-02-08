FROM node:23-alpine

WORKDIR /usr/src/app

# Install git and other dependencies
RUN apk add --no-cache git

# Install specific pnpm version globally
RUN npm install -g pnpm@9.15.5

# Copy root package.json and workspace files
COPY package*.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/indexer-agent/package*.json ./packages/indexer-agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/indexer-agent ./packages/indexer-agent 