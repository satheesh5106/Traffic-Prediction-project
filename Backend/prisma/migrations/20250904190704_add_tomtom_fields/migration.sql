-- AlterTable
ALTER TABLE "traffic_incidents" ADD COLUMN "delay_minutes" INTEGER;
ALTER TABLE "traffic_incidents" ADD COLUMN "end_time" DATETIME;
ALTER TABLE "traffic_incidents" ADD COLUMN "magnitude_of_delay" INTEGER;
ALTER TABLE "traffic_incidents" ADD COLUMN "name" TEXT;
ALTER TABLE "traffic_incidents" ADD COLUMN "severity_level" TEXT;
ALTER TABLE "traffic_incidents" ADD COLUMN "source" TEXT;
ALTER TABLE "traffic_incidents" ADD COLUMN "start_time" DATETIME;
ALTER TABLE "traffic_incidents" ADD COLUMN "type" TEXT;

-- CreateIndex
CREATE INDEX "traffic_incidents_severity_level_idx" ON "traffic_incidents"("severity_level");

-- CreateIndex
CREATE INDEX "traffic_incidents_source_idx" ON "traffic_incidents"("source");
