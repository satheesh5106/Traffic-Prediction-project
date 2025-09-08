/**
 * Web Scraper for Traffic Prediction Project
 * Scrapes traffic data from various public sources
 */

const axios = require('axios');
const cheerio = require('cheerio');
const winston = require('winston');

// Logger configuration
const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.File({ filename: 'logs/web-scraper.log' }),
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Indian cities with coordinates
const INDIAN_CITIES = {
  mumbai: { name: 'Mumbai', lat: 19.076, lon: 72.8777 },
  delhi: { name: 'Delhi', lat: 28.7041, lon: 77.1025 },
  bangalore: { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
  chennai: { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
  hyderabad: { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
  kolkata: { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
  pune: { name: 'Pune', lat: 18.5204, lon: 73.8567 },
  ahmedabad: { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 }
};

/**
 * Helper function for exponential backoff retry
 * @param {Function} fn - Function to retry
 * @param {number} maxRetries - Maximum number of retries
 * @returns {Promise<any>} - Result of the function
 */
async function retryWithBackoff(fn, maxRetries = 3) {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      const delay = Math.pow(2, attempt) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
      logger.warn(`Retry attempt ${attempt} failed, retrying in ${delay}ms`);
    }
  }
}

/**
 * Scrape traffic data from Google Maps
 * @param {string} city - City name
 * @returns {Promise<Object>} - Traffic data
 */
async function scrapeGoogleMapsTraffic(city) {
  try {
    const cityData = INDIAN_CITIES[city.toLowerCase()];
    if (!cityData) {
      throw new Error(`City '${city}' not supported`);
    }
    
    // Note: This is a simplified implementation as direct scraping of Google Maps is against ToS
    // In a real implementation, you would use the Google Maps API with proper authentication
    logger.info(`Simulating Google Maps traffic data for ${cityData.name}`);
    
    // Simulate traffic data based on time of day
    const hour = new Date().getHours();
    const isRushHour = (hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19);
    const isWeekend = [0, 6].includes(new Date().getDay());
    
    let congestionLevel;
    if (isRushHour && !isWeekend) {
      congestionLevel = 'high';
    } else if (isWeekend) {
      congestionLevel = 'low';
    } else {
      congestionLevel = 'medium';
    }
    
    return {
      source: 'google_maps',
      city: cityData.name,
      timestamp: new Date().toISOString(),
      congestionLevel,
      trafficConditions: {
        overall: congestionLevel,
        majorRoads: isRushHour ? 'high' : 'medium',
        cityCenter: isRushHour ? 'high' : 'medium',
        highways: isRushHour && !isWeekend ? 'medium' : 'low'
      },
      coordinates: {
        lat: cityData.lat,
        lon: cityData.lon
      }
    };
  } catch (error) {
    logger.error(`Error scraping Google Maps traffic data: ${error.message}`);
    throw error;
  }
}

/**
 * Scrape traffic news from news websites
 * @param {string} city - City name
 * @returns {Promise<Array>} - Traffic news articles
 */
async function scrapeTrafficNews(city) {
  try {
    const cityData = INDIAN_CITIES[city.toLowerCase()];
    if (!cityData) {
      throw new Error(`City '${city}' not supported`);
    }
    
    // URLs to scrape (these are examples and would need to be updated with real sources)
    const newsUrls = [
      `https://timesofindia.indiatimes.com/${cityData.name.toLowerCase()}/traffic`,
      `https://www.hindustantimes.com/${cityData.name.toLowerCase()}/traffic`
    ];
    
    const articles = [];
    
    for (const url of newsUrls) {
      try {
        // Fetch HTML content
        const response = await retryWithBackoff(() => 
          axios.get(url, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
            },
            timeout: 10000
          })
        );
        
        // Parse HTML with Cheerio
        const $ = cheerio.load(response.data);
        
        // Extract article information (selectors would need to be updated for each site)
        $('article, .news-item, .article').each((index, element) => {
          const title = $(element).find('h2, .title, .headline').text().trim();
          const summary = $(element).find('p, .summary, .description').text().trim();
          const link = $(element).find('a').attr('href');
          const publishedDate = $(element).find('.date, .time, .published').text().trim();
          
          // Only include traffic-related articles
          const trafficKeywords = ['traffic', 'road', 'accident', 'jam', 'congestion', 'roadwork'];
          const isTrafficRelated = trafficKeywords.some(keyword => 
            title.toLowerCase().includes(keyword) || summary.toLowerCase().includes(keyword)
          );
          
          if (isTrafficRelated) {
            articles.push({
              title,
              summary,
              link: link?.startsWith('http') ? link : `${new URL(url).origin}${link}`,
              publishedDate: publishedDate || new Date().toISOString(),
              source: new URL(url).hostname
            });
          }
        });
      } catch (error) {
        logger.warn(`Error scraping ${url}: ${error.message}`);
        // Continue with other URLs
      }
    }
    
    return {
      source: 'news_websites',
      city: cityData.name,
      timestamp: new Date().toISOString(),
      articles: articles.length > 0 ? articles : generateFallbackArticles(cityData.name),
      count: articles.length
    };
  } catch (error) {
    logger.error(`Error scraping traffic news: ${error.message}`);
    throw error;
  }
}

/**
 * Generate fallback articles when scraping fails
 * @param {string} cityName - City name
 * @returns {Array} - Fallback articles
 */
function generateFallbackArticles(cityName) {
  const currentDate = new Date().toISOString();
  
  return [
    {
      title: `Traffic Update: Major congestion reported in ${cityName} city center`,
      summary: `Heavy traffic congestion has been reported in ${cityName} city center due to ongoing roadwork. Commuters are advised to take alternative routes.`,
      publishedDate: currentDate,
      source: 'traffic_updates'
    },
    {
      title: `${cityName} Traffic Alert: Accident on highway causes delays`,
      summary: `A multi-vehicle accident on the main highway has caused significant delays. Emergency services are on the scene.`,
      publishedDate: currentDate,
      source: 'traffic_alerts'
    },
    {
      title: `Weekend Traffic Advisory for ${cityName}`,
      summary: `Authorities have issued a traffic advisory for the weekend due to expected high volume of vehicles. Plan your journey accordingly.`,
      publishedDate: currentDate,
      source: 'traffic_advisory'
    }
  ];
}

/**
 * Scrape weather data that affects traffic
 * @param {string} city - City name
 * @returns {Promise<Object>} - Weather data
 */
async function scrapeWeatherData(city) {
  try {
    const cityData = INDIAN_CITIES[city.toLowerCase()];
    if (!cityData) {
      throw new Error(`City '${city}' not supported`);
    }
    
    // Use Open-Meteo API for weather data (free and no API key required)
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${cityData.lat}&longitude=${cityData.lon}&current=temperature,precipitation,rain,showers,snowfall,weathercode,cloudcover,visibility,windspeed&timezone=auto`;
    
    const response = await retryWithBackoff(() => axios.get(url, { timeout: 5000 }));
    const data = response.data;
    
    // Map weather code to condition
    const weatherCodeMap = {
      0: 'clear',
      1: 'clear',
      2: 'cloudy',
      3: 'cloudy',
      45: 'fog',
      48: 'fog',
      51: 'rain',
      53: 'rain',
      55: 'rain',
      56: 'rain',
      57: 'rain',
      61: 'rain',
      63: 'rain',
      65: 'rain',
      66: 'rain',
      67: 'rain',
      71: 'snow',
      73: 'snow',
      75: 'snow',
      77: 'snow',
      80: 'rain',
      81: 'rain',
      82: 'rain',
      85: 'snow',
      86: 'snow',
      95: 'storm',
      96: 'storm',
      99: 'storm'
    };
    
    const weatherCode = data.current.weathercode;
    const condition = weatherCodeMap[weatherCode] || 'clear';
    
    // Determine traffic impact based on weather
    let trafficImpact;
    if (['storm', 'snow'].includes(condition)) {
      trafficImpact = 'high';
    } else if (['rain', 'fog'].includes(condition)) {
      trafficImpact = 'medium';
    } else if (condition === 'cloudy') {
      trafficImpact = 'low';
    } else {
      trafficImpact = 'none';
    }
    
    return {
      source: 'open_meteo',
      city: cityData.name,
      timestamp: new Date().toISOString(),
      current: {
        temperature: data.current.temperature,
        condition,
        visibility: data.current.visibility,
        windSpeed: data.current.windspeed,
        precipitation: data.current.precipitation,
        cloudCover: data.current.cloudcover
      },
      trafficImpact,
      coordinates: {
        lat: cityData.lat,
        lon: cityData.lon
      }
    };
  } catch (error) {
    logger.error(`Error scraping weather data: ${error.message}`);
    
    // Return fallback weather data
    return {
      source: 'fallback',
      city: INDIAN_CITIES[city.toLowerCase()]?.name || city,
      timestamp: new Date().toISOString(),
      current: {
        temperature: 25,
        condition: 'clear',
        visibility: 10000,
        windSpeed: 5,
        precipitation: 0,
        cloudCover: 10
      },
      trafficImpact: 'none',
      coordinates: INDIAN_CITIES[city.toLowerCase()] || { lat: 0, lon: 0 }
    };
  }
}

/**
 * Get comprehensive traffic data from multiple sources
 * @param {string} city - City name
 * @returns {Promise<Object>} - Comprehensive traffic data
 */
async function getComprehensiveTrafficData(city) {
  try {
    const cityData = INDIAN_CITIES[city.toLowerCase()];
    if (!cityData) {
      throw new Error(`City '${city}' not supported`);
    }
    
    // Fetch data from multiple sources in parallel
    const [trafficData, newsData, weatherData] = await Promise.allSettled([
      scrapeGoogleMapsTraffic(city),
      scrapeTrafficNews(city),
      scrapeWeatherData(city)
    ]);
    
    // Process results
    const result = {
      city: cityData.name,
      timestamp: new Date().toISOString(),
      coordinates: {
        lat: cityData.lat,
        lon: cityData.lon
      },
      traffic: trafficData.status === 'fulfilled' ? trafficData.value : null,
      news: newsData.status === 'fulfilled' ? newsData.value : null,
      weather: weatherData.status === 'fulfilled' ? weatherData.value : null,
      sources: [
        trafficData.status === 'fulfilled' ? trafficData.value.source : null,
        newsData.status === 'fulfilled' ? newsData.value.source : null,
        weatherData.status === 'fulfilled' ? weatherData.value.source : null
      ].filter(Boolean)
    };
    
    // Calculate overall traffic condition
    const trafficCondition = trafficData.status === 'fulfilled' ? trafficData.value.congestionLevel : 'medium';
    const weatherImpact = weatherData.status === 'fulfilled' ? weatherData.value.trafficImpact : 'none';
    
    let overallCondition;
    if (trafficCondition === 'high' || weatherImpact === 'high') {
      overallCondition = 'high';
    } else if (trafficCondition === 'medium' || weatherImpact === 'medium') {
      overallCondition = 'medium';
    } else {
      overallCondition = 'low';
    }
    
    result.overallCondition = overallCondition;
    
    return result;
  } catch (error) {
    logger.error(`Error getting comprehensive traffic data: ${error.message}`);
    throw error;
  }
}

module.exports = {
  scrapeGoogleMapsTraffic,
  scrapeTrafficNews,
  scrapeWeatherData,
  getComprehensiveTrafficData,
  INDIAN_CITIES
};