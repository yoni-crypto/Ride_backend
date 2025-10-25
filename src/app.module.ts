import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration';
import { PrismaService } from './libs/prisma/prisma.service';
import { AuthModule } from './modules/auth/auth.module';
import { UsersModule } from './modules/users/users.module';
import { RidesModule } from './modules/rides/rides.module';
import { SocketModule } from './modules/socket/socket.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { AdminModule } from './modules/admin/admin.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { VehiclesModule } from './modules/vehicles/vehicles.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';

@Module({
  imports: [
    ConfigModule.forRoot({ load: [configuration], isGlobal: true }),
    AuthModule,
    UsersModule,
    RidesModule,
    SocketModule,
    DriversModule,
    AdminModule,
    NotificationsModule,
    VehiclesModule,
    AnalyticsModule,
  ],
  providers: [PrismaService],
})
export class AppModule {}
