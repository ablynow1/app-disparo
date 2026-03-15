-- AlterTable
ALTER TABLE "Instance" ADD COLUMN     "agentId" TEXT;

-- CreateIndex
CREATE INDEX "Instance_agentId_idx" ON "Instance"("agentId");

-- AddForeignKey
ALTER TABLE "Instance" ADD CONSTRAINT "Instance_agentId_fkey" FOREIGN KEY ("agentId") REFERENCES "AIAgent"("id") ON DELETE SET NULL ON UPDATE CASCADE;
