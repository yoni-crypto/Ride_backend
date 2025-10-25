import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../libs/prisma/prisma.service';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService, private jwtService: JwtService) {}

  async register(payload: {
    phone: string;
    name?: string;
    password: string;
    role?: string;
  }) {
    const { phone, name, password, role } = payload;

    const existingUser = await this.prisma.user.findUnique({ where: { phone } });
    const existingDriver = await this.prisma.driver.findUnique({ where: { phone } });

    if (existingUser || existingDriver) {
      throw new ConflictException('Phone already used');
    }

    const hashed = await bcrypt.hash(password, 10);

    if (role === 'DRIVER') {
      const driver = await this.prisma.driver.create({
        data: { phone, name, password: hashed },
      });
      const { password: _, ...driverSafe } = driver;
      return {
        status: 'success',
        data: {
          driver: driverSafe,
        },
      };
    }

    const user = await this.prisma.user.create({
      data: { phone, name, password: hashed },
    });
    const { password: _, ...userSafe } = user;

    return {
      status: 'success',
      data: {
        user: userSafe,
      },
    };
  }

  async login(phone: string, password: string) {
    // Check both tables
    const user = await this.prisma.user.findUnique({ where: { phone } });
    const driver = await this.prisma.driver.findUnique({ where: { phone } });

    const account = user || driver;
    if (!account) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(password, account.password);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const role = user ? 'PASSENGER' : 'DRIVER';
    const payload = { sub: account.id, phone: account.phone, role };

    const token = this.jwtService.sign(payload);

    return {
      status: 'success',
      data: {
        token,
        role,
      },
    };
  }
}
