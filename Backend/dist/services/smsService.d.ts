export interface SMSNotification {
    phoneNumber: string;
    message: string;
    severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    location?: {
        latitude: number;
        longitude: number;
        address?: string;
    };
}
export interface SMSResponse {
    success: boolean;
    messageId?: string;
    error?: string;
    timestamp: Date;
}
declare class SMSService {
    private apiKey;
    private apiUrl;
    private fromNumber;
    private rateLimitMap;
    private maxMessagesPerHour;
    constructor();
    /**
     * Send SMS notification for incident alert
     */
    sendIncidentAlert(notification: SMSNotification): Promise<SMSResponse>;
    /**
     * Send bulk SMS notifications
     */
    sendBulkAlerts(notifications: SMSNotification[]): Promise<SMSResponse[]>;
    /**
     * Format incident message based on severity and location
     */
    private formatIncidentMessage;
    /**
     * Send SMS using external API (simulated if no API key)
     */
    private sendSMS;
    /**
     * Check if phone number is within rate limits
     */
    private checkRateLimit;
    /**
     * Update rate limiting for phone number
     */
    private updateRateLimit;
    /**
     * Mask phone number for logging (privacy)
     */
    private maskPhoneNumber;
    /**
     * Utility function to add delay
     */
    private delay;
    /**
     * Validate phone number format
     */
    validatePhoneNumber(phoneNumber: string): boolean;
    /**
     * Get SMS sending statistics
     */
    getStats(): {
        totalSent: number;
        rateLimitedNumbers: number;
    };
}
export declare const smsService: SMSService;
export {};
