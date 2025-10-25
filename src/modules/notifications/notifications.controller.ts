import {
  Controller,
  Post,
  Body,
  UseGuards,
  BadRequestException
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { SmsService } from './sms.service';
import { PushService } from './push.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard, AdminGuard)
export class NotificationsController {
  constructor(
    private notificationsService: NotificationsService,
    private smsService: SmsService,
    private pushService: PushService
  ) {}

  @Post('sms')
  async sendSms(@Body() data: { phone: string; message: string }) {
    if (!data.phone || !data.message) {
      throw new BadRequestException('Phone number and message are required');
    }

    try {
      await this.smsService.sendSms(data.phone, data.message);
      return {
        success: true,
        message: 'SMS sent successfully',
        phone: data.phone
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send SMS',
        error: error.message
      };
    }
  }

  @Post('sms/bulk')
  async sendBulkSms(@Body() data: { phoneNumbers: string[]; message: string }) {
    if (!data.phoneNumbers || !data.message || data.phoneNumbers.length === 0) {
      throw new BadRequestException('Phone numbers array and message are required');
    }

    const results: Array<{ phone: string; success: boolean; error?: string }> = [];
    
    for (const phone of data.phoneNumbers) {
      try {
        await this.smsService.sendSms(phone, data.message);
        results.push({ phone, success: true });
      } catch (error) {
        results.push({ phone, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;

    return {
      success: failureCount === 0,
      message: `Bulk SMS completed: ${successCount} successful, ${failureCount} failed`,
      results,
      summary: {
        total: results.length,
        successful: successCount,
        failed: failureCount
      }
    };
  }

  @Post('push')
  async sendPushNotification(@Body() data: {
    token: string;
    title: string;
    body: string;
    data?: { [key: string]: string };
  }) {
    if (!data.token || !data.title || !data.body) {
      throw new BadRequestException('Token, title, and body are required');
    }

    try {
      await this.pushService.sendPushNotification(
        data.token,
        data.title,
        data.body,
        data.data
      );
      
      return {
        success: true,
        message: 'Push notification sent successfully',
        token: data.token
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send push notification',
        error: error.message
      };
    }
  }

  @Post('broadcast')
  async sendBroadcastNotification(@Body() data: {
    message: string;
    type?: string;
  }) {
    if (!data.message) {
      throw new BadRequestException('Message is required');
    }

    try {
      await this.notificationsService.sendBroadcastNotification(
        data.message,
        data.type || 'info'
      );
      
      return {
        success: true,
        message: 'Broadcast notification sent successfully'
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to send broadcast notification',
        error: error.message
      };
    }
  }
}
