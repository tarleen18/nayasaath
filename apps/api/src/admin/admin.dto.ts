import { IsEmail, IsEnum, IsOptional, IsString, MinLength } from 'class-validator';
import { VerificationStatus, VerificationType } from '@prisma/client';
export class AdminLoginDto { @IsEmail() email!: string; @IsString() @MinLength(1) password!: string; }
export class ReviewDto { @IsEnum(VerificationStatus) status!: VerificationStatus; @IsOptional() @IsString() reason?: string; }

export class VerificationQueueQueryDto { @IsOptional() @IsEnum(VerificationType) type?: VerificationType; }
