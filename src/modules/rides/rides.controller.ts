import { 
  Body, 
  Controller, 
  Param, 
  Post, 
  Get, 
  Request, 
  UseGuards, 
  Query 
} from '@nestjs/common';
import { CreateRideDto } from './dto/create-ride.dto';
import { RidesService } from './rides.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

@Controller('rides')
export class RidesController {
  constructor(private rides: RidesService) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  async create(@Request() req: any, @Body() dto: CreateRideDto) {
    return this.rides.createRide(req.user.sub, dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('history')
  async getHistory(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string
  ) {
    const role = req.user.role;
    const pageNum = page ? parseInt(page) : 1;
    const limitNum = limit ? parseInt(limit) : 10;
    
    return this.rides.getRideHistory(req.user.sub, role, pageNum, limitNum);
  }

  @UseGuards(JwtAuthGuard)
  @Get('active')
  async getActive(@Request() req: any) {
    const role = req.user.role;
    return this.rides.getActiveRides(req.user.sub, role);
  }

  @UseGuards(JwtAuthGuard)
  @Get(':id')
  async getRide(@Param('id') id: string) {
    return this.rides.getRide(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/accept')
  async accept(@Param('id') id: string, @Request() req: any) {
    return this.rides.assignDriver(id, req.user.sub);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/start')
  async start(@Param('id') id: string) {
    return this.rides.startRide(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/complete')
  async complete(
    @Param('id') id: string, 
    @Body() body: { actualDistance?: number; actualTimeMinutes?: number }
  ) {
    return this.rides.completeRide(id, body.actualDistance, body.actualTimeMinutes);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Request() req: any) {
    return this.rides.cancelRide(id, req.user.sub);
  }
}
