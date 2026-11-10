import { IsEmail, IsOptional, IsString, Matches, MinLength } from 'class-validator';

export class RegisterDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(12) password!: string;
  @IsOptional() @Matches(/^\+[1-9]\d{7,14}$/) phoneE164?: string;
}

export class LoginDto {
  @IsEmail() email!: string;
  @IsString() @MinLength(1) password!: string;
}

export class RefreshDto {
  @IsString() @MinLength(32) refreshToken!: string;
}


import { IsIn, Length } from 'class-validator';
export class RequestOtpDto { @IsIn(['email', 'phone']) channel!: 'email' | 'phone'; }
export class VerifyOtpDto { @IsIn(['email', 'phone']) channel!: 'email' | 'phone'; @IsString() @Length(6, 6) code!: string; }

export class EmailAddressDto {
  @IsEmail() email!: string;
}

export class VerifyEmailDto extends EmailAddressDto {
  @IsString() @Matches(/^\d{6}$/) code!: string;
}
