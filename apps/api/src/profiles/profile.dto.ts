import { Gender, MaritalStatus } from '@prisma/client';
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength, ValidateIf } from 'class-validator';

export class UpsertProfileDto {
  @IsString() @MinLength(2) @MaxLength(80) displayName!: string;
  @IsEnum(Gender) gender!: Gender;
  @IsOptional() @IsString() @MaxLength(60) selfDescribedGender?: string;
  @IsDateString() dateOfBirth!: string;
  @IsEnum(MaritalStatus) maritalStatus!: MaritalStatus;
  @IsOptional() @IsString() @MaxLength(1000) maritalStatusDetails?: string;
  @IsOptional() @IsString() @MaxLength(100) city?: string;
  @IsOptional() @IsString() @MaxLength(100) state?: string;
  @IsOptional() @IsString() @MaxLength(100) education?: string;
  @IsOptional() @IsString() @MaxLength(100) profession?: string;
  @IsOptional() @IsString() @MaxLength(1200) bio?: string;
  @IsOptional() @IsBoolean() hasChildren?: boolean;
  @ValidateIf((o) => o.hasChildren === true) @IsInt() @Min(1) @Max(10) childrenCount?: number;
  @IsOptional() @IsString() @MaxLength(100) childrenLivingArrangement?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) languages?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) interests?: string[];
}

export class PartnerPreferenceDto {
  @IsOptional() @IsInt() @Min(18) @Max(99) minAge?: number;
  @IsOptional() @IsInt() @Min(18) @Max(99) maxAge?: number;
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsString({ each: true }) preferredCities?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(6) @IsEnum(MaritalStatus, { each: true }) acceptedMaritalStatuses?: MaritalStatus[];
  @IsOptional() @IsBoolean() openToPartnerWithChildren?: boolean;
  @IsOptional() @IsBoolean() willingToRelocate?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) educationPreferences?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) languagePreferences?: string[];
}
