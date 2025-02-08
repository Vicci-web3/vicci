/*
  Warnings:

  - A unique constraint covering the columns `[objective]` on the table `Campaign` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Campaign_objective_key" ON "Campaign"("objective");
