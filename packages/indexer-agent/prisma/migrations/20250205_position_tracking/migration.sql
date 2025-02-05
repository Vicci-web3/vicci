-- CreateExtension
CREATE EXTENSION IF NOT EXISTS vector;

-- CreateTable
CREATE TABLE "Position" (
  "id" TEXT NOT NULL,
  "owner" TEXT NOT NULL,
  "liquidity" TEXT NOT NULL,
  "source" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Position_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IndexerState" (
  "id" TEXT NOT NULL,
  "chainId" INTEGER NOT NULL,
  "lastIndexedPositions" TEXT[],
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "IndexerState_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Position_owner_idx" ON "Position"("owner");
CREATE INDEX "Position_source_idx" ON "Position"("source");
CREATE UNIQUE INDEX "IndexerState_chainId_key" ON "IndexerState"("chainId");

-- CreateTable for embeddings matching LangChain schema
CREATE TABLE "position_embeddings" (
  "uuid" uuid DEFAULT gen_random_uuid(),
  "text" TEXT NOT NULL,
  "embedding" vector(1024),
  "metadata" JSONB,

  CONSTRAINT "position_embeddings_pkey" PRIMARY KEY ("uuid")
);

-- Create vector index
CREATE INDEX "position_embeddings_vector_idx" ON "position_embeddings" 
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);