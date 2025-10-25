import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RidesService {
  private redis: Redis;

  constructor(private prisma: PrismaService, private config: ConfigService) {
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

    // push to simple queue for matching
    await this.redis.lpush('ride:requests', JSON.stringify({ rideId: ride.id }));

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

    return updated;
  }

  async startRide(rideId: string) {
    return this.prisma.ride.update({ where: { id: rideId }, data: { status: 'STARTED' } });
  }

  async completeRide(rideId: string, price: number) {
    return this.prisma.ride.update({ where: { id: rideId }, data: { status: 'COMPLETED', price } });
  }

  async getRide(rideId: string) {
    return this.prisma.ride.findUnique({ where: { id: rideId } });
  }
}
