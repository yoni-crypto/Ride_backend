import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { DriversService } from '../drivers/drivers.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class RidesService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService, 
    private config: ConfigService,
    private driversService: DriversService,
    private notificationsService: NotificationsService
  ) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async createRide(passengerId: string, dto: any) {
    const ride = await this.prisma.ride.create({
      data: {
        passengerId,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng,
        dropoffLat: dto.dropoffLat ?? null,
        dropoffLng: dto.dropoffLng ?? null,
      },
    });

    // Find nearest drivers and attempt auto-assignment
    const nearestDrivers = await this.driversService.findNearestDrivers(
      dto.pickupLat, 
      dto.pickupLng, 
      5 // 5km radius
    );

    if (nearestDrivers.length > 0) {
      // Auto-assign to nearest driver
      const nearestDriver = nearestDrivers[0];
      await this.assignDriver(ride.id, nearestDriver.id);
    } else {
      // Push to queue for manual assignment and notify drivers
      await this.redis.lpush('ride:requests', JSON.stringify({ 
        rideId: ride.id,
        pickupLat: dto.pickupLat,
        pickupLng: dto.pickupLng 
      }));
      
      // Notify all drivers about the new ride request
      await this.notificationsService.notifyRideRequest(ride.id, dto.pickupLat, dto.pickupLng);
    }

    return ride;
  }

  async assignDriver(rideId: string, driverId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    if (ride.driverId) throw new ConflictException('Ride already assigned');

    const updated = await this.prisma.ride.update({
      where: { id: rideId },
      data: { driverId, status: 'ASSIGNED' },
    });

    // mark driver status
    await this.prisma.driver.update({ where: { id: driverId }, data: { status: 'ON_TRIP' } });

    // Send notifications
    await this.notificationsService.notifyRideAssigned(rideId, driverId, ride.passengerId);

    return updated;
  }

  async startRide(rideId: string) {
    return this.prisma.ride.update({ where: { id: rideId }, data: { status: 'STARTED' } });
  }

  async completeRide(rideId: string, actualDistance?: number, actualTimeMinutes?: number) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');

    // Calculate the actual price using Ethiopian pricing
    const calculatedPrice = await this.calculateRidePrice(ride, actualDistance, actualTimeMinutes);
    
    const updatedRide = await this.prisma.ride.update({ 
      where: { id: rideId }, 
      data: { 
        status: 'COMPLETED', 
        price: calculatedPrice.finalPrice 
      } 
    });

    // Send completion notification with price details
    await this.notificationsService.notifyRideCompleted(
      rideId, 
      ride.driverId!, 
      ride.passengerId, 
      calculatedPrice.finalPrice
    );

    return {
      ride: updatedRide,
      pricing: calculatedPrice
    };
  }

  // Calculate ride price using Ethiopian pricing system
  private async calculateRidePrice(ride: any, actualDistance?: number, actualTimeMinutes?: number) {
    // Use actual distance/time if provided, otherwise estimate
    const distance = actualDistance || this.calculateDistance(
      ride.pickupLat, 
      ride.pickupLng, 
      ride.dropoffLat || ride.pickupLat, 
      ride.dropoffLng || ride.pickupLng
    );
    
    const timeMinutes = actualTimeMinutes || Math.round(distance * 2.5);

    // Ethiopian ride app pricing structure
    const baseFare = 15; // 15 ETB base fare
    const perKmRate = 12; // 12 ETB per kilometer
    const perMinuteRate = 2; // 2 ETB per minute
    const minimumFare = 25; // 25 ETB minimum fare

    // Calculate price components
    const distancePrice = distance * perKmRate;
    const timePrice = timeMinutes * perMinuteRate;
    const subtotal = baseFare + distancePrice + timePrice;
    
    // Apply minimum fare
    const finalPrice = Math.max(minimumFare, subtotal);

    // Add surge pricing based on time of completion
    const surgeMultiplier = this.calculateSurgePricing();
    const finalPriceWithSurge = finalPrice * surgeMultiplier;

    return {
      baseFare,
      distance: Math.round(distance * 100) / 100,
      timeMinutes,
      distancePrice: Math.round(distancePrice * 100) / 100,
      timePrice: Math.round(timePrice * 100) / 100,
      subtotal: Math.round(subtotal * 100) / 100,
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
      finalPrice: Math.round(finalPriceWithSurge * 100) / 100,
      currency: 'ETB',
      breakdown: {
        baseFare,
        distance: `${distance.toFixed(2)}km × ${perKmRate} ETB`,
        time: `${timeMinutes}min × ${perMinuteRate} ETB`,
        surge: surgeMultiplier > 1 ? `${surgeMultiplier.toFixed(1)}x surge` : 'No surge'
      }
    };
  }

  // Calculate surge pricing based on demand (same as drivers service)
  private calculateSurgePricing(): number {
    const hour = new Date().getHours();
    
    // Peak hours (7-9 AM, 5-7 PM) have higher surge
    if ((hour >= 7 && hour <= 9) || (hour >= 17 && hour <= 19)) {
      return 1.5 + Math.random() * 0.5; // 1.5x to 2.0x
    }
    
    // Late night (11 PM - 5 AM) has moderate surge
    if (hour >= 23 || hour <= 5) {
      return 1.2 + Math.random() * 0.3; // 1.2x to 1.5x
    }
    
    // Normal hours have no surge or minimal surge
    return 1.0 + Math.random() * 0.2; // 1.0x to 1.2x
  }

  // Calculate distance between two coordinates (same as drivers service)
  private calculateDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) * 
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  async getRide(rideId: string) {
    return this.prisma.ride.findUnique({ 
      where: { id: rideId },
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true, vehicle: true } }
      }
    });
  }

  // Get ride history for a user
  async getRideHistory(userId: string, role: 'PASSENGER' | 'DRIVER', page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;
    
    const where = role === 'PASSENGER' 
      ? { passengerId: userId }
      : { driverId: userId };

    const [rides, total] = await Promise.all([
      this.prisma.ride.findMany({
        where,
        include: {
          passenger: { select: { id: true, name: true, phone: true } },
          driver: { select: { id: true, name: true, phone: true, vehicle: true } }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      this.prisma.ride.count({ where })
    ]);

    return {
      rides,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  // Get active rides for a user
  async getActiveRides(userId: string, role: 'PASSENGER' | 'DRIVER') {
    const where = role === 'PASSENGER' 
      ? { passengerId: userId, status: { in: ['REQUESTED', 'ASSIGNED', 'STARTED'] as any[] } }
      : { driverId: userId, status: { in: ['ASSIGNED', 'STARTED'] as any[] } };

    return this.prisma.ride.findMany({
      where,
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true, vehicle: true } }
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  // Cancel a ride
  async cancelRide(rideId: string, userId: string) {
    const ride = await this.prisma.ride.findUnique({ where: { id: rideId } });
    if (!ride) throw new NotFoundException('Ride not found');
    
    // Check if user is authorized to cancel this ride
    if (ride.passengerId !== userId && ride.driverId !== userId) {
      throw new ConflictException('Not authorized to cancel this ride');
    }

    // Only allow cancellation if ride is not completed
    if (ride.status === 'COMPLETED') {
      throw new ConflictException('Cannot cancel completed ride');
    }

    const updatedRide = await this.prisma.ride.update({
      where: { id: rideId },
      data: { status: 'CANCELLED' }
    });

    // If driver was assigned, set them back to ONLINE
    if (ride.driverId) {
      await this.prisma.driver.update({
        where: { id: ride.driverId },
        data: { status: 'ONLINE' }
      });
    }

    return updatedRide;
  }
}
