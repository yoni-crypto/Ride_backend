import { Module } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { NotificationsController } from './notifications.controller';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { SocketModule } from '../socket/socket.module';

@Module({
  imports: [SocketModule],
  controllers: [NotificationsController],
  providers: [NotificationsService, SmsService, PushService],
  exports: [NotificationsService, SmsService, PushService],
})
export class NotificationsModule {}
