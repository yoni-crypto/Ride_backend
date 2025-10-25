import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import moment from 'moment';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  async getRealTimeMetrics() {
    const [
      totalUsers,
      totalDrivers,
      onlineDrivers,
      totalRides,
      activeRides,
      completedRidesToday,
      totalRevenue
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.driver.count(),
      this.prisma.driver.count({ where: { status: 'ONLINE' } }),
      this.prisma.ride.count(),
      this.prisma.ride.count({ where: { status: { in: ['REQUESTED', 'ASSIGNED', 'STARTED'] } } }),
      this.prisma.ride.count({
        where: {
          status: 'COMPLETED',
          createdAt: {
            gte: moment().startOf('day').toDate(),
            lte: moment().endOf('day').toDate()
          }
        }
      }),
      this.prisma.ride.aggregate({
        where: { status: 'COMPLETED' },
        _sum: { price: true }
      })
    ]);

    return {
      timestamp: new Date().toISOString(),
      metrics: {
        users: {
          total: totalUsers,
          drivers: totalDrivers,
          online: onlineDrivers
        },
        rides: {
          total: totalRides,
          active: activeRides,
          completedToday: completedRidesToday
        },
        revenue: {
          total: totalRevenue._sum.price || 0,
          currency: 'ETB'
        }
      }
    };
  }

  async getTimeSeriesData(metric: string, days: number = 7) {
    const endDate = moment().endOf('day');
    const startDate = moment().subtract(days - 1, 'days').startOf('day');

    let data: Array<{ date: string; value: number }> = [];

    switch (metric) {
      case 'rides':
        data = await this.getRideTimeSeries(startDate, endDate, days);
        break;
      case 'revenue':
        data = await this.getRevenueTimeSeries(startDate, endDate, days);
        break;
      case 'users':
        data = await this.getUserTimeSeries(startDate, endDate, days);
        break;
      default:
        throw new Error(`Unknown metric: ${metric}`);
    }

    return {
      metric,
      period: `${days} days`,
      data,
      generatedAt: new Date().toISOString()
    };
  }

  private async getRideTimeSeries(startDate: moment.Moment, endDate: moment.Moment, days: number) {
    const rideCounts = await this.prisma.ride.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: startDate.toDate(),
          lte: endDate.toDate()
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return Array.from({ length: days }).map((_, i) => {
      const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
      const count = rideCounts.find(rc => 
        moment(rc.createdAt).format('YYYY-MM-DD') === date
      )?._count.id || 0;
      
      return { date, value: count };
    });
  }

  private async getRevenueTimeSeries(startDate: moment.Moment, endDate: moment.Moment, days: number) {
    const revenueData = await this.prisma.ride.groupBy({
      by: ['createdAt'],
      _sum: { price: true },
      where: {
        status: 'COMPLETED',
        createdAt: {
          gte: startDate.toDate(),
          lte: endDate.toDate()
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return Array.from({ length: days }).map((_, i) => {
      const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
      const revenue = revenueData.find(rd => 
        moment(rd.createdAt).format('YYYY-MM-DD') === date
      )?._sum.price || 0;
      
      return { date, value: revenue };
    });
  }

  private async getUserTimeSeries(startDate: moment.Moment, endDate: moment.Moment, days: number) {
    const userCounts = await this.prisma.user.groupBy({
      by: ['createdAt'],
      _count: { id: true },
      where: {
        createdAt: {
          gte: startDate.toDate(),
          lte: endDate.toDate()
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    return Array.from({ length: days }).map((_, i) => {
      const date = moment(startDate).add(i, 'days').format('YYYY-MM-DD');
      const count = userCounts.find(uc => 
        moment(uc.createdAt).format('YYYY-MM-DD') === date
      )?._count.id || 0;
      
      return { date, value: count };
    });
  }

  async getGeographicData() {
    // Get ride distribution by pickup locations
    const rides = await this.prisma.ride.findMany({
      select: {
        pickupLat: true,
        pickupLng: true,
        status: true,
        price: true
      },
      take: 1000 // Limit for performance
    });

    const locations = rides.map(ride => ({
      lat: ride.pickupLat,
      lng: ride.pickupLng,
      status: ride.status,
      price: ride.price || 0
    }));

    // Calculate hotspots (areas with high ride density)
    const hotspots = this.calculateHotspots(locations);

    return {
      totalRides: rides.length,
      locations,
      hotspots,
      generatedAt: new Date().toISOString()
    };
  }

  private calculateHotspots(locations: any[]) {
    // Simple hotspot calculation - in production, use proper clustering algorithms
    const gridSize = 0.01; // ~1km grid
    const gridCounts = new Map();

    locations.forEach(location => {
      const gridLat = Math.floor(location.lat / gridSize) * gridSize;
      const gridLng = Math.floor(location.lng / gridSize) * gridSize;
      const key = `${gridLat},${gridLng}`;
      
      gridCounts.set(key, (gridCounts.get(key) || 0) + 1);
    });

    return Array.from(gridCounts.entries())
      .map(([key, count]) => {
        const [lat, lng] = key.split(',').map(Number);
        return { lat, lng, count };
      })
      .sort((a, b) => b.count - a.count)
      .slice(0, 10); // Top 10 hotspots
  }

  async getDriverPerformance(limit: number = 50) {
    const drivers = await this.prisma.driver.findMany({
      select: {
        id: true,
        name: true,
        phone: true,
        rating: true,
        totalRides: true,
        earnings: true,
        status: true,
        rides: {
          where: { status: 'COMPLETED' },
          select: {
            price: true,
            createdAt: true
          }
        }
      },
      take: limit,
      orderBy: { totalRides: 'desc' }
    });

    return drivers.map(driver => {
      const recentRides = driver.rides.filter(ride => 
        moment(ride.createdAt).isAfter(moment().subtract(30, 'days'))
      );

      const avgEarningsPerRide = driver.rides.length > 0 
        ? driver.rides.reduce((sum, ride) => sum + (ride.price || 0), 0) / driver.rides.length
        : 0;

      return {
        id: driver.id,
        name: driver.name,
        phone: driver.phone,
        rating: driver.rating,
        totalRides: driver.totalRides,
        totalEarnings: driver.earnings,
        avgEarningsPerRide: Math.round(avgEarningsPerRide * 100) / 100,
        recentRides: recentRides.length,
        status: driver.status,
        performance: this.calculatePerformanceScore(driver.rating, driver.totalRides, recentRides.length)
      };
    });
  }

  private calculatePerformanceScore(rating: number, totalRides: number, recentRides: number): string {
    const score = (rating * 0.4) + (Math.min(totalRides / 100, 1) * 0.3) + (Math.min(recentRides / 10, 1) * 0.3);
    
    if (score >= 0.8) return 'Excellent';
    if (score >= 0.6) return 'Good';
    if (score >= 0.4) return 'Average';
    return 'Needs Improvement';
  }

  async getUserBehaviorAnalytics() {
    const [
      userStats,
      ridePatterns,
      cancellationRates
    ] = await Promise.all([
      this.getUserStats(),
      this.getRidePatterns(),
      this.getCancellationRates()
    ]);

    return {
      userStats,
      ridePatterns,
      cancellationRates,
      generatedAt: new Date().toISOString()
    };
  }

  private async getUserStats() {
    const totalUsers = await this.prisma.user.count();
    const activeUsers = await this.prisma.user.count({
      where: {
        rides: {
          some: {
            createdAt: {
              gte: moment().subtract(30, 'days').toDate()
            }
          }
        }
      }
    });

    return {
      total: totalUsers,
      active: activeUsers,
      retentionRate: totalUsers > 0 ? (activeUsers / totalUsers) * 100 : 0
    };
  }

  private async getRidePatterns() {
    const rides = await this.prisma.ride.findMany({
      select: {
        createdAt: true,
        status: true,
        price: true
      }
    });

    const hourlyPatterns = Array.from({ length: 24 }, (_, hour) => {
      const hourRides = rides.filter(ride => 
        moment(ride.createdAt).hour() === hour
      );
      
      return {
        hour,
        count: hourRides.length,
        avgPrice: hourRides.length > 0 
          ? hourRides.reduce((sum, ride) => sum + (ride.price || 0), 0) / hourRides.length
          : 0
      };
    });

    return { hourlyPatterns };
  }

  private async getCancellationRates() {
    const totalRides = await this.prisma.ride.count();
    const cancelledRides = await this.prisma.ride.count({
      where: { status: 'CANCELLED' }
    });

    return {
      totalRides,
      cancelledRides,
      cancellationRate: totalRides > 0 ? (cancelledRides / totalRides) * 100 : 0
    };
  }
}
