import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as admin from 'firebase-admin';

@Injectable()
export class PushService {
  private readonly logger = new Logger(PushService.name);
  private firebaseInitialized = false;

  constructor(private configService: ConfigService) {
    try {
      const firebaseProjectId = this.configService.get<string>('FIREBASE_PROJECT_ID');
      const firebasePrivateKey = this.configService.get<string>('FIREBASE_PRIVATE_KEY');
      const firebaseClientEmail = this.configService.get<string>('FIREBASE_CLIENT_EMAIL');

      if (firebaseProjectId && firebasePrivateKey && firebaseClientEmail) {
        admin.initializeApp({
          credential: admin.credential.cert({
            projectId: firebaseProjectId,
            privateKey: firebasePrivateKey.replace(/\\n/g, '\n'), // Handle escaped newlines
            clientEmail: firebaseClientEmail,
          }),
        });
        this.firebaseInitialized = true;
        this.logger.log('Firebase Admin initialized successfully.');
      } else {
        this.logger.warn('Firebase credentials not configured. Push notifications will be disabled.');
      }
    } catch (error) {
      this.logger.error(`Failed to initialize Firebase Admin: ${error.message}`, error.stack);
      this.firebaseInitialized = false;
    }
  }

  async sendPushNotification(
    deviceTokens: string | string[],
    title: string,
    body: string,
    data?: { [key: string]: string },
  ): Promise<void> {
    if (!this.firebaseInitialized) {
      this.logger.warn('Push notification not sent: Firebase service is disabled.');
      return;
    }

    const tokens = Array.isArray(deviceTokens) ? deviceTokens : [deviceTokens];

    if (tokens.length === 0) {
      this.logger.warn('No device tokens provided for push notification.');
      return;
    }

    const message: admin.messaging.MulticastMessage = {
      notification: {
        title,
        body,
      },
      data: data,
      tokens: tokens,
    };

    try {
      const response = await admin.messaging().sendEachForMulticast(message);
      this.logger.log(`Successfully sent push notifications: ${response.successCount} successful, ${response.failureCount} failed.`);
      
      if (response.failureCount > 0) {
        response.responses.forEach((resp, idx) => {
          if (!resp.success) {
            this.logger.error(`Failed to send to token ${tokens[idx]}: ${resp.exception?.message}`);
          }
        });
      }
    } catch (error) {
      this.logger.error(`Error sending push notification: ${error.message}`, error.stack);
      throw new InternalServerErrorException('Failed to send push notification.');
    }
  }

  async notifyRideRequest(deviceToken: string, rideId: string, pickupLocation: string) {
    await this.sendPushNotification(
      deviceToken,
      'New Ride Request!',
      `A new ride request (ID: ${rideId}) from ${pickupLocation} is available.`,
      { rideId, type: 'ride_request' }
    );
  }

  async notifyRideAssigned(deviceToken: string, rideId: string, driverName: string) {
    await this.sendPushNotification(
      deviceToken,
      'Ride Assigned!',
      `Your ride (ID: ${rideId}) has been assigned to ${driverName}.`,
      { rideId, type: 'ride_assigned' }
    );
  }

  async notifyRideCompleted(deviceToken: string, rideId: string, price: number, currency: string = 'ETB') {
    await this.sendPushNotification(
      deviceToken,
      'Ride Completed!',
      `Your ride (ID: ${rideId}) is completed. Total fare: ${price} ${currency}.`,
      { rideId, price: price.toString(), currency, type: 'ride_completed' }
    );
  }
}
