import { Body, Controller, Param, Post, Request, UseGuards } from '@nestjs/common';
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
  async complete(@Param('id') id: string, @Body() body: { price: number }) {
    return this.rides.completeRide(id, body.price);
  }
}
