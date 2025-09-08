-- CreateTable
CREATE TABLE "traffic_incidents" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "eta" TEXT,
    "predicted_volume" REAL,
    "coordinates" JSONB,
    "incident_type" TEXT,
    "confidence" TEXT,
    "city" TEXT,
    "bbox" TEXT,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "traffic_incidents_updated_at_idx" ON "traffic_incidents"("updated_at");

-- CreateIndex
CREATE INDEX "traffic_incidents_city_idx" ON "traffic_incidents"("city");

-- CreateIndex
CREATE INDEX "traffic_incidents_severity_idx" ON "traffic_incidents"("severity");
