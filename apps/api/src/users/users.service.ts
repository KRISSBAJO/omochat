import { Injectable } from "@nestjs/common";
import { resolveUserAccess } from "../access/access.utils";
import { PrismaService } from "../prisma/prisma.service";
import { UpdateMeDto } from "./dto/update-me.dto";

const publicUserSelect = {
  id: true,
  email: true,
  username: true,
  userCode: true,
  displayName: true,
  avatarUrl: true,
  statusMessage: true,
  bio: true,
  addressLine1: true,
  city: true,
  stateRegion: true,
  countryCode: true,
  latitude: true,
  longitude: true,
  phoneNumber: true,
  phoneVerifiedAt: true,
  dmPolicy: true,
  status: true,
  lastSeenAt: true,
  createdAt: true,
  platformRoles: {
    select: {
      role: true
    }
  }
} as const;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getMe(userId: string) {
    const user = await this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: publicUserSelect
    });

    return {
      ...user,
      access: resolveUserAccess(user)
    };
  }

  async updateMe(userId: string, input: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        displayName: input.displayName?.trim(),
        avatarUrl: this.normalizeNullable(input.avatarUrl),
        statusMessage: this.normalizeNullable(input.statusMessage),
        bio: this.normalizeNullable(input.bio),
        addressLine1: this.normalizeNullable(input.addressLine1),
        city: this.normalizeNullable(input.city),
        stateRegion: this.normalizeNullable(input.stateRegion),
        countryCode: input.countryCode ? input.countryCode.trim().toUpperCase() : undefined,
        latitude: input.latitude,
        longitude: input.longitude,
        dmPolicy: input.dmPolicy
      },
      select: publicUserSelect
    });

    return {
      ...user,
      access: resolveUserAccess(user)
    };
  }

  search(query: string, currentUserId: string) {
    const normalized = query.trim().toLowerCase();
    const normalizedPhone = query.replace(/[^\d+]/g, "");
    if (normalized.length < 2) {
      return [];
    }

    return this.prisma.user
      .findMany({
        where: {
          id: { not: currentUserId },
          status: "ACTIVE",
          NOT: {
            OR: [
              {
                blocksReceived: {
                  some: {
                    blockerUserId: currentUserId
                  }
                }
              },
              {
                blocksInitiated: {
                  some: {
                    blockedUserId: currentUserId
                  }
                }
              }
            ]
          },
          OR: [
            { username: { contains: normalized, mode: "insensitive" } },
            { userCode: { contains: normalized.replace(/^@/, ""), mode: "insensitive" } },
            { email: { contains: normalized, mode: "insensitive" } },
            { displayName: { contains: query.trim(), mode: "insensitive" } },
            ...(normalizedPhone.length >= 8
              ? [{ phoneNumber: { contains: normalizedPhone, mode: "insensitive" as const } }]
              : [])
          ]
        },
        select: {
          id: true,
          username: true,
          userCode: true,
          displayName: true,
          avatarUrl: true,
          lastSeenAt: true,
          dmPolicy: true,
          phoneNumber: true,
          phoneVerifiedAt: true
        },
        orderBy: [{ username: "asc" }],
        take: 20
      })
      .then((users) =>
        users.map((user) => ({
          id: user.id,
          username: user.username,
          userCode: user.userCode,
          displayName: user.displayName,
          avatarUrl: user.avatarUrl,
          lastSeenAt: user.lastSeenAt,
          dmPolicy: user.dmPolicy,
          phoneVerifiedAt: user.phoneVerifiedAt,
          phoneNumberMasked: user.phoneVerifiedAt ? this.maskPhoneNumber(user.phoneNumber) : null
        }))
      );
  }

  private maskPhoneNumber(phoneNumber: string | null) {
    if (!phoneNumber) {
      return null;
    }

    if (phoneNumber.length <= 4) {
      return phoneNumber;
    }

    return `${phoneNumber.slice(0, 3)}****${phoneNumber.slice(-2)}`;
  }

  private normalizeNullable(value?: string | null) {
    if (value === undefined) {
      return undefined;
    }

    const normalized = value?.trim();
    return normalized ? normalized : null;
  }
}
