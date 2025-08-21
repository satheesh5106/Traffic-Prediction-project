/**
 * Geospatial Utilities
 * 
 * Provides functions for geospatial calculations used in route optimization.
 */

// Earth radius in meters
const EARTH_RADIUS = 6371000;

/**
 * Geographic coordinate
 */
export interface GeoPoint {
  lat: number;
  lng: number;
}

/**
 * Calculate the Haversine distance between two points on Earth
 * @param point1 First point
 * @param point2 Second point
 * @returns Distance in meters
 */
export function haversineDistance(point1: GeoPoint, point2: GeoPoint): number {
  // Convert latitude and longitude from degrees to radians
  const lat1 = toRadians(point1.lat);
  const lon1 = toRadians(point1.lng);
  const lat2 = toRadians(point2.lat);
  const lon2 = toRadians(point2.lng);
  
  // Haversine formula
  const dLat = lat2 - lat1;
  const dLon = lon2 - lon1;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  
  // Distance in meters
  return EARTH_RADIUS * c;
}

/**
 * Calculate the bearing between two points
 * @param point1 First point
 * @param point2 Second point
 * @returns Bearing in degrees (0-360)
 */
export function calculateBearing(point1: GeoPoint, point2: GeoPoint): number {
  const lat1 = toRadians(point1.lat);
  const lat2 = toRadians(point2.lat);
  const dLon = toRadians(point2.lng - point1.lng);
  
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) -
            Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  
  let bearing = Math.atan2(y, x);
  bearing = toDegrees(bearing);
  
  // Normalize to 0-360
  return (bearing + 360) % 360;
}

/**
 * Calculate the midpoint between two points
 * @param point1 First point
 * @param point2 Second point
 * @returns Midpoint
 */
export function calculateMidpoint(point1: GeoPoint, point2: GeoPoint): GeoPoint {
  const lat1 = toRadians(point1.lat);
  const lon1 = toRadians(point1.lng);
  const lat2 = toRadians(point2.lat);
  const lon2 = toRadians(point2.lng);
  
  const Bx = Math.cos(lat2) * Math.cos(lon2 - lon1);
  const By = Math.cos(lat2) * Math.sin(lon2 - lon1);
  
  const lat3 = Math.atan2(
    Math.sin(lat1) + Math.sin(lat2),
    Math.sqrt((Math.cos(lat1) + Bx) * (Math.cos(lat1) + Bx) + By * By)
  );
  
  const lon3 = lon1 + Math.atan2(By, Math.cos(lat1) + Bx);
  
  return {
    lat: toDegrees(lat3),
    lng: toDegrees(lon3)
  };
}

/**
 * Calculate a point at a given distance and bearing from a starting point
 * @param start Starting point
 * @param distance Distance in meters
 * @param bearing Bearing in degrees
 * @returns Destination point
 */
export function destinationPoint(start: GeoPoint, distance: number, bearing: number): GeoPoint {
  const lat1 = toRadians(start.lat);
  const lon1 = toRadians(start.lng);
  const brng = toRadians(bearing);
  
  const angularDistance = distance / EARTH_RADIUS;
  
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(angularDistance) +
    Math.cos(lat1) * Math.sin(angularDistance) * Math.cos(brng)
  );
  
  const lon2 = lon1 + Math.atan2(
    Math.sin(brng) * Math.sin(angularDistance) * Math.cos(lat1),
    Math.cos(angularDistance) - Math.sin(lat1) * Math.sin(lat2)
  );
  
  return {
    lat: toDegrees(lat2),
    lng: toDegrees(lon2)
  };
}

/**
 * Check if a point is inside a polygon
 * @param point Point to check
 * @param polygon Array of points forming a polygon
 * @returns True if the point is inside the polygon
 */
export function isPointInPolygon(point: GeoPoint, polygon: GeoPoint[]): boolean {
  if (polygon.length < 3) {
    return false;
  }
  
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const intersect = ((polygon[i].lat > point.lat) !== (polygon[j].lat > point.lat)) &&
      (point.lng < (polygon[j].lng - polygon[i].lng) * (point.lat - polygon[i].lat) / 
      (polygon[j].lat - polygon[i].lat) + polygon[i].lng);
    
    if (intersect) {
      inside = !inside;
    }
  }
  
  return inside;
}

/**
 * Calculate the area of a polygon
 * @param polygon Array of points forming a polygon
 * @returns Area in square meters
 */
export function calculatePolygonArea(polygon: GeoPoint[]): number {
  if (polygon.length < 3) {
    return 0;
  }
  
  let area = 0;
  const len = polygon.length;
  
  for (let i = 0; i < len; i++) {
    const j = (i + 1) % len;
    const p1 = polygon[i];
    const p2 = polygon[j];
    
    area += toRadians(p2.lng - p1.lng) * 
      (2 + Math.sin(toRadians(p1.lat)) + Math.sin(toRadians(p2.lat)));
  }
  
  area = area * EARTH_RADIUS * EARTH_RADIUS / 2;
  return Math.abs(area);
}

/**
 * Calculate the bounding box of a set of points
 * @param points Array of points
 * @returns Bounding box as [minLat, minLng, maxLat, maxLng]
 */
export function calculateBoundingBox(points: GeoPoint[]): [number, number, number, number] {
  if (points.length === 0) {
    return [0, 0, 0, 0];
  }
  
  let minLat = points[0].lat;
  let maxLat = points[0].lat;
  let minLng = points[0].lng;
  let maxLng = points[0].lng;
  
  for (let i = 1; i < points.length; i++) {
    const point = points[i];
    
    minLat = Math.min(minLat, point.lat);
    maxLat = Math.max(maxLat, point.lat);
    minLng = Math.min(minLng, point.lng);
    maxLng = Math.max(maxLng, point.lng);
  }
  
  return [minLat, minLng, maxLat, maxLng];
}

/**
 * Check if a point is within a given distance of another point
 * @param point1 First point
 * @param point2 Second point
 * @param distance Distance in meters
 * @returns True if the points are within the specified distance
 */
export function isWithinDistance(point1: GeoPoint, point2: GeoPoint, distance: number): boolean {
  return haversineDistance(point1, point2) <= distance;
}

/**
 * Convert degrees to radians
 * @param degrees Angle in degrees
 * @returns Angle in radians
 */
function toRadians(degrees: number): number {
  return degrees * Math.PI / 180;
}

/**
 * Convert radians to degrees
 * @param radians Angle in radians
 * @returns Angle in degrees
 */
function toDegrees(radians: number): number {
  return radians * 180 / Math.PI;
}

/**
 * Encode a sequence of coordinates into a polyline string
 * @param points Array of points
 * @returns Encoded polyline string
 */
export function encodePolyline(points: GeoPoint[]): string {
  let result = '';
  let prevLat = 0;
  let prevLng = 0;
  
  for (const point of points) {
    const lat = Math.round(point.lat * 1e5);
    const lng = Math.round(point.lng * 1e5);
    
    result += encodeNumber(lat - prevLat);
    result += encodeNumber(lng - prevLng);
    
    prevLat = lat;
    prevLng = lng;
  }
  
  return result;
}

/**
 * Decode a polyline string into a sequence of coordinates
 * @param polyline Encoded polyline string
 * @returns Array of points
 */
export function decodePolyline(polyline: string): GeoPoint[] {
  const points: GeoPoint[] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;
  
  while (index < polyline.length) {
    let result = 1;
    let shift = 0;
    let b: number;
    
    do {
      b = polyline.charCodeAt(index++) - 63;
      result += (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    
    result = 1;
    shift = 0;
    
    do {
      b = polyline.charCodeAt(index++) - 63;
      result += (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    
    points.push({
      lat: lat / 1e5,
      lng: lng / 1e5
    });
  }
  
  return points;
}

/**
 * Encode a number for polyline encoding
 * @param num Number to encode
 * @returns Encoded string
 */
function encodeNumber(num: number): string {
  num = num < 0 ? ~(num << 1) : (num << 1);
  let result = '';
  
  while (num >= 0x20) {
    result += String.fromCharCode((0x20 | (num & 0x1f)) + 63);
    num >>= 5;
  }
  
  result += String.fromCharCode(num + 63);
  return result;
}