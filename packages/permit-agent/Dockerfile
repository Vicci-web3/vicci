FROM node:23-alpine

WORKDIR /usr/src/app

# Install git and other dependencies
RUN apk add --no-cache git

# Install specific pnpm version globally
RUN npm install -g pnpm@9.15.5

# Copy root package.json and workspace files
COPY package*.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY packages/shared/package*.json ./packages/shared/
COPY packages/permit-agent/package*.json ./packages/permit-agent/

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy source code
COPY packages/shared ./packages/shared
COPY packages/permit-agent ./packages/permit-agent

# Generate Prisma client
RUN cd packages/permit-agent && pnpm prisma generate

# We'll run the command from docker-compose 