import { 
  Controller, 
  Get, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('admin')
@UseGuards(JwtAuthGuard, AdminGuard)
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  async getDashboard() {
    return this.adminService.getDashboardStats();
  }

  @Get('recent-rides')
  async getRecentRides(@Query('limit') limit?: string) {
    const limitNum = limit ? parseInt(limit) : 20;
    return this.adminService.getRecentRides(limitNum);
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUserStats();
  }

  @Get('analytics')
  async getAnalytics(@Query('days') days?: string) {
    const daysNum = days ? parseInt(days) : 30;
    return this.adminService.getRideAnalytics(daysNum);
  }

  @Get('drivers/online')
  async getOnlineDrivers() {
    return this.adminService.getOnlineDrivers();
  }

  @Get('health')
  async getHealth() {
    return this.adminService.getSystemHealth();
  }
}
