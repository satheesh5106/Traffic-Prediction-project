-- AlterTable
ALTER TABLE "routes" ADD COLUMN "traffic_impact" TEXT;

-- CreateIndex
CREATE INDEX "routes_start_location_idx" ON "routes"("start_location");
