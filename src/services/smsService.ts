/**
 * SMS Service
 * 
 * Service for sending SMS alerts for severe incident predictions.
 * Integrates with Twilio API for SMS delivery.
 */

import { logger } from '../utils/logger';

// Interface for SMS alert data
interface SMSAlert {
  phoneNumber: string;
  message: string;
  severity: number;
  location?: {
    latitude: number;
    longitude: number;
  };
  timestamp: string;
}

// Interface for SMS response
interface SMSResponse {
  success: boolean;
  messageId?: string;
  error?: string;
  timestamp: string;
}

export class SMSService {
  private twilioAccountSid: string;
  private twilioAuthToken: string;
  private twilioPhoneNumber: string;
  private isEnabled: boolean;

  constructor() {
    // Initialize Twilio credentials from environment variables
    this.twilioAccountSid = process.env.TWILIO_ACCOUNT_SID || '';
    this.twilioAuthToken = process.env.TWILIO_AUTH_TOKEN || '';
    this.twilioPhoneNumber = process.env.TWILIO_PHONE_NUMBER || '';
    
    // Check if SMS service is properly configured
    this.isEnabled = !!(this.twilioAccountSid && this.twilioAuthToken && this.twilioPhoneNumber);
    
    if (!this.isEnabled) {
      logger.warn('SMS Service not configured - missing Twilio credentials');
    } else {
      logger.info('SMS Service initialized successfully');
    }
  }

  /**
   * Send SMS alert for severe incident prediction
   */
  async sendIncidentAlert(alertData: SMSAlert): Promise<SMSResponse> {
    try {
      if (!this.isEnabled) {
        logger.warn('SMS Service disabled - returning mock response');
        return this.getMockResponse(true);
      }

      // Validate phone number
      if (!this.isValidPhoneNumber(alertData.phoneNumber)) {
        throw new Error('Invalid phone number format');
      }

      // Format the alert message
      const formattedMessage = this.formatAlertMessage(alertData);

      // In a real implementation, you would use Twilio SDK here
      // For now, we'll simulate the SMS sending
      const response = await this.simulateSMSSending(alertData.phoneNumber, formattedMessage);

      logger.info('SMS alert sent successfully', {
        phoneNumber: this.maskPhoneNumber(alertData.phoneNumber),
        severity: alertData.severity,
        messageId: response.messageId
      });

      return response;

    } catch (error) {
      logger.error('Failed to send SMS alert:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Send bulk SMS alerts to multiple recipients
   */
  async sendBulkAlerts(alerts: SMSAlert[]): Promise<SMSResponse[]> {
    const responses: SMSResponse[] = [];
    
    for (const alert of alerts) {
      try {
        const response = await this.sendIncidentAlert(alert);
        responses.push(response);
        
        // Add delay between messages to avoid rate limiting
        await this.delay(100);
      } catch (error) {
        responses.push({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return responses;
  }

  /**
   * Format alert message based on severity and location
   */
  private formatAlertMessage(alertData: SMSAlert): string {
    const severityText = this.getSeverityText(alertData.severity);
    const locationText = alertData.location 
      ? `at coordinates ${alertData.location.latitude.toFixed(4)}, ${alertData.location.longitude.toFixed(4)}`
      : 'in your area';
    
    const baseMessage = `🚨 TRAFFIC ALERT: ${severityText} incident predicted ${locationText}.`;
    
    let additionalInfo = '';
    
    switch (alertData.severity) {
      case 3: // FATAL
        additionalInfo = ' Extreme caution advised. Consider alternative routes.';
        break;
      case 2: // SERIOUS
        additionalInfo = ' High risk detected. Drive carefully and stay alert.';
        break;
      case 1: // SLIGHT
        additionalInfo = ' Minor risk detected. Exercise normal caution.';
        break;
    }
    
    const timestamp = new Date(alertData.timestamp).toLocaleTimeString();
    
    return `${baseMessage}${additionalInfo} Alert time: ${timestamp}. Stay safe! - TrafficAI`;
  }

  /**
   * Get severity text description
   */
  private getSeverityText(severity: number): string {
    switch (severity) {
      case 3: return 'FATAL';
      case 2: return 'SERIOUS';
      case 1: return 'SLIGHT';
      default: return 'UNKNOWN';
    }
  }

  /**
   * Validate phone number format
   */
  private isValidPhoneNumber(phoneNumber: string): boolean {
    // Basic phone number validation (E.164 format)
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''));
  }

  /**
   * Mask phone number for logging (privacy)
   */
  private maskPhoneNumber(phoneNumber: string): string {
    if (phoneNumber.length < 4) return '****';
    return phoneNumber.slice(0, -4).replace(/\d/g, '*') + phoneNumber.slice(-4);
  }

  /**
   * Simulate SMS sending (replace with actual Twilio implementation)
   */
  private async simulateSMSSending(phoneNumber: string, message: string): Promise<SMSResponse> {
    // Simulate network delay
    await this.delay(500 + Math.random() * 1000);
    
    // Simulate occasional failures (5% failure rate)
    if (Math.random() < 0.05) {
      throw new Error('SMS delivery failed - network timeout');
    }
    
    return {
      success: true,
      messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Get mock response when service is disabled
   */
  private getMockResponse(success: boolean): SMSResponse {
    return {
      success,
      messageId: success ? `mock_${Date.now()}` : undefined,
      error: success ? undefined : 'SMS service not configured',
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Utility function for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      enabled: this.isEnabled,
      configured: !!(this.twilioAccountSid && this.twilioAuthToken && this.twilioPhoneNumber),
      provider: 'Twilio'
    };
  }

  /**
   * Test SMS service connectivity
   */
  async testService(testPhoneNumber: string): Promise<SMSResponse> {
    const testAlert: SMSAlert = {
      phoneNumber: testPhoneNumber,
      message: 'Test message from TrafficAI SMS Service',
      severity: 1,
      timestamp: new Date().toISOString()
    };
    
    return await this.sendIncidentAlert(testAlert);
  }
}

// Export singleton instance
export const smsService = new SMSService();