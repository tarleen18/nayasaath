import { IsIn, IsString, MaxLength, MinLength } from 'class-validator';
export class BlockMemberDto { @IsString() @MinLength(1) targetUserId!: string; }
export class ReportMemberDto {
  @IsString() @MinLength(1) targetUserId!: string;
  @IsIn(['FAKE_PROFILE', 'HARASSMENT', 'SCAM_OR_MONEY_REQUEST', 'INAPPROPRIATE_CONTENT', 'MARRIAGE_STATUS_MISREPRESENTATION', 'UNDERAGE_CONCERN', 'OTHER']) category!: string;
  @IsString() @MinLength(10) @MaxLength(3000) description!: string;
}
