import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
export class SendInterestDto { @IsString() @MinLength(1) receiverId!: string; }
export class RespondInterestDto { @IsIn(['ACCEPTED', 'DECLINED']) status!: 'ACCEPTED' | 'DECLINED'; }
export class SendMessageDto { @IsString() @MinLength(1) @MaxLength(5000) body!: string; }
