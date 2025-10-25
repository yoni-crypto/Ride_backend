import { Module } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { DriversService } from './drivers.service';

@Module({
  providers: [DriversService, PrismaService],
  exports: [DriversService],
})
export class DriversModule {}
