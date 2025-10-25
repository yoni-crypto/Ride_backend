import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import twilio from 'twilio';

@Injectable()
export class SmsService {
  private readonly logger = new Logger(SmsService.name);
  private readonly twilioClient: twilio.Twilio;
  private readonly twilioPhoneNumber: string;

  constructor(private configService: ConfigService) {
    const accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
    const authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
    this.twilioPhoneNumber = this.configService.get<string>('TWILIO_PHONE_NUMBER') || '';

    if (!accountSid || !authToken || !this.twilioPhoneNumber) {
      this.logger.warn('Twilio credentials not fully configured. SMS notifications will be disabled.');
      this.twilioClient = null as any; // Disable client if credentials are missing
    } else {
      this.twilioClient = twilio(accountSid, authToken);
      this.logger.log('Twilio SMS Service initialized successfully.');
    }
  }

  async sendSms(to: string, message: string): Promise<void> {
    if (!this.twilioClient) {
      this.logger.warn(`SMS not sent to ${to}: Twilio service is disabled.`);
      return;
    }

    try {
      await this.twilioClient.messages.create({
        body: message,
        from: this.twilioPhoneNumber,
        to: to,
      });
      this.logger.log(`SMS sent to ${to}: "${message}"`);
    } catch (error) {
      this.logger.error(`Failed to send SMS to ${to}: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to send SMS notification.');
    }
  }

  async sendRideRequestSms(to: string, rideId: string, pickupLocation: string) {
    const message = `New ride request (ID: ${rideId}) from ${pickupLocation}. Accept now!`;
    await this.sendSms(to, message);
  }

  async sendRideAssignedSms(to: string, rideId: string, driverName: string) {
    const message = `Your ride (ID: ${rideId}) has been assigned to ${driverName}.`;
    await this.sendSms(to, message);
  }

  async sendRideCompletedSms(to: string, rideId: string, price: number, currency: string = 'ETB') {
    const message = `Your ride (ID: ${rideId}) is completed. Total fare: ${price} ${currency}.`;
    await this.sendSms(to, message);
  }

  async sendVerificationSms(to: string, code: string) {
    const message = `Your verification code is: ${code}. Do not share this code.`;
    await this.sendSms(to, message);
  }
}
