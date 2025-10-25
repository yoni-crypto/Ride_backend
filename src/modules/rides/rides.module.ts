import { Module } from '@nestjs/common';
import { RidesService } from './rides.service';
import { RidesController } from './rides.controller';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { ConfigModule } from '@nestjs/config';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [ConfigModule, SocketModule],
  controllers: [RidesController],
  providers: [RidesService, PrismaService],
  exports: [RidesService],
})
export class RidesModule {}
