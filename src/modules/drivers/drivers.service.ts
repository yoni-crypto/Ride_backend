import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async setStatus(driverId: string, status: 'ONLINE' | 'OFFLINE' | 'ON_TRIP') {
    return this.prisma.driver.update({ where: { id: driverId }, data: { status } });
  }

  async findById(id: string) {
    return this.prisma.driver.findUnique({ where: { id } });
  }

  async findOnlineDrivers() {
    return this.prisma.driver.findMany({ where: { status: 'ONLINE' } });
  }
}
