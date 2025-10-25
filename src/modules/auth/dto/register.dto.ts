import { IsString, IsPhoneNumber, MinLength, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsPhoneNumber('ET')
  phone: string;

  @IsString()
  name: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsOptional()
  @IsString()
  role?: 'PASSENGER' | 'DRIVER';
}
