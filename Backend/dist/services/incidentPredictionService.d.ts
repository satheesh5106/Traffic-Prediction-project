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
export interface PredictionResult {
    severity: number;
    confidence: number;
    riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}
declare class IncidentPredictionService {
    private riskWeights;
    /**
     * Predict incident severity based on input factors
     */
    predictIncident(factors: IncidentFactors): PredictionResult;
    /**
     * Calculate weighted risk score
     */
    private calculateRiskScore;
    /**
     * Get age-based risk factor
     */
    private getAgeRisk;
    /**
     * Get vehicle type risk factor
     */
    private getVehicleTypeRisk;
    /**
     * Get day of week risk factor
     */
    private getDayOfWeekRisk;
    /**
     * Determine severity level based on risk score
     */
    private determineSeverity;
    /**
     * Calculate prediction confidence
     */
    private calculateConfidence;
    /**
     * Determine risk level category
     */
    private determineRiskLevel;
}
export declare const incidentPredictionService: IncidentPredictionService;
export {};
