-- CreateTable
CREATE TABLE "routes" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "start_location" TEXT NOT NULL,
    "end_location" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "vehicle_type" TEXT NOT NULL,
    "route_data" JSONB NOT NULL,
    "time_saved" REAL,
    "fuel_saved" REAL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateIndex
CREATE INDEX "routes_updated_at_idx" ON "routes"("updated_at");
