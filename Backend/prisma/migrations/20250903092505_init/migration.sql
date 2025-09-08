-- CreateTable
CREATE TABLE "weather" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "location" TEXT NOT NULL,
    "temperature" REAL NOT NULL,
    "humidity" INTEGER NOT NULL,
    "forecast" JSONB NOT NULL,
    "alerts" JSONB NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "traffic_impact" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "weather_id" TEXT NOT NULL,
    "impact_level" TEXT NOT NULL,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "traffic_impact_weather_id_fkey" FOREIGN KEY ("weather_id") REFERENCES "weather" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE INDEX "weather_updated_at_idx" ON "weather"("updated_at");
