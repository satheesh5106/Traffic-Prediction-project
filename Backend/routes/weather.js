const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const puppeteer = require('puppeteer');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
const winston = require('winston');
const NodeCache = require('node-cache');
const { authenticateToken } = require('../middleware/auth');
const router = express.Router();

const prisma = new PrismaClient();
// Cache removed to ensure real-time weather data

// Logger configuration
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/weather.log' }),
    new winston.transports.Console()
  ]
});

// TomTom API configuration
const TOMTOM_API_KEY = process.env.TOMTOM_API_KEY;
const TOMTOM_WEATHER_URL = 'https://api.tomtom.com/weather/1/current.json';

// IMD website URLs
const IMD_BASE_URL = 'https://mausam.imd.gov.in';
const IMD_ALERTS_URL = 'https://mausam.imd.gov.in/responsive/nationalWeatherService.php';
const IMD_CURRENT_URL = 'https://mausam.imd.gov.in/responsive/currentWeather.php';

// Cache removed to ensure real-time weather data

// IMD scraping URLs - updated to working endpoints
const imdUrls = [
  'https://mausam.imd.gov.in/responsive/subDivisionWiseWarningGIS.php', // Subdivision-wise warnings
  'https://mausam.imd.gov.in/responsive/nationalWeatherService.php', // All India forecast bulletin
  'https://mausam.imd.gov.in' // IMD main page
];

// Function to get real-time IMD data from india_weather_rest API
async function getRealTimeIMDData() {
  try {
    logger.info('Fetching real-time IMD data from india_weather_rest API');
    
    // First try the local india_weather_rest API
    try {
      const response = await axios.get('http://localhost:5003/alerts', {
        timeout: 10000,
        headers: {
          'User-Agent': 'TrafficAI/1.0'
        }
      });
      
      if (response.data && response.data.alerts) {
        logger.info(`Successfully fetched ${response.data.alerts.length} real-time alerts from india_weather_rest API`);
        
        // Transform the data to match our expected format
        const transformedAlerts = response.data.alerts.map((alert, index) => ({
          text: `${alert.type} - ${alert.region}: ${alert.description}`,
          severity: alert.severity,
          region: alert.region,
          type: alert.type.toLowerCase().replace(/\s+/g, '_'),
          validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          source: 'india_weather_rest_api',
          timestamp: alert.timestamp,
          id: alert.id
        }));
        
        return transformedAlerts;
      }
    } catch (apiError) {
      logger.warn(`india_weather_rest API not available: ${apiError.message}`);
    }
    
    // Fallback to Weather API if provided
    const WEATHER_API_KEY = 'sk-live-vmPZRdi4VNLzpK4DOj3zvLrB5dYrz9tMXuVgf2pW';
    if (WEATHER_API_KEY) {
      try {
        logger.info('Falling back to Weather API for real-time data');
        
        // Major Indian cities for weather alerts
        const cities = ['Mumbai', 'Delhi', 'Bangalore', 'Chennai', 'Kolkata', 'Hyderabad', 'Pune', 'Ahmedabad'];
        const alerts = [];
        
        for (const city of cities.slice(0, 3)) { // Limit to 3 cities to avoid rate limits
          try {
            const weatherResponse = await axios.get(`https://api.weatherapi.com/v1/alerts.json`, {
              params: {
                key: WEATHER_API_KEY,
                q: city,
                aqi: 'no'
              },
              timeout: 5000
            });
            
            if (weatherResponse.data && weatherResponse.data.alerts && weatherResponse.data.alerts.alert) {
              const cityAlerts = weatherResponse.data.alerts.alert.map((alert, index) => ({
                text: `${alert.event} - ${city}: ${alert.desc}`,
                severity: alert.severity || 'Medium',
                region: city,
                type: alert.event.toLowerCase().replace(/\s+/g, '_'),
                validUntil: alert.expires || new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
                source: 'weather_api',
                timestamp: new Date().toISOString(),
                id: `weather_api_${city}_${index}`
              }));
              
              alerts.push(...cityAlerts);
            }
          } catch (cityError) {
            logger.warn(`Error fetching weather data for ${city}: ${cityError.message}`);
          }
        }
        
        if (alerts.length > 0) {
          logger.info(`Successfully fetched ${alerts.length} alerts from Weather API`);
          return alerts;
        }
      } catch (weatherApiError) {
        logger.warn(`Weather API fallback failed: ${weatherApiError.message}`);
      }
    }
    
    // If both APIs fail, return empty array (no mock data)
    logger.warn('All real-time data sources failed, returning empty alerts');
    return [];
    
  } catch (error) {
    logger.error(`Error fetching real-time IMD data: ${error.message}`);
    return [];
  }
}

// Helper function to get cache key
const getCacheKey = (lat, lon) => `weather_${lat}_${lon}`;

// Helper function to validate coordinates
const validateCoordinates = (lat, lon) => {
  const latitude = parseFloat(lat);
  const longitude = parseFloat(lon);
  return !isNaN(latitude) && !isNaN(longitude) && 
         latitude >= -90 && latitude <= 90 && 
         longitude >= -180 && longitude <= 180;
};

// Authentication middleware imported from ../middleware/auth.js

// Route: Get current location using IP geolocation
router.get('/location/current', authenticateToken, async (req, res) => {
  try {
    logger.info('Fetching current location via IP geolocation');
    
    // Try to get location from IP
    const ipResponse = await axios.get('http://ipapi.co/json/', {
      timeout: 5000,
      headers: {
        'User-Agent': 'TrafficAI/1.0'
      }
    });
    
    const { latitude, longitude, city, country } = ipResponse.data;
    
    if (!latitude || !longitude) {
      return res.status(503).json({
        success: false,
        error: 'Unable to determine location - no coordinates available'
      });
    }
    
    res.json({
      success: true,
      location: {
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        city: city || 'Unknown',
        country: country || 'Unknown',
        source: 'ip_geolocation'
      }
    });
    
  } catch (error) {
    logger.error('Error fetching current location:', error.message);
    
    res.status(503).json({
      success: false,
      error: 'Location service unavailable'
    });
  }
});

// Exponential backoff retry function
const retryWithExponentialBackoff = async (fn, maxRetries = 3) => {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, attempt) * 1000; // 2^n * 1000ms
      logger.info(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
};

// Route: Get current weather from TomTom API
router.get('/current', authenticateToken, async (req, res) => {
  try {
    const { lat, lon, lng } = req.query;
    const longitude = lon || lng; // Accept both lon and lng parameters
    
    if (!validateCoordinates(lat, longitude)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided. Required: lat and lon/lng parameters'
      });
    }
    
    // Real-time weather data - no caching
    
    logger.info(`Fetching current weather for coordinates: ${lat}, ${longitude}`);
    
    if (!TOMTOM_API_KEY) {
      return res.status(500).json({
        success: false,
        error: 'TomTom API key not configured'
      });
    }
    
    // Use exponential backoff retry for TomTom API call
    const response = await retryWithExponentialBackoff(async () => {
      return await axios.get(TOMTOM_WEATHER_URL, {
        params: {
          key: TOMTOM_API_KEY,
          lat: lat,
          lon: longitude,
          language: 'en-US',
          unit: 'metric'
        },
        timeout: 10000,
        headers: {
          'User-Agent': 'TrafficAI/1.0',
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip, deflate'
        }
      });
    });
    
    const weatherData = response.data;
    
    if (!weatherData || !weatherData.results || weatherData.results.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'Weather data not found for the specified location'
      });
    }
    
    const result = weatherData.results[0];
    
    const formattedData = {
      success: true,
      weather: {
        temperature: result.temperature?.value || 0,
        temperatureUnit: result.temperature?.unit || 'C',
        realFeelTemperature: result.realFeelTemperature?.value || 0,
        humidity: result.relativeHumidity || 0,
        windSpeed: result.wind?.speed?.value || 0,
        windDirection: result.wind?.direction?.degrees || 0,
        visibility: result.visibility?.value || 0,
        uvIndex: result.uvIndex || 0,
        condition: result.weatherText || 'Unknown',
        isDayTime: result.isDayTime || true,
        precipitationSummary: result.precipitationSummary || {},
        cloudCover: result.cloudCover || 0,
        dewPoint: result.dewPoint?.value || 0,
        location: {
          latitude: parseFloat(lat),
          longitude: parseFloat(longitude)
        },
        timestamp: new Date().toISOString(),
        source: 'tomtom',
        apiVersion: '1.0'
      }
    };
    
    // Real-time data - no caching
    

    try {
      await prisma.weatherData.create({
        data: {
          latitude: parseFloat(lat),
          longitude: parseFloat(longitude),
          temperature: result.temperature?.value || 0,
          humidity: result.relativeHumidity || 0,
          windSpeed: result.wind?.speed?.value || 0,
          condition: result.weatherText || 'Unknown',
          source: 'tomtom',
          timestamp: new Date()
        }
      });
    } catch (dbError) {
      logger.error('Error storing weather data in database:', dbError.message);
    }
    
    res.json(formattedData);
    
  } catch (error) {
    logger.error('Error fetching current weather:', error.message);
    
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        error: `TomTom API error: ${error.response.data?.error?.description || error.message}`
      });
    }
    
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather data'
    });
  }
});

// Route: Scrape IMD weather alerts and data
router.get('/imd', authenticateToken, async (req, res) => {
  try {
    logger.info('IMD weather data requested');
    
    // Real-time IMD data - no caching

    // Get real-time IMD data from APIs
    logger.info('Fetching real-time IMD weather alerts');
    const realTimeAlerts = await getRealTimeIMDData();
    
    logger.info(`Real-time data fetch completed - Found ${realTimeAlerts.length} alerts`);
    
    const alerts = [];
    const currentConditions = [];
    const forecast = [];

    // Helper function to extract location information
    const extractLocationInfo = (text) => {
      const statePattern = /(Andhra Pradesh|Arunachal Pradesh|Assam|Bihar|Chhattisgarh|Goa|Gujarat|Haryana|Himachal Pradesh|Jharkhand|Karnataka|Kerala|Madhya Pradesh|Maharashtra|Manipur|Meghalaya|Mizoram|Nagaland|Odisha|Punjab|Rajasthan|Sikkim|Tamil Nadu|Telangana|Tripura|Uttar Pradesh|Uttarakhand|West Bengal|Delhi|Jammu and Kashmir|Ladakh|Puducherry|Chandigarh|Dadra and Nagar Haveli|Daman and Diu|Lakshadweep|Andaman and Nicobar Islands)/gi;
      const districtPattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:district|District)/gi;
      
      const states = text.match(statePattern) || [];
      const districts = text.match(districtPattern) || [];
      
      return {
        states: [...new Set(states.map(s => s.trim()))],
        districts: [...new Set(districts.map(d => d.replace(/\s+(?:district|District)/gi, '').trim()))],
        areas: [...new Set([...states, ...districts.map(d => d.replace(/\s+(?:district|District)/gi, '').trim())])]
      };
    };

    // Process real-time alerts
    realTimeAlerts.forEach((alert, index) => {
      const alertText = alert.text;
      const locationInfo = extractLocationInfo(alertText);
      
      // Extract severity from text
      let severity = 'medium';
      if (alertText.toLowerCase().includes('red') || alertText.toLowerCase().includes('extreme')) {
        severity = 'high';
      } else if (alertText.toLowerCase().includes('orange') || alertText.toLowerCase().includes('severe')) {
        severity = 'high';
      } else if (alertText.toLowerCase().includes('yellow') || alertText.toLowerCase().includes('moderate')) {
        severity = 'medium';
      }
      
      // Extract warning type
      let warningType = 'weather_alert';
      if (alertText.toLowerCase().includes('thunderstorm')) warningType = 'thunderstorm';
      else if (alertText.toLowerCase().includes('rain')) warningType = 'heavy_rain';
      else if (alertText.toLowerCase().includes('heat')) warningType = 'heat_wave';
      else if (alertText.toLowerCase().includes('cyclone')) warningType = 'cyclone';
      else if (alertText.toLowerCase().includes('fog')) warningType = 'fog';
      
      alerts.push({
        id: `warning_${index + 1}`,
        text: alertText,
        type: warningType,
        severity: severity,
        areas: locationInfo.areas,
        states: locationInfo.states,
        districts: locationInfo.districts,
        location: locationInfo.areas.length > 0 ? locationInfo.areas.join(', ') : 'India',
        link: 'https://mausam.imd.gov.in/responsive/subDivisionWiseWarningGIS.php',
        timestamp: alert.timestamp,
        source: alert.source,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
      });
    });

    // Note: Current conditions and additional processing can be added here if needed
    // For now, we rely on the Puppeteer-scraped alerts as the primary data source

    // Log if no alerts found for debugging
    if (alerts.length === 0) {
      logger.info('No IMD alerts found during scraping - this may indicate scraping issues or no active warnings');
    }

    // Remove duplicate alerts based on similar text content
    const uniqueAlerts = [];
    const seenTexts = new Set();
    
    for (const alert of alerts) {
      const normalizedText = alert.text.toLowerCase().replace(/\s+/g, ' ').trim();
      const textKey = normalizedText.substring(0, 100); // First 100 chars for comparison
      
      if (!seenTexts.has(textKey)) {
        seenTexts.add(textKey);
        uniqueAlerts.push(alert);
      }
    }

    const imdData = {
      success: true,
      alerts: uniqueAlerts, // Show all unique alerts without limit
      current_conditions: [],
      forecast: [],
      last_updated: new Date().toISOString(),
      source: 'IMD',
      website_url: IMD_BASE_URL,
      data_sources: {
        india_weather_rest_api: true,
        weather_api_fallback: true,
        real_time_data: true
      },
      coverage: {
        total_alerts: uniqueAlerts.length,
        states_covered: [...new Set(uniqueAlerts.flatMap(a => a.states))].length,
        districts_covered: [...new Set(uniqueAlerts.flatMap(a => a.districts))].length
      }
    };

    // Real-time data - no caching
    
    logger.info('IMD weather data fetched successfully from real-time sources', { 
      alerts: uniqueAlerts.length, 
      real_time_enabled: true,
      sources: Object.keys(imdData.data_sources).filter(k => imdData.data_sources[k]).length
    });
    
    res.json(imdData);
    
  } catch (error) {
    logger.error('Error scraping IMD weather data:', error);
    
    // Return empty data structure when scraping fails
    const errorData = {
      success: false,
      alerts: [],
      current_conditions: [],
      forecast: [],
      last_updated: new Date().toISOString(),
      source: 'IMD',
      website_url: IMD_BASE_URL,
      error: error.message,
      status: 'scraping_failed'
    };
    
    res.status(500).json(errorData);
  }
});


router.get('/history', authenticateToken, async (req, res) => {
  try {
    const { lat, lon, days = 7 } = req.query;
    
    if (!validateCoordinates(lat, lon)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid coordinates provided'
      });
    }
    
    const daysLimit = Math.min(parseInt(days) || 7, 30); // Max 30 days
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);
    
    logger.info(`Fetching weather history for ${lat}, ${lon} for last ${daysLimit} days`);
    
    const weatherHistory = await prisma.weatherData.findMany({
      where: {
        latitude: {
          gte: parseFloat(lat) - 0.01,
          lte: parseFloat(lat) + 0.01
        },
        longitude: {
          gte: parseFloat(lon) - 0.01,
          lte: parseFloat(lon) + 0.01
        },
        timestamp: {
          gte: startDate
        }
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: 100
    });
    
    res.json({
      success: true,
      history: weatherHistory,
      location: {
        latitude: parseFloat(lat),
        longitude: parseFloat(lon)
      },
      period: {
        days: daysLimit,
        from: startDate.toISOString(),
        to: new Date().toISOString()
      },
      count: weatherHistory.length
    });
    
  } catch (error) {
    logger.error('Error fetching weather history:', error.message);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch weather history'
    });
  }
});

// Cache endpoints removed - using real-time data only

module.exports = router;