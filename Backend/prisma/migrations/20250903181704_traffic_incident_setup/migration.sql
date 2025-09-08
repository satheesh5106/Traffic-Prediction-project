-- CreateTable
CREATE TABLE "incident_predictions" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL,
    "lat" REAL NOT NULL,
    "lon" REAL NOT NULL,
    "conditions" JSONB NOT NULL,
    "basic_info" JSONB NOT NULL,
    "predicted_severity" TEXT NOT NULL,
    "probability" REAL NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "incident_predictions_updated_at_idx" ON "incident_predictions"("updated_at");

-- CreateIndex
CREATE INDEX "incident_predictions_lat_lon_idx" ON "incident_predictions"("lat", "lon");

-- CreateIndex
CREATE INDEX "incident_predictions_predicted_severity_idx" ON "incident_predictions"("predicted_severity");
