"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.smsService = void 0;
const logger_1 = require("../utils/logger");
class SMSService {
    constructor() {
        this.rateLimitMap = new Map();
        this.maxMessagesPerHour = 10;
        // In a real implementation, you would use services like Twilio, AWS SNS, or OneSignal
        this.apiKey = process.env.SMS_API_KEY || '';
        this.apiUrl = process.env.SMS_API_URL || 'https://api.twilio.com/2010-04-01';
        this.fromNumber = process.env.SMS_FROM_NUMBER || '+1234567890';
        if (!this.apiKey) {
            logger_1.logger.warn('SMS API key not set. SMS notifications will be simulated.');
        }
    }
    /**
     * Send SMS notification for incident alert
     */
    async sendIncidentAlert(notification) {
        try {
            logger_1.logger.info('Sending incident SMS alert', {
                phoneNumber: this.maskPhoneNumber(notification.phoneNumber),
                severity: notification.severity
            });
            // Check rate limiting
            if (!this.checkRateLimit(notification.phoneNumber)) {
                return {
                    success: false,
                    error: 'Rate limit exceeded. Maximum 10 messages per hour.',
                    timestamp: new Date()
                };
            }
            // Format message based on severity
            const formattedMessage = this.formatIncidentMessage(notification);
            // Send SMS (simulated if no API key)
            const response = await this.sendSMS(notification.phoneNumber, formattedMessage);
            // Update rate limiting
            this.updateRateLimit(notification.phoneNumber);
            logger_1.logger.info('SMS alert sent successfully', {
                messageId: response.messageId,
                phoneNumber: this.maskPhoneNumber(notification.phoneNumber)
            });
            return response;
        }
        catch (error) {
            logger_1.logger.error('Error sending SMS alert', {
                error,
                phoneNumber: this.maskPhoneNumber(notification.phoneNumber)
            });
            return {
                success: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date()
            };
        }
    }
    /**
     * Send bulk SMS notifications
     */
    async sendBulkAlerts(notifications) {
        const results = [];
        for (const notification of notifications) {
            const result = await this.sendIncidentAlert(notification);
            results.push(result);
            // Add delay between messages to avoid overwhelming the API
            await this.delay(100);
        }
        return results;
    }
    /**
     * Format incident message based on severity and location
     */
    formatIncidentMessage(notification) {
        const { severity, location, message } = notification;
        let alertPrefix = '';
        switch (severity) {
            case 'CRITICAL':
                alertPrefix = '🚨 CRITICAL ALERT';
                break;
            case 'HIGH':
                alertPrefix = '⚠️ HIGH RISK ALERT';
                break;
            case 'MEDIUM':
                alertPrefix = '⚡ MEDIUM RISK ALERT';
                break;
            case 'LOW':
                alertPrefix = 'ℹ️ LOW RISK ALERT';
                break;
        }
        let locationText = '';
        if (location?.address) {
            locationText = ` at ${location.address}`;
        }
        else if (location?.latitude && location?.longitude) {
            locationText = ` at coordinates ${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}`;
        }
        const timestamp = new Date().toLocaleString();
        return `${alertPrefix}: ${message}${locationText}. Time: ${timestamp}. Stay safe and drive carefully.`;
    }
    /**
     * Send SMS using external API (simulated if no API key)
     */
    async sendSMS(phoneNumber, message) {
        if (!this.apiKey) {
            // Simulate SMS sending
            logger_1.logger.info('Simulating SMS send', {
                to: this.maskPhoneNumber(phoneNumber),
                message: message.substring(0, 50) + '...'
            });
            return {
                success: true,
                messageId: `sim_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                timestamp: new Date()
            };
        }
        // Real SMS implementation would go here
        // Example for Twilio:
        /*
        const response = await axios.post(
          `${this.apiUrl}/Accounts/${this.accountSid}/Messages.json`,
          {
            To: phoneNumber,
            From: this.fromNumber,
            Body: message
          },
          {
            auth: {
              username: this.accountSid,
              password: this.apiKey
            }
          }
        );
        
        return {
          success: true,
          messageId: response.data.sid,
          timestamp: new Date()
        };
        */
        // For now, return simulated response
        return {
            success: true,
            messageId: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            timestamp: new Date()
        };
    }
    /**
     * Check if phone number is within rate limits
     */
    checkRateLimit(phoneNumber) {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const timestamps = this.rateLimitMap.get(phoneNumber) || [];
        const recentMessages = timestamps.filter(timestamp => timestamp > hourAgo);
        return recentMessages.length < this.maxMessagesPerHour;
    }
    /**
     * Update rate limiting for phone number
     */
    updateRateLimit(phoneNumber) {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        const timestamps = this.rateLimitMap.get(phoneNumber) || [];
        const recentMessages = timestamps.filter(timestamp => timestamp > hourAgo);
        recentMessages.push(now);
        this.rateLimitMap.set(phoneNumber, recentMessages);
    }
    /**
     * Mask phone number for logging (privacy)
     */
    maskPhoneNumber(phoneNumber) {
        if (phoneNumber.length < 4)
            return '***';
        return phoneNumber.substring(0, 3) + '***' + phoneNumber.substring(phoneNumber.length - 2);
    }
    /**
     * Utility function to add delay
     */
    delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    /**
     * Validate phone number format
     */
    validatePhoneNumber(phoneNumber) {
        // Basic phone number validation (E.164 format)
        const phoneRegex = /^\+[1-9]\d{1,14}$/;
        return phoneRegex.test(phoneNumber);
    }
    /**
     * Get SMS sending statistics
     */
    getStats() {
        const now = Date.now();
        const hourAgo = now - (60 * 60 * 1000);
        let totalSent = 0;
        let rateLimitedNumbers = 0;
        for (const [phoneNumber, timestamps] of this.rateLimitMap.entries()) {
            const recentMessages = timestamps.filter(timestamp => timestamp > hourAgo);
            totalSent += recentMessages.length;
            if (recentMessages.length >= this.maxMessagesPerHour) {
                rateLimitedNumbers++;
            }
        }
        return { totalSent, rateLimitedNumbers };
    }
}
// Export singleton instance
exports.smsService = new SMSService();
//# sourceMappingURL=smsService.js.map