import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';

@Injectable()
export class VehiclesService {
  constructor(private prisma: PrismaService) {}

  async createVehicle(data: {
    make: string;
    model: string;
    year: number;
    color: string;
    plateNumber: string;
    vin: string;
    driverId: string;
  }) {
    // Check if driver exists
    const driver = await this.prisma.driver.findUnique({
      where: { id: data.driverId }
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    // Check if driver already has a vehicle
    if (driver.vehicleId) {
      throw new BadRequestException('Driver already has a vehicle assigned');
    }

    // Check if plate number or VIN already exists
    const existingVehicle = await this.prisma.vehicle.findFirst({
      where: {
        OR: [
          { plateNumber: data.plateNumber },
          { vin: data.vin }
        ]
      }
    });

    if (existingVehicle) {
      throw new BadRequestException('Vehicle with this plate number or VIN already exists');
    }

    // Create vehicle
    const vehicle = await this.prisma.vehicle.create({
      data: {
        make: data.make,
        model: data.model,
        year: data.year,
        color: data.color,
        plateNumber: data.plateNumber,
        vin: data.vin,
        status: 'PENDING'
      }
    });

    // Update driver with vehicle ID
    await this.prisma.driver.update({
      where: { id: data.driverId },
      data: { vehicleId: vehicle.id }
    });

    return vehicle;
  }

  async getDriverVehicles(driverId: string) {
    const driver = await this.prisma.driver.findUnique({
      where: { id: driverId },
      include: {
        vehicle: {
          include: {
            documents: true
          }
        }
      }
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    return driver.vehicle;
  }

  async uploadVehicleDocument(data: {
    vehicleId: string;
    type: 'DRIVER_LICENSE' | 'INSURANCE' | 'REGISTRATION' | 'INSPECTION' | 'BACKGROUND_CHECK';
    url: string;
  }) {
    // Check if vehicle exists
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: data.vehicleId }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    // Create document record
    const document = await this.prisma.vehicleDocument.create({
      data: {
        vehicleId: data.vehicleId,
        type: data.type,
        url: data.url,
        status: 'PENDING'
      }
    });

    return document;
  }

  async getVehicleDocuments(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        documents: true
      }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle.documents;
  }

  async updateVehicleStatus(vehicleId: string, status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'SUSPENDED') {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return this.prisma.vehicle.update({
      where: { id: vehicleId },
      data: { status }
    });
  }

  async getAllVehicles(page: number = 1, limit: number = 10) {
    const skip = (page - 1) * limit;

    const [vehicles, total] = await Promise.all([
      this.prisma.vehicle.findMany({
        skip,
        take: limit,
        include: {
          driver: {
            select: {
              id: true,
              name: true,
              phone: true
            }
          },
          documents: true
        },
        orderBy: { createdAt: 'desc' }
      }),
      this.prisma.vehicle.count()
    ]);

    return {
      vehicles,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getVehicleById(vehicleId: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
      include: {
        driver: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true
          }
        },
        documents: true
      }
    });

    if (!vehicle) {
      throw new NotFoundException('Vehicle not found');
    }

    return vehicle;
  }
}
