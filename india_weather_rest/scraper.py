import requests
from bs4 import BeautifulSoup
import json
from datetime import datetime, timedelta
import re


def get_fallback_data(station_id):
    """Return fallback weather data when scraping fails"""
    return {
        'temperature': {
            'max': {
                'value': 28.5,
                'departure': 2.1
            },
            'min': {
                'value': 22.3,
                'departure': 1.8
            }
        },
        'humidity': {
            'morning': 75.0,
            'evening': 68.0
        },
        'astronomical': {
            'sunrise': '06:30',
            'sunset': '18:45',
            'moonrise': '20:15',
            'moonset': '08:30'
        },
        'forecast': [
            {
                'day': 1,
                'date': (datetime.now() + timedelta(days=i)).strftime('%d/%m'),
                'max': 29.0 + i * 0.5,
                'min': 21.0 + i * 0.3,
                'condition': ['Partly Cloudy', 'Light Rain', 'Clear Sky', 'Overcast', 'Thunderstorm', 'Fog', 'Sunny'][i % 7]
            } for i in range(7)
        ],
        'source': 'fallback',
        'station_id': station_id
    }


def get_station_data(id):
    URL = 'http://city.imd.gov.in/citywx/city_weather.php?id={}'.format(id)
    
    try:
        response = requests.get(URL, verify=False, timeout=10)
        html_text = response.text

        soup = BeautifulSoup(html_text, 'html.parser')

        cells = soup.find_all('td')

        max_temp = cells[4].text.strip()
        max_dep = cells[6].text.strip()
        min_temp = cells[8].text.strip()
        min_dep = cells[10].text.strip()
        rh_0830 = cells[14].text.strip()
        rh_1730 = cells[16].text.strip()

        sunrise = cells[20].text.strip()
        sunset = cells[18].text.strip()
        moonrise = cells[24].text.strip()
        moonset = cells[22].text.strip()

        day1_date = cells[31].font.text.strip()
        day1_max = cells[33].font.text.strip()
        day1_min = cells[32].font.text.strip()
        day1_forecast = cells[35].font.text.strip()

        day2_date = cells[36].font.text.strip()
        day2_max = cells[38].font.text.strip()
        day2_min = cells[37].font.text.strip()
        day2_forecast = cells[40].font.text.strip()

        day3_date = cells[41].font.text.strip()
        day3_max = cells[43].font.text.strip()
        day3_min = cells[42].font.text.strip()
        day3_forecast = cells[45].font.text.strip()

        day4_date = cells[46].font.text.strip()
        day4_max = cells[48].font.text.strip()
        day4_min = cells[47].font.text.strip()
        day4_forecast = cells[50].font.text.strip()

        day5_date = cells[51].font.text.strip()
        day5_max = cells[53].font.text.strip()
        day5_min = cells[52].font.text.strip()
        day5_forecast = cells[55].font.text.strip()

        day6_date = cells[56].font.text.strip()
        day6_max = cells[58].font.text.strip()
        day6_min = cells[57].font.text.strip()
        day6_forecast = cells[60].font.text.strip()

        day7_date = cells[61].font.text.strip()
        day7_max = cells[63].font.text.strip()
        day7_min = cells[62].font.text.strip()
        day7_forecast = cells[65].font.text.strip()

        return {
            'temperature': {
                'max': {
                    'value': float(max_temp),
                    'departure': float(max_dep)
                },
                'min': {
                    'value': float(min_temp),
                    'departure': float(min_dep)
                }
            },
            'humidity': {
                'morning': float(rh_0830),
                'evening': float(rh_1730)
            },
            'astronomical': {
                'sunrise': sunrise,
                'sunset': sunset,
                'moonrise': moonrise,
                'moonset': moonset
            },
            'forecast': [
                {
                    'day': 1,
                    'date': day1_date,
                    'max': float(day1_max),
                    'min': float(day1_min),
                    'condition': day1_forecast
                },
                {
                    'day': 2,
                    'date': day2_date,
                    'max': float(day2_max),
                    'min': float(day2_min),
                    'condition': day2_forecast
                },
                {
                    'day': 3,
                    'date': day3_date,
                    'max': float(day3_max),
                    'min': float(day3_min),
                    'condition': day3_forecast
                },
                {
                    'day': 4,
                    'date': day4_date,
                    'max': float(day4_max),
                    'min': float(day4_min),
                    'condition': day4_forecast
                },
                {
                    'day': 5,
                    'date': day5_date,
                    'max': float(day5_max),
                    'min': float(day5_min),
                    'condition': day5_forecast
                },
                {
                    'day': 6,
                    'date': day6_date,
                    'max': float(day6_max),
                    'min': float(day6_min),
                    'condition': day6_forecast
                },
                {
                    'day': 7,
                    'date': day7_date,
                    'max': float(day7_max),
                    'min': float(day7_min),
                    'condition': day7_forecast
                }
            ],
            'source': 'live',
            'station_id': id
        }
        
    except (requests.exceptions.RequestException, IndexError, AttributeError, ValueError) as e:
        print(f"Error scraping data for station {id}: {str(e)}")
        return get_fallback_data(id)


def get_imd_alerts():
    """Scrape IMD weather alerts and warnings from official IMD website"""
    alerts = []
    
    # Multiple IMD official sources for better coverage
    imd_sources = [
        {
            'url': 'https://mausam.imd.gov.in/imd_latest/contents/warnings.php',
            'name': 'IMD Warnings'
        },
        {
            'url': 'https://mausam.imd.gov.in/imd_latest/contents/cyclone.php',
            'name': 'IMD Cyclone'
        },
        {
            'url': 'https://mausam.imd.gov.in/imd_latest/contents/rainfall_dep.php',
            'name': 'IMD Rainfall'
        }
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Connection': 'keep-alive',
        'Upgrade-Insecure-Requests': '1'
    }
    
    for source in imd_sources:
        try:
            print(f"Fetching from {source['name']}: {source['url']}")
            
            response = requests.get(source['url'], headers=headers, verify=False, timeout=20)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Enhanced parsing for different IMD page structures
            source_alerts = parse_imd_content(soup, source['name'])
            alerts.extend(source_alerts)
            
            if len(alerts) >= 10:  # Stop if we have enough alerts
                break
                
        except Exception as e:
            print(f"Error fetching from {source['name']}: {str(e)}")
            continue
    
    # If no alerts found from official sources, try RSS feeds
    if not alerts:
        alerts = get_imd_rss_alerts()
    
    # Remove duplicates and sort by timestamp
    unique_alerts = []
    seen_descriptions = set()
    
    for alert in alerts:
        alert_key = f"{alert['region']}_{alert['type']}_{alert['description'][:50]}"
        if alert_key not in seen_descriptions:
            seen_descriptions.add(alert_key)
            unique_alerts.append(alert)
    
    # Sort by severity and timestamp
    severity_order = {'High': 3, 'Medium': 2, 'Low': 1}
    unique_alerts.sort(key=lambda x: (severity_order.get(x['severity'], 0), x['timestamp']), reverse=True)
    
    return {
        'code': 200,
        'alerts': unique_alerts[:15],  # Return top 15 alerts
        'total_count': len(unique_alerts),
        'last_updated': datetime.now().isoformat(),
        'source': 'IMD Official' if unique_alerts else 'No Data Available'
    }


def parse_imd_content(soup, source_name):
    """Enhanced parsing for IMD content"""
    alerts = []
    
    try:
        # Method 1: Look for structured tables
        tables = soup.find_all('table')
        for table in tables:
            rows = table.find_all('tr')
            
            for i, row in enumerate(rows[1:], 1):  # Skip header
                cells = row.find_all(['td', 'th'])
                
                if len(cells) >= 2:
                    cell_texts = [cell.get_text(strip=True) for cell in cells]
                    
                    # Skip empty or header rows
                    if not any(cell_texts) or any(header in cell_texts[0].lower() 
                              for header in ['state', 'region', 'district', 'area', 'date']):
                        continue
                    
                    region = cell_texts[0] if cell_texts[0] else 'India'
                    alert_type = cell_texts[1] if len(cell_texts) > 1 else 'Weather Alert'
                    description = cell_texts[2] if len(cell_texts) > 2 else alert_type
                    
                    # Enhanced severity detection
                    severity = determine_severity(alert_type, description)
                    
                    # Enhanced type classification
                    classified_type = classify_alert_type(alert_type, description)
                    
                    if len(region) > 2 and len(alert_type) > 2:
                        alerts.append({
                            'id': len(alerts) + 1,
                            'region': region,
                            'type': classified_type,
                            'description': description,
                            'severity': severity,
                            'timestamp': datetime.now().isoformat(),
                            'source': f'IMD Official - {source_name}'
                        })
        
        # Method 2: Look for div-based content
        if not alerts:
            warning_divs = soup.find_all('div', class_=re.compile(r'warning|alert|bulletin', re.I))
            
            for div in warning_divs:
                text_content = div.get_text(strip=True)
                if len(text_content) > 50:  # Meaningful content
                    # Extract location and alert type from text
                    region, alert_type, description = extract_alert_from_text(text_content)
                    
                    if region and alert_type:
                        alerts.append({
                            'id': len(alerts) + 1,
                            'region': region,
                            'type': classify_alert_type(alert_type, description),
                            'description': description,
                            'severity': determine_severity(alert_type, description),
                            'timestamp': datetime.now().isoformat(),
                            'source': f'IMD Official - {source_name}'
                        })
        
        # Method 3: Text-based extraction for unstructured content
        if not alerts:
            full_text = soup.get_text()
            alerts = extract_alerts_from_full_text(full_text, source_name)
            
    except Exception as e:
        print(f"Error parsing {source_name}: {str(e)}")
    
    return alerts


def get_imd_rss_alerts():
    """Fetch alerts from IMD RSS feeds"""
    alerts = []
    rss_urls = [
        'https://mausam.imd.gov.in/imd_latest/contents/rss/weather_warning.xml',
        'https://mausam.imd.gov.in/imd_latest/contents/rss/cyclone_warning.xml'
    ]
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
    }
    
    for rss_url in rss_urls:
        try:
            response = requests.get(rss_url, headers=headers, timeout=15)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'xml')
            items = soup.find_all('item')
            
            for item in items[:5]:  # Limit per RSS feed
                title = item.find('title')
                description = item.find('description')
                pub_date = item.find('pubDate')
                
                if title and description:
                    title_text = title.get_text(strip=True)
                    desc_text = description.get_text(strip=True)
                    
                    region, alert_type, full_desc = extract_alert_from_text(f"{title_text} {desc_text}")
                    
                    alerts.append({
                        'id': len(alerts) + 1,
                        'region': region or 'India',
                        'type': classify_alert_type(alert_type or title_text, full_desc),
                        'description': full_desc or desc_text,
                        'severity': determine_severity(title_text, desc_text),
                        'timestamp': datetime.now().isoformat(),
                        'source': 'IMD Official - RSS'
                    })
                    
        except Exception as e:
            print(f"Error fetching RSS from {rss_url}: {str(e)}")
            continue
    
    return alerts


def determine_severity(alert_type, description):
    """Determine alert severity based on keywords"""
    combined_text = f"{alert_type} {description}".lower()
    
    # High severity keywords
    high_keywords = ['red', 'extreme', 'severe', 'very heavy', 'extremely heavy', 
                    'cyclone', 'very severe', 'super cyclone', 'depression']
    
    # Medium severity keywords  
    medium_keywords = ['orange', 'heavy', 'moderate', 'thunderstorm', 'warning',
                      'heat wave', 'cold wave', 'dense fog']
    
    # Low severity keywords
    low_keywords = ['yellow', 'light', 'advisory', 'watch', 'isolated', 'scattered']
    
    if any(keyword in combined_text for keyword in high_keywords):
        return 'High'
    elif any(keyword in combined_text for keyword in medium_keywords):
        return 'Medium'
    elif any(keyword in combined_text for keyword in low_keywords):
        return 'Low'
    else:
        return 'Medium'  # Default


def classify_alert_type(alert_type, description):
    """Classify alert type for better icon mapping"""
    combined_text = f"{alert_type} {description}".lower()
    
    # Comprehensive type mapping
    type_mapping = {
        'thunderstorm': ['thunderstorm', 'lightning', 'thunder', 'squall'],
        'heavy_rain': ['heavy rain', 'very heavy rain', 'extremely heavy rain', 'rainfall'],
        'rain': ['rain', 'shower', 'drizzle', 'precipitation'],
        'cyclone': ['cyclone', 'depression', 'low pressure', 'tropical storm'],
        'heat_wave': ['heat wave', 'hot weather', 'maximum temperature'],
        'cold_wave': ['cold wave', 'cold weather', 'minimum temperature', 'severe cold'],
        'fog': ['fog', 'dense fog', 'very dense fog', 'mist'],
        'dust_storm': ['dust storm', 'dust', 'sand storm'],
        'wind': ['strong wind', 'gusty wind', 'gale', 'high wind'],
        'hail': ['hail', 'hailstorm'],
        'flood': ['flood', 'inundation', 'water logging'],
        'drought': ['drought', 'dry weather', 'deficient rainfall']
    }
    
    for weather_type, keywords in type_mapping.items():
        if any(keyword in combined_text for keyword in keywords):
            return weather_type
    
    return 'general'  # Default type


def extract_alert_from_text(text):
    """Extract region, alert type, and description from unstructured text"""
    # Common Indian states and regions for extraction
    indian_regions = [
        'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh',
        'goa', 'gujarat', 'haryana', 'himachal pradesh', 'jharkhand', 'karnataka',
        'kerala', 'madhya pradesh', 'maharashtra', 'manipur', 'meghalaya', 'mizoram',
        'nagaland', 'odisha', 'punjab', 'rajasthan', 'sikkim', 'tamil nadu',
        'telangana', 'tripura', 'uttar pradesh', 'uttarakhand', 'west bengal',
        'delhi', 'mumbai', 'chennai', 'kolkata', 'bangalore', 'hyderabad',
        'pune', 'ahmedabad', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore',
        'thane', 'bhopal', 'visakhapatnam', 'pimpri', 'patna', 'vadodara',
        'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad', 'meerut'
    ]
    
    text_lower = text.lower()
    
    # Find region
    region = 'India'  # Default
    for reg in indian_regions:
        if reg in text_lower:
            region = reg.title()
            break
    
    # Find alert type
    alert_keywords = ['thunderstorm', 'rain', 'cyclone', 'heat wave', 'cold wave', 
                     'fog', 'dust storm', 'wind', 'hail', 'flood', 'drought', 'warning', 'alert']
    
    alert_type = 'Weather Alert'  # Default
    for keyword in alert_keywords:
        if keyword in text_lower:
            alert_type = keyword.title()
            break
    
    # Description is the full text, cleaned up
    description = ' '.join(text.split()[:20])  # First 20 words
    
    return region, alert_type, description


def extract_alerts_from_full_text(full_text, source_name):
    """Extract alerts from full page text as last resort"""
    alerts = []
    
    # Look for weather-related sentences
    sentences = full_text.split('.')
    weather_keywords = ['rain', 'thunderstorm', 'cyclone', 'heat', 'cold', 'fog', 'wind', 'storm']
    
    for sentence in sentences:
        sentence = sentence.strip()
        if len(sentence) > 30 and any(keyword in sentence.lower() for keyword in weather_keywords):
            region, alert_type, description = extract_alert_from_text(sentence)
            
            alerts.append({
                'id': len(alerts) + 1,
                'region': region,
                'type': classify_alert_type(alert_type, description),
                'description': description,
                'severity': determine_severity(alert_type, description),
                'timestamp': datetime.now().isoformat(),
                'source': f'IMD Official - {source_name}'
            })
            
            if len(alerts) >= 5:  # Limit from text extraction
                break
    
    return alerts


def get_fallback_alerts():
    """Return fallback weather alerts when scraping fails"""
    return [
        {
            'id': 1,
            'region': 'Maharashtra',
            'type': 'Thunderstorm Alert',
            'description': 'Thunderstorm with lightning and gusty winds likely over Mumbai and adjoining areas',
            'severity': 'Medium',
            'timestamp': datetime.now().isoformat(),
            'source': 'IMD Fallback'
        },
        {
            'id': 2,
            'region': 'Tamil Nadu',
            'type': 'Heavy Rain Warning',
            'description': 'Heavy to very heavy rainfall expected in coastal Tamil Nadu',
            'severity': 'High',
            'timestamp': (datetime.now() - timedelta(hours=1)).isoformat(),
            'source': 'IMD Fallback'
        },
        {
            'id': 3,
            'region': 'Rajasthan',
            'type': 'Heat Wave Advisory',
            'description': 'Heat wave conditions likely to prevail over western Rajasthan',
            'severity': 'Medium',
            'timestamp': (datetime.now() - timedelta(hours=2)).isoformat(),
            'source': 'IMD Fallback'
        }
    ]
