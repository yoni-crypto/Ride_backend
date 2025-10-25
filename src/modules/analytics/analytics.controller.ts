import {
  Controller,
  Get,
  Query,
  UseGuards,
  Param
} from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  @Get('realtime')
  async getRealTimeMetrics() {
    return this.analyticsService.getRealTimeMetrics();
  }

  @Get('timeseries')
  async getTimeSeriesData(
    @Query('metric') metric: string = 'rides',
    @Query('days') days: string = '7'
  ) {
    return this.analyticsService.getTimeSeriesData(metric, parseInt(days));
  }

  @Get('geographic')
  async getGeographicData() {
    return this.analyticsService.getGeographicData();
  }

  @Get('driver-performance')
  async getDriverPerformance(
    @Query('limit') limit: string = '50'
  ) {
    return this.analyticsService.getDriverPerformance(parseInt(limit));
  }

  @Get('user-behavior')
  async getUserBehaviorAnalytics() {
    return this.analyticsService.getUserBehaviorAnalytics();
  }
}
