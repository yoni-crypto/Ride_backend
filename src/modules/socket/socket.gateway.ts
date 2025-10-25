import {
  WebSocketGateway,
  SubscribeMessage,
  OnGatewayInit,
  OnGatewayConnection,
  OnGatewayDisconnect,
  WebSocketServer
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import Redis from 'ioredis';
import { ConfigService } from '@nestjs/config';
import { Injectable, Logger } from '@nestjs/common';

@WebSocketGateway({ cors: { origin: '*' } })
@Injectable()
export class SocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server: Server;
  private redis: Redis;
  private logger = new Logger(SocketGateway.name);

  constructor(private config: ConfigService) {
    const redisUrl = this.config.get<string>('redis.url') ?? 'redis://localhost:6379';
    this.redis = new Redis(redisUrl);
  }

  afterInit(server: Server) {
    this.logger.log('Socket gateway initialized');
  }

  handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
    // expect client to emit 'auth' with token to join appropriate room
  }

  handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('driver:location')
  async handleDriverLocation(client: Socket, payload: { driverId: string; lat: number; lng: number }) {
    await this.redis.hset('drivers:locations', payload.driverId, JSON.stringify({ lat: payload.lat, lng: payload.lng, ts: Date.now() }));
    this.server.emit('driver:location:update', payload);
  }

  @SubscribeMessage('join')
  handleJoin(client: Socket, payload: { userId: string }) {
    client.join(payload.userId);
  }

  async publishRideAssigned(rideId: string, driverId: string, passengerId: string) {
    this.server.to(driverId).emit('ride:assigned', { rideId, passengerId });
    this.server.to(passengerId).emit('ride:assigned', { rideId, driverId });
  }
}
