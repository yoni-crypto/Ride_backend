import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  UploadedFile,
  UseInterceptors,
  BadRequestException
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { VehiclesService } from './vehicles.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('vehicles')
@UseGuards(JwtAuthGuard)
export class VehiclesController {
  constructor(private vehiclesService: VehiclesService) {}

  @Post()
  async createVehicle(@Body() data: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vin: string;
  }, @Request() req) {
    const driverId = req.user.sub; // Get driver ID from JWT token
    
    return this.vehiclesService.createVehicle({
      ...data,
      driverId
    });
  }

  @Get('driver')
  async getDriverVehicles(@Request() req) {
    const driverId = req.user.sub;
    return this.vehiclesService.getDriverVehicles(driverId);
  }

  @Post('documents')
  @UseInterceptors(FileInterceptor('document'))
  async uploadVehicleDocument(
    @Body() data: {
      vehicleId: string;
      type: 'DRIVER_LICENSE' | 'INSURANCE' | 'REGISTRATION' | 'INSPECTION' | 'BACKGROUND_CHECK';
    },
    @UploadedFile() file: any
  ) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    // In a real app, you'd upload to cloud storage (AWS S3, Google Cloud, etc.)
    // For now, we'll just use a placeholder URL
    const fileUrl = `https://storage.example.com/vehicles/${file.filename}`;

    return this.vehiclesService.uploadVehicleDocument({
      vehicleId: data.vehicleId,
      type: data.type,
      url: fileUrl
    });
  }

  @Get(':id/documents')
  async getVehicleDocuments(@Param('id') vehicleId: string) {
    return this.vehiclesService.getVehicleDocuments(vehicleId);
  }

  @Put(':id/status')
  @UseGuards(AdminGuard)
  async updateVehicleStatus(
    @Param('id') vehicleId: string,
    @Body() data: { status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED' }
  ) {
    return this.vehiclesService.updateVehicleStatus(vehicleId, data.status);
  }

  @Get()
  @UseGuards(AdminGuard)
  async getAllVehicles(
    @Query('page') page: string = '1',
    @Query('limit') limit: string = '10'
  ) {
    return this.vehiclesService.getAllVehicles(
      parseInt(page),
      parseInt(limit)
    );
  }

  @Get(':id')
  @UseGuards(AdminGuard)
  async getVehicleById(@Param('id') vehicleId: string) {
    return this.vehiclesService.getVehicleById(vehicleId);
  }
}
