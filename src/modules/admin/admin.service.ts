import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class AdminService {
  private redis: Redis;

  constructor(
    private prisma: PrismaService,
    private config: ConfigService
  ) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  // Get dashboard statistics
  async getDashboardStats() {
    const [
      totalUsers,
      totalDrivers,
      totalRides,
      completedRides,
      activeRides,
      totalRevenue
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.driver.count(),
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { status: 'COMPLETED' } }),
      this.prisma.ride.count({ 
        where: { status: { in: ['REQUESTED', 'ASSIGNED', 'STARTED'] } } 
      }),
      this.prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { price: true }
      })
    ]);

    return {
      users: {
        total: totalUsers,
        drivers: totalDrivers
      },
      rides: {
        total: totalRides,
        completed: completedRides,
        active: activeRides,
        completionRate: totalRides > 0 ? (completedRides / totalRides) * 100 : 0
      },
      revenue: {
        total: totalRevenue._sum.price || 0,
        average: completedRides > 0 ? (totalRevenue._sum.price || 0) / completedRides : 0
      }
    };
  }

  // Get recent rides
  async getRecentRides(limit: number = 20) {
    return this.prisma.ride.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        passenger: { select: { id: true, name: true, phone: true } },
        driver: { select: { id: true, name: true, phone: true, vehicle: true } }
      }
    });
  }

  // Get user statistics
  async getUserStats() {
    const [users, drivers] = await Promise.all([
      this.prisma.user.findMany({
        select: { id: true, name: true, phone: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),
      this.prisma.driver.findMany({
        select: { 
          id: true, 
          name: true, 
          phone: true, 
          vehicle: true, 
          status: true, 
          createdAt: true 
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      })
    ]);

    return { users, drivers };
  }

  // Get ride analytics
  async getRideAnalytics(days: number = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const rides = await this.prisma.ride.findMany({
      where: {
        createdAt: { gte: startDate }
      },
      select: {
        status: true,
        price: true,
        createdAt: true
      }
    });

    // Group by date
    const dailyStats = rides.reduce((acc, ride) => {
      const date = ride.createdAt.toISOString().split('T')[0];
      if (!acc[date]) {
        acc[date] = { total: 0, completed: 0, revenue: 0 };
      }
      acc[date].total++;
      if (ride.status === 'COMPLETED') {
        acc[date].completed++;
        acc[date].revenue += ride.price || 0;
      }
      return acc;
    }, {} as Record<string, { total: number; completed: number; revenue: number }>);

    return {
      period: `${days} days`,
      dailyStats,
      totalRides: rides.length,
      completedRides: rides.filter(r => r.status === 'COMPLETED').length,
      totalRevenue: rides
        .filter(r => r.status === 'COMPLETED')
        .reduce((sum, r) => sum + (r.price || 0), 0)
    };
  }

  // Get online drivers
  async getOnlineDrivers() {
    const onlineDrivers = await this.prisma.driver.findMany({
      where: { status: 'ONLINE' },
      select: { id: true, name: true, phone: true, vehicle: true }
    });

    // Get their locations from Redis
    const driversWithLocation = await Promise.all(
      onlineDrivers.map(async (driver) => {
        const location = await this.redis.hget('drivers:locations', driver.id);
        return {
          ...driver,
          location: location ? JSON.parse(location) : null
        };
      })
    );

    return driversWithLocation;
  }

  // Get system health
  async getSystemHealth() {
    try {
      // Test database connection
      await this.prisma.user.count();
      const dbStatus = 'healthy';

      // Test Redis connection
      await this.redis.ping();
      const redisStatus = 'healthy';

      return {
        database: dbStatus,
        redis: redisStatus,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        database: 'unhealthy',
        redis: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}
