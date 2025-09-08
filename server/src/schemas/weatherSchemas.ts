import { z } from 'zod';

// Weather data schema matching WeatherData interface
export const WeatherDataZ = z.object({
  city: z.string(),
  temperature: z.number(),
  description: z.string(),
  humidity: z.number(),
  feelsLike: z.number(),
  minTemp: z.number(),
  maxTemp: z.number(),
  icon: z.string()
});

// IMD Station schema matching IMDStation interface
export const IMDStationZ = z.object({
  station: z.string(),
  jurisdiction: z.string(),
  region: z.string(),
  stationId: z.number()
});

// IMD Weather data schema matching IMDWeatherData interface
export const IMDWeatherDataZ = z.object({
  temperature: z.object({
    max: z.object({
      value: z.number(),
      departure: z.number()
    }),
    min: z.object({
      value: z.number(),
      departure: z.number()
    })
  }),
  humidity: z.object({
    morning: z.number(),
    evening: z.number()
  }),
  sunrise: z.string(),
  sunset: z.string(),
  moonrise: z.string(),
  moonset: z.string(),
  forecast: z.array(z.object({
    day: z.string(),
    date: z.string(),
    minTemp: z.number(),
    maxTemp: z.number(),
    condition: z.string()
  })),
  source: z.string(),
  station_id: z.number()
});

// IMD Alert schema matching IMDAlert interface
export const IMDAlertZ = z.object({
  id: z.number(),
  type: z.string(),
  severity: z.enum(['high', 'medium', 'low']),
  location: z.string(),
  description: z.string(),
  validUntil: z.string(),
  icon: z.any(), // Lucide icon component
  temperature: z.number().optional(),
  humidity: z.number().optional()
});

// Traffic Impact schema (additional schema for traffic analysis)
export const TrafficImpactZ = z.object({
  stationId: z.number(),
  location: z.string(),
  rainImpact: z.object({
    severity: z.enum(['none', 'low', 'medium', 'high']),
    description: z.string(),
    expectedDelay: z.number() // in minutes
  }),
  temperatureImpact: z.object({
    severity: z.enum(['none', 'low', 'medium', 'high']),
    description: z.string(),
    vehiclePerformanceImpact: z.boolean()
  }),
  humidityImpact: z.object({
    severity: z.enum(['none', 'low', 'medium', 'high']),
    description: z.string(),
    visibilityReduction: z.boolean()
  }),
  overallRisk: z.enum(['low', 'medium', 'high', 'extreme']),
  recommendations: z.array(z.string()),
  lastUpdated: z.string()
});

// API Response schemas
export const WeatherStationsResponseZ = z.object({
  success: z.boolean(),
  data: z.array(IMDStationZ),
  total: z.number(),
  timestamp: z.string()
});

export const WeatherDataResponseZ = z.object({
  success: z.boolean(),
  data: IMDWeatherDataZ,
  timestamp: z.string()
});

export const WeatherAlertsResponseZ = z.object({
  success: z.boolean(),
  data: z.array(IMDAlertZ),
  total: z.number(),
  timestamp: z.string()
});

export const TrafficImpactResponseZ = z.object({
  success: z.boolean(),
  data: TrafficImpactZ,
  timestamp: z.string()
});

export const HealthResponseZ = z.object({
  status: z.enum(['ok', 'degraded', 'down']),
  timestamp: z.string(),
  services: z.object({
    imdApi: z.enum(['up', 'down']),
    openWeatherMap: z.enum(['up', 'down']),
    database: z.enum(['up', 'down']).optional(),
    redis: z.enum(['up', 'down']).optional()
  }),
  uptime: z.number(),
  version: z.string()
});

// TypeScript types derived from schemas
export type WeatherData = z.infer<typeof WeatherDataZ>;
export type IMDStation = z.infer<typeof IMDStationZ>;
export type IMDWeatherData = z.infer<typeof IMDWeatherDataZ>;
export type IMDAlert = z.infer<typeof IMDAlertZ>;
export type TrafficImpact = z.infer<typeof TrafficImpactZ>;
export type WeatherStationsResponse = z.infer<typeof WeatherStationsResponseZ>;
export type WeatherDataResponse = z.infer<typeof WeatherDataResponseZ>;
export type WeatherAlertsResponse = z.infer<typeof WeatherAlertsResponseZ>;
export type TrafficImpactResponse = z.infer<typeof TrafficImpactResponseZ>;
export type HealthResponse = z.infer<typeof HealthResponseZ>;

// Request validation schemas
export const StationIdParamZ = z.object({
  id: z.string().transform(val => parseInt(val, 10)).pipe(z.number().positive())
});

export const RefreshRequestZ = z.object({
  force: z.boolean().optional().default(false),
  stationIds: z.array(z.number()).optional()
});