import { logger } from '../utils/logger';

// Interface for input factors
export interface IncidentFactors {
  age: number;
  weather: number;
  light: number;
  roadConditions: number;
  speed: number;
  vehicleType: number;
  vehicleAge: number;
  engineCapacity: number;
  gender: number;
  dayOfWeek: number;
  policeAttendance: number;
}

// Interface for prediction result
export interface PredictionResult {
  severity: number;
  confidence: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

class IncidentPredictionService {
  private riskWeights = {
    age: 0.15,
    weather: 0.12,
    light: 0.10,
    roadConditions: 0.08,
    speed: 0.20,
    vehicleType: 0.10,
    vehicleAge: 0.05,
    engineCapacity: 0.08,
    gender: 0.07,
    dayOfWeek: 0.05
  };

  /**
   * Predict incident severity based on input factors
   */
  predictIncident(factors: IncidentFactors): PredictionResult {
    try {
      logger.info('Starting incident prediction', { factors });
      
      // Calculate risk score based on weighted factors
      const riskScore = this.calculateRiskScore(factors);
      
      // Determine severity (1-3: Slight, Serious, Fatal)
      const severity = this.determineSeverity(riskScore, factors);
      
      // Calculate confidence based on data quality and consistency
      const confidence = this.calculateConfidence(factors, riskScore);
      
      // Determine risk level
      const riskLevel = this.determineRiskLevel(severity, confidence);
      
      const result: PredictionResult = {
        severity,
        confidence,
        riskLevel
      };
      
      logger.info('Incident prediction completed', { result });
      return result;
      
    } catch (error) {
      logger.error('Error in incident prediction', { error, factors });
      // Return default low-risk prediction on error
      return {
        severity: 1,
        confidence: 0.5,
        riskLevel: 'LOW'
      };
    }
  }

  /**
   * Calculate weighted risk score
   */
  private calculateRiskScore(factors: IncidentFactors): number {
    let score = 0;
    
    // Age factor (higher risk for young and elderly drivers)
    const ageRisk = this.getAgeRisk(factors.age);
    score += ageRisk * this.riskWeights.age;
    
    // Weather conditions (1=fine, 7=fog/mist)
    const weatherRisk = (factors.weather - 1) / 6; // Normalize to 0-1
    score += weatherRisk * this.riskWeights.weather;
    
    // Light conditions (1=daylight, 7=darkness)
    const lightRisk = (factors.light - 1) / 6;
    score += lightRisk * this.riskWeights.light;
    
    // Road conditions (1=dry, 7=flood)
    const roadRisk = (factors.roadConditions - 1) / 6;
    score += roadRisk * this.riskWeights.roadConditions;
    
    // Speed factor (higher speed = higher risk)
    const speedRisk = Math.min(factors.speed / 100, 1); // Normalize, cap at 100
    score += speedRisk * this.riskWeights.speed;
    
    // Vehicle type risk
    const vehicleRisk = this.getVehicleTypeRisk(factors.vehicleType);
    score += vehicleRisk * this.riskWeights.vehicleType;
    
    // Vehicle age (older vehicles = higher risk)
    const vehicleAgeRisk = Math.min(factors.vehicleAge / 20, 1);
    score += vehicleAgeRisk * this.riskWeights.vehicleAge;
    
    // Engine capacity (higher CC = potentially higher risk)
    const engineRisk = Math.min(factors.engineCapacity / 3000, 1);
    score += engineRisk * this.riskWeights.engineCapacity;
    
    // Gender factor (statistical difference)
    const genderRisk = factors.gender === 1 ? 0.6 : 0.4; // Male=1, Female=2
    score += genderRisk * this.riskWeights.gender;
    
    // Day of week (weekends typically higher risk)
    const dayRisk = this.getDayOfWeekRisk(factors.dayOfWeek);
    score += dayRisk * this.riskWeights.dayOfWeek;
    
    return Math.min(score, 1); // Cap at 1.0
  }

  /**
   * Get age-based risk factor
   */
  private getAgeRisk(age: number): number {
    if (age < 25) return 0.8; // Young drivers
    if (age < 35) return 0.4;
    if (age < 50) return 0.2;
    if (age < 65) return 0.3;
    return 0.7; // Elderly drivers
  }

  /**
   * Get vehicle type risk factor
   */
  private getVehicleTypeRisk(vehicleType: number): number {
    const riskMap: { [key: number]: number } = {
      1: 0.9,  // Pedal cycle
      2: 0.8,  // Motorcycle 50cc
      3: 0.7,  // Motorcycle 125cc
      4: 0.6,  // Motorcycle 500cc
      5: 0.8,  // Motorcycle >500cc
      8: 0.3,  // Taxi
      9: 0.4,  // Car
      10: 0.5, // Minibus
      11: 0.6, // Bus
      18: 0.2, // Tram
      20: 0.7, // Truck
      23: 0.6  // Electric motorcycle
    };
    return riskMap[vehicleType] || 0.5;
  }

  /**
   * Get day of week risk factor
   */
  private getDayOfWeekRisk(dayOfWeek: number): number {
    // 1=Sunday, 2=Monday, ..., 7=Saturday
    const weekendRisk = [1, 7].includes(dayOfWeek) ? 0.7 : 0.4;
    const fridayRisk = dayOfWeek === 6 ? 0.6 : weekendRisk;
    return fridayRisk;
  }

  /**
   * Determine severity level based on risk score
   */
  private determineSeverity(riskScore: number, factors: IncidentFactors): number {
    // Adjust severity based on specific high-risk factors
    let adjustedScore = riskScore;
    
    // High-speed incidents are more likely to be severe
    if (factors.speed > 60) {
      adjustedScore += 0.2;
    }
    
    // Poor weather/visibility increases severity
    if (factors.weather >= 5 || factors.light >= 5) {
      adjustedScore += 0.15;
    }
    
    // Motorcycles have higher severity potential
    if ([2, 3, 4, 5, 23].includes(factors.vehicleType)) {
      adjustedScore += 0.1;
    }
    
    // Determine severity level
    if (adjustedScore < 0.3) return 1; // Slight
    if (adjustedScore < 0.7) return 2; // Serious
    return 3; // Fatal
  }

  /**
   * Calculate prediction confidence
   */
  private calculateConfidence(factors: IncidentFactors, riskScore: number): number {
    let confidence = 0.8; // Base confidence
    
    // Reduce confidence for edge cases
    if (factors.age < 16 || factors.age > 90) confidence -= 0.1;
    if (factors.speed > 150) confidence -= 0.1;
    if (factors.engineCapacity > 5000) confidence -= 0.05;
    
    // Increase confidence for common scenarios
    if (factors.vehicleType === 9) confidence += 0.05; // Cars are well-studied
    if (factors.weather === 1 && factors.light === 1) confidence += 0.05; // Clear conditions
    
    // Adjust based on risk score consistency
    if (riskScore > 0.8 || riskScore < 0.2) {
      confidence += 0.1; // High confidence in extreme cases
    }
    
    return Math.min(Math.max(confidence, 0.3), 0.95); // Clamp between 0.3 and 0.95
  }

  /**
   * Determine risk level category
   */
  private determineRiskLevel(severity: number, confidence: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (severity === 3 && confidence > 0.7) return 'CRITICAL';
    if (severity === 3 || (severity === 2 && confidence > 0.8)) return 'HIGH';
    if (severity === 2 || (severity === 1 && confidence < 0.6)) return 'MEDIUM';
    return 'LOW';
  }
}

// Export singleton instance
export const incidentPredictionService = new IncidentPredictionService();