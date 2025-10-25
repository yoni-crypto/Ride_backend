import { Module } from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { AuthModule } from '../auth/auth.module'; // import if using JwtAuthGuard

@Module({
  imports: [AuthModule],
  controllers: [UsersController],
  providers: [UsersService, PrismaService],
  exports: [UsersService],
})
export class UsersModule {}
