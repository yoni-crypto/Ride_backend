import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class DriversService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  async setStatus(driverId: string, status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP') {
    return this.prisma.driver.update({ where: { id: driverId }, data: { status } });
  }

  async findById(id: string) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async findOnlineDrivers() {
    return this.prisma.driver.findMany({ where: { status: 'ONLINE' } });
  }

  // Calculate distance between two coordinates using Haversine formula
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

  // Find nearest available drivers within radius
  async findNearestDrivers(pickupLat: number, pickupLng: number, radiusKm: number = 10) {
    console.log(`🔍 Searching for drivers near ${pickupLat}, ${pickupLng} within ${radiusKm}km`);
    
    const onlineDrivers = await this.findOnlineDrivers();
    console.log(`📊 Found ${onlineDrivers.length} online drivers in database`);
    
    const driversWithDistance: Array<{
      id: string;
      phone: string;
      name: string | null;
      vehicle: string | null;
      status: any;
      password: string;
      createdAt: Date;
      updatedAt: Date;
      distance: number;
      currentLat: number;
      currentLng: number;
    }> = [];

    for (const driver of onlineDrivers) {
      console.log(`👨‍💼 Checking driver ${driver.id} (${driver.name})`);
      
      // Get driver's current location from Redis
      const locationData = await this.redis.hget('drivers:locations', driver.id);
      console.log(`📍 Driver ${driver.id} location data:`, locationData);
      
      if (!locationData) {
        console.log(`❌ No location data found for driver ${driver.id}`);
        continue;
      }

      const { lat, lng } = JSON.parse(locationData);
      const distance = this.calculateDistance(pickupLat, pickupLng, lat, lng);
      
      console.log(`📏 Driver ${driver.id} distance: ${distance.toFixed(2)}km (limit: ${radiusKm}km)`);
      
      if (distance <= radiusKm) {
        console.log(`✅ Driver ${driver.id} is within range!`);
        driversWithDistance.push({
          ...driver,
          distance,
          currentLat: lat,
          currentLng: lng
        });
      } else {
        console.log(`❌ Driver ${driver.id} is too far away`);
      }
    }

    console.log(`🎯 Found ${driversWithDistance.length} drivers within range`);
    
    // Sort by distance (nearest first)
    return driversWithDistance.sort((a, b) => a.distance - b.distance);
  }

  // Update driver location
  async updateLocation(driverId: string, lat: number, lng: number) {
    console.log(`📍 Updating location for driver ${driverId}: ${lat}, ${lng}`);
    
    const locationData = { 
      lat, 
      lng, 
      timestamp: Date.now() 
    };
    
    await this.redis.hset('drivers:locations', driverId, JSON.stringify(locationData));
    
    // Verify the location was saved
    const savedLocation = await this.redis.hget('drivers:locations', driverId);
    console.log(`✅ Location saved for driver ${driverId}:`, savedLocation);
  }

  // Get driver location
  async getDriverLocation(driverId: string) {
    const locationData = await this.redis.hget('drivers:locations', driverId);
    return locationData ? JSON.parse(locationData) : null;
  }

  // Estimate ride time and distance using Ethiopian ride app pricing
  async estimateRide(pickupLat: number, pickupLng: number, dropoffLat: number, dropoffLng: number) {
    const distance = this.calculateDistance(pickupLat, pickupLng, dropoffLat, dropoffLng);
    
    // Ethiopian ride app pricing structure
    const baseFare = 15; // 15 ETB base fare
    const perKmRate = 12; // 12 ETB per kilometer
    const perMinuteRate = 2; // 2 ETB per minute
    const minimumFare = 25; // 25 ETB minimum fare
    
    // Time estimation (in real app, use Google Maps API)
    const estimatedTimeMinutes = Math.round(distance * 2.5); // 2.5 minutes per km average
    const estimatedTimeHours = estimatedTimeMinutes / 60;
    
    // Calculate price components
    const distancePrice = distance * perKmRate;
    const timePrice = estimatedTimeMinutes * perMinuteRate;
    const totalPrice = baseFare + distancePrice + timePrice;
    
    // Apply minimum fare
    const finalPrice = Math.max(minimumFare, totalPrice);
    
    // Add surge pricing (1.0x to 3.0x based on demand)
    const surgeMultiplier = this.calculateSurgePricing();
    const finalPriceWithSurge = finalPrice * surgeMultiplier;
    
    return {
      distance: Math.round(distance * 100) / 100, // Round to 2 decimal places
      estimatedTime: estimatedTimeMinutes,
      estimatedTimeHours: Math.round(estimatedTimeHours * 100) / 100,
      baseFare,
      distancePrice: Math.round(distancePrice * 100) / 100,
      timePrice: Math.round(timePrice * 100) / 100,
      subtotal: Math.round(totalPrice * 100) / 100,
      surgeMultiplier: Math.round(surgeMultiplier * 100) / 100,
      estimatedPrice: Math.round(finalPriceWithSurge * 100) / 100,
      currency: 'ETB',
      breakdown: {
        baseFare,
        distance: `${distance.toFixed(2)}km × ${perKmRate} ETB`,
        time: `${estimatedTimeMinutes}min × ${perMinuteRate} ETB`,
        surge: surgeMultiplier > 1 ? `${surgeMultiplier.toFixed(1)}x surge` : 'No surge'
      }
    };
  }

  // Calculate surge pricing based on demand (simplified)
  private calculateSurgePricing(): number {
    // In a real app, this would be based on:
    // - Number of available drivers
    // - Number of ride requests
    // - Time of day
    // - Weather conditions
    // - Special events
    
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

  // Get driver statistics
  async getDriverStats(driverId: string) {
    const driver = await this.findById(driverId);
    if (!driver) return null;

    const totalRides = await this.prisma.ride.count({
      where: { driverId, status: 'COMPLETED' }
    });

    const recentRides = await this.prisma.ride.findMany({
      where: { driverId, status: 'COMPLETED' },
      orderBy: { createdAt: 'desc' },
      take: 10,
      select: { price: true, createdAt: true }
    });

    const totalEarnings = recentRides.reduce((sum, ride) => sum + (ride.price || 0), 0);

    return {
      driver,
      totalRides,
      totalEarnings,
      recentRides: recentRides.length
    };
  }

  // Debug method to check Redis data
  async debugRedisData() {
    console.log('🔍 Debugging Redis data...');
    
    // Get all driver locations from Redis
    const allLocations = await this.redis.hgetall('drivers:locations');
    console.log('📍 All driver locations in Redis:', allLocations);
    
    // Get all online drivers from database
    const onlineDrivers = await this.findOnlineDrivers();
    console.log('👨‍💼 Online drivers in database:', onlineDrivers.map(d => ({ id: d.id, name: d.name, status: d.status })));
    
    return {
      redisLocations: allLocations,
      onlineDrivers: onlineDrivers.map(d => ({ id: d.id, name: d.name, status: d.status })),
      redisConnected: await this.redis.ping()
    };
  }
}
