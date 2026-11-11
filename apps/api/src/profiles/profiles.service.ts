import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { MaritalStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma.service';
import { PartnerPreferenceDto, UpsertProfileDto } from './profile.dto';

const profileSelect = {
  id: true, displayName: true, gender: true, selfDescribedGender: true,
  city: true, state: true, countryCode: true, education: true, profession: true,
  bio: true, maritalStatus: true, maritalStatusDetails: true, hasChildren: true,
  childrenCount: true, childrenLivingArrangement: true, languages: true,
  interests: true, profileVisible: true, createdAt: true, updatedAt: true,
  photos: { where: { moderationStatus: 'APPROVED' }, orderBy: { sortOrder: 'asc' as const }, select: { id: true, visibility: true, sortOrder: true } },
  preference: true,
  user: { select: { dateOfBirth: true } },
} satisfies Prisma.ProfileSelect;

// Public discovery deliberately excludes DOB, exact child details, private preferences and storage keys.
const publicProfileSelect = {
  id: true, displayName: true, gender: true, selfDescribedGender: true,
  city: true, state: true, countryCode: true, education: true, profession: true,
  bio: true, maritalStatus: true, hasChildren: true, languages: true, interests: true,
  photos: { where: { moderationStatus: 'APPROVED', visibility: 'PUBLIC' }, orderBy: { sortOrder: 'asc' as const }, select: { id: true, visibility: true, sortOrder: true } },
} satisfies Prisma.ProfileSelect;

function ageOn(dateOfBirth: Date, now = new Date()): number {
  let age = now.getUTCFullYear() - dateOfBirth.getUTCFullYear();
  const month = now.getUTCMonth() - dateOfBirth.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < dateOfBirth.getUTCDate())) age--;
  return age;
}

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async getMine(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: profileSelect });
    return { profile };
  }

  async saveMine(userId: string, dto: UpsertProfileDto) {
    if (!dto.privateStorageAcknowledged) {
      throw new BadRequestException('Please acknowledge the private profile storage notice before saving.');
    }
    const dob = new Date(dto.dateOfBirth);
    if (!Number.isFinite(dob.getTime()) || dob > new Date() || ageOn(dob) < 18) {
      throw new BadRequestException('NayaSaath is for adults aged 18 and above.');
    }
    if (dto.gender === 'SELF_DESCRIBED' && !dto.selfDescribedGender?.trim()) {
      throw new BadRequestException('Please describe your gender.');
    }
    if (dto.hasChildren !== true && (dto.childrenCount != null || dto.childrenLivingArrangement?.trim())) {
      throw new BadRequestException('Children details can only be supplied when hasChildren is true.');
    }
    const { dateOfBirth, privateStorageAcknowledged, ...profileData } = dto;
    const data = {
      ...profileData,
      selfDescribedGender: dto.gender === 'SELF_DESCRIBED' ? dto.selfDescribedGender?.trim() : null,
      maritalStatusDetails: dto.maritalStatusDetails?.trim() || null,
      hasChildren: dto.hasChildren ?? null,
      childrenCount: dto.hasChildren ? (dto.childrenCount ?? null) : null,
      childrenLivingArrangement: dto.hasChildren ? (dto.childrenLivingArrangement?.trim() || null) : null,
      city: dto.city?.trim() || null,
      state: dto.state?.trim() || null,
      education: dto.education?.trim() || null,
      profession: dto.profession?.trim() || null,
      bio: dto.bio?.trim() || null,
      languages: (dto.languages ?? []).map((x) => x.trim()).filter(Boolean),
      interests: (dto.interests ?? []).map((x) => x.trim()).filter(Boolean),
    };
    const profile = await this.prisma.$transaction(async (tx) => {
      const existingConsent = await tx.consentRecord.findFirst({
        where: {
          userId,
          purpose: 'private_profile_storage',
          policyVersion: 'private-profile-storage-v1',
          granted: true,
          withdrawnAt: null,
        },
        select: { id: true },
      });
      if (!existingConsent) {
        await tx.consentRecord.create({
          data: {
            userId,
            purpose: 'private_profile_storage',
            policyVersion: 'private-profile-storage-v1',
            granted: true,
          },
        });
      }
      await tx.user.update({ where: { id: userId }, data: { dateOfBirth: dob } });
      return tx.profile.upsert({
        where: { userId }, create: { userId, ...data, profileVisible: false }, update: data,
        select: profileSelect,
      });
    });
    return { profile, message: 'Profile saved privately. It will not be visible to other members in this release.' };
  }

  async savePreferences(userId: string, dto: PartnerPreferenceDto) {
    const storageAcknowledged = await this.prisma.consentRecord.findFirst({
      where: {
        userId,
        purpose: 'private_profile_storage',
        policyVersion: 'private-profile-storage-v1',
        granted: true,
        withdrawnAt: null,
      },
      select: { id: true },
    });
    if (!storageAcknowledged) {
      throw new BadRequestException('Acknowledge the private profile storage notice before saving preferences.');
    }
    const profile = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true } });
    if (!profile) throw new BadRequestException('Create your profile before setting partner preferences.');
    if (dto.minAge != null && dto.maxAge != null && dto.minAge > dto.maxAge) throw new BadRequestException('Minimum age cannot exceed maximum age.');
    const data = {
      ...dto,
      preferredCities: dto.preferredCities?.map((value) => value.trim()).filter(Boolean),
      educationPreferences: dto.educationPreferences?.map((value) => value.trim()).filter(Boolean),
      languagePreferences: dto.languagePreferences?.map((value) => value.trim()).filter(Boolean),
    };
    const preference = await this.prisma.partnerPreference.upsert({
      where: { profileId: profile.id },
      create: {
        profileId: profile.id,
        ...data,
        preferredCities: data.preferredCities ?? [],
        acceptedMaritalStatuses: dto.acceptedMaritalStatuses ?? [],
        educationPreferences: data.educationPreferences ?? [],
        languagePreferences: data.languagePreferences ?? [],
      },
      update: data,
    });
    return { preference };
  }

  async publish(userId: string) {
    const profile = await this.prisma.profile.findUnique({ where: { userId }, include: { user: true } });
    if (!profile) throw new NotFoundException('Complete your profile before publishing it.');
    if (!profile.displayName || !profile.gender || !profile.maritalStatus || !profile.user.dateOfBirth || ageOn(profile.user.dateOfBirth) < 18) {
      throw new BadRequestException('Your profile is missing required adult eligibility or basic details.');
    }
    const updated = await this.prisma.profile.update({ where: { id: profile.id }, data: { profileVisible: true }, select: profileSelect });
    return { profile: updated, message: 'Your profile is now visible to eligible members.' };
  }

  async unpublish(userId: string) {
    const profile = await this.prisma.profile.update({ where: { userId }, data: { profileVisible: false }, select: profileSelect });
    return { profile, message: 'Your profile is hidden from discovery.' };
  }

  async discover(userId: string, filters: { city?: string; maritalStatus?: MaritalStatus; minAge?: number; maxAge?: number; take?: number }) {
    const own = await this.prisma.profile.findUnique({ where: { userId }, select: { id: true, preference: true } });
    if (!own) throw new BadRequestException('Create your profile to discover matches.');
    if (filters.city != null && (!filters.city.trim() || filters.city.length > 100)) {
      throw new BadRequestException('City filter must contain 1 to 100 characters.');
    }
    for (const value of [filters.minAge, filters.maxAge]) {
      if (value != null && (!Number.isInteger(value) || value < 18 || value > 99)) throw new BadRequestException('Age filters must be whole numbers from 18 to 99.');
    }
    if (filters.minAge != null && filters.maxAge != null && filters.minAge > filters.maxAge) throw new BadRequestException('Minimum age cannot exceed maximum age.');
    const take = filters.take ?? 20;
    if (!Number.isInteger(take) || take < 1 || take > 50) throw new BadRequestException('Page size must be a whole number from 1 to 50.');
    const minAge = filters.minAge ?? own.preference?.minAge ?? undefined;
    const maxAge = filters.maxAge ?? own.preference?.maxAge ?? undefined;
    const statuses = filters.maritalStatus ? [filters.maritalStatus] : (own.preference?.acceptedMaritalStatuses.length ? own.preference.acceptedMaritalStatuses : undefined);
    const cityFilter = filters.city?.trim();
    const cities = cityFilter ? [cityFilter] : (own.preference?.preferredCities.length ? own.preference.preferredCities : undefined);
    const educationPreferences = own.preference?.educationPreferences.length ? own.preference.educationPreferences : undefined;
    const languagePreferences = own.preference?.languagePreferences.length ? own.preference.languagePreferences : undefined;
    const blocked = await this.prisma.block.findMany({ where: { OR: [{ blockerId: userId }, { blockedId: userId }] }, select: { blockerId: true, blockedId: true } });
    const excluded = new Set<string>([userId]);
    for (const b of blocked) { excluded.add(b.blockerId); excluded.add(b.blockedId); }
    const users = await this.prisma.user.findMany({
      where: { id: { notIn: [...excluded] }, status: 'ACTIVE', dateOfBirth: { not: null }, profile: {
        is: {
          profileVisible: true,
          ...(cities ? { OR: cities.map((city) => ({ city: { contains: city, mode: 'insensitive' as const } })) } : {}),
          ...(statuses ? { maritalStatus: { in: statuses } } : {}),
          ...(educationPreferences ? { education: { in: educationPreferences, mode: 'insensitive' as const } } : {}),
          ...(languagePreferences ? { languages: { hasSome: languagePreferences } } : {}),
          ...(own.preference?.openToPartnerWithChildren === false ? { hasChildren: false } : {}),
        },
      } },
      select: { id: true, dateOfBirth: true, profile: { select: publicProfileSelect }, verificationCases: { where: { type: 'MARITAL_STATUS' }, orderBy: { submittedAt: 'desc' }, take: 1, select: { status: true, claimedMaritalStatus: true } } }, take, orderBy: { createdAt: 'desc' },
    });
    const today = new Date();
    return { profiles: users.filter((u) => {
      if (!u.dateOfBirth || ageOn(u.dateOfBirth, today) < 18) return false;
      const age = ageOn(u.dateOfBirth, today);
      return (minAge == null || age >= minAge) && (maxAge == null || age <= maxAge);
    }).map((u) => {
      const latestMaritalReview = u.verificationCases[0];
      const maritalStatusVerified = latestMaritalReview?.status === 'APPROVED' && latestMaritalReview.claimedMaritalStatus === u.profile?.maritalStatus;
      return { ...u.profile, age: ageOn(u.dateOfBirth!, today), maritalStatusVerification: maritalStatusVerified ? 'VERIFIED' : 'NOT_VERIFIED' };
    }) };
  }
}
