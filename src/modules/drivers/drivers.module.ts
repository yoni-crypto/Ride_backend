import { Module } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { DriversService } from './drivers.service';
import { DriversController } from './drivers.controller';

@Module({
  controllers: [DriversController],
  providers: [DriversService, PrismaService],
  exports: [DriversService],
})
export class DriversModule {}
