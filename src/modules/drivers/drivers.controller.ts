import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Param, 
  UseGuards, 
  Request,
  Query 
} from '@nestjs/common';
import { DriversService } from './drivers.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('drivers')
export class DriversController {
  constructor(private driversService: DriversService) {}

  @UseGuards(JwtAuthGuard)
  @Post('status')
  async updateStatus(
    @Request() req: any,
    @Body() body: { status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP' }
  ) {
    return this.driversService.setStatus(req.user.sub, body.status);
  }

  @UseGuards(JwtAuthGuard)
  @Post('location')
  async updateLocation(
    @Request() req: any,
    @Body() body: { lat: number; lng: number }
  ) {
    await this.driversService.updateLocation(req.user.sub, body.lat, body.lng);
    return { message: 'Location updated successfully' };
  }

  @UseGuards(JwtAuthGuard)
  @Get('nearby')
  async findNearbyDrivers(
    @Query('lat') lat: string,
    @Query('lng') lng: string,
    @Query('radius') radius?: string
  ) {
    const pickupLat = parseFloat(lat);
    const pickupLng = parseFloat(lng);
    const radiusKm = radius ? parseFloat(radius) : 10;

    return this.driversService.findNearestDrivers(pickupLat, pickupLng, radiusKm);
  }

  @UseGuards(JwtAuthGuard)
  @Get('estimate')
  async estimateRide(
    @Query('pickupLat') pickupLat: string,
    @Query('pickupLng') pickupLng: string,
    @Query('dropoffLat') dropoffLat: string,
    @Query('dropoffLng') dropoffLng: string
  ) {
    return this.driversService.estimateRide(
      parseFloat(pickupLat),
      parseFloat(pickupLng),
      parseFloat(dropoffLat),
      parseFloat(dropoffLng)
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('stats')
  async getDriverStats(@Request() req: any) {
    return this.driversService.getDriverStats(req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id/location')
  async getDriverLocation(@Param('id') id: string) {
    return this.driversService.getDriverLocation(id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('debug/redis')
  async debugRedis() {
    return this.driversService.debugRedisData();
  }
}
