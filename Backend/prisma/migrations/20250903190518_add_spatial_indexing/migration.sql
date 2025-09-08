-- AlterTable
ALTER TABLE "traffic_incidents" ADD COLUMN "lat" REAL;
ALTER TABLE "traffic_incidents" ADD COLUMN "lon" REAL;

-- CreateIndex
CREATE INDEX "traffic_incidents_lat_lon_idx" ON "traffic_incidents"("lat", "lon");
