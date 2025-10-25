import { Injectable } from '@nestjs/common';
import { SocketGateway } from '../socket/socket.gateway';

@Injectable()
export class NotificationsService {
  constructor(private socketGateway: SocketGateway) {}

  // Send ride request notification to nearby drivers
  async notifyRideRequest(rideId: string, pickupLat: number, pickupLng: number) {
    this.socketGateway.server.emit('ride:request', {
      rideId,
      pickupLat,
      pickupLng,
      timestamp: new Date().toISOString()
    });
  }

  // Send ride assignment notification
  async notifyRideAssigned(rideId: string, driverId: string, passengerId: string) {
    await this.socketGateway.publishRideAssigned(rideId, driverId, passengerId);
  }

  // Send ride started notification
  async notifyRideStarted(rideId: string, driverId: string, passengerId: string) {
    await this.socketGateway.publishRideStarted(rideId, driverId, passengerId);
  }

  // Send ride completed notification
  async notifyRideCompleted(rideId: string, driverId: string, passengerId: string, price: number) {
    await this.socketGateway.publishRideCompleted(rideId, driverId, passengerId, price);
  }

  // Send ride cancelled notification
  async notifyRideCancelled(rideId: string, driverId: string, passengerId: string, reason: string) {
    await this.socketGateway.publishRideCancelled(rideId, driverId, passengerId, reason);
  }

  // Send driver location update
  async notifyDriverLocation(driverId: string, lat: number, lng: number) {
    this.socketGateway.server.emit('driver:location:update', {
      driverId,
      lat,
      lng,
      timestamp: new Date().toISOString()
    });
  }

  // Send driver status update
  async notifyDriverStatus(driverId: string, status: string) {
    this.socketGateway.server.emit('driver:status:update', {
      driverId,
      status,
      timestamp: new Date().toISOString()
    });
  }

  // Send custom notification to specific user
  async sendNotificationToUser(userId: string, message: string, type: string = 'info') {
    this.socketGateway.server.to(userId).emit('notification', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }

  // Send broadcast notification to all users
  async sendBroadcastNotification(message: string, type: string = 'info') {
    this.socketGateway.server.emit('broadcast:notification', {
      message,
      type,
      timestamp: new Date().toISOString()
    });
  }
}
