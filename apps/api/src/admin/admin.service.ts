import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { AdminActionType, DirectMessageRequestStatus, PlatformRole, Prisma, UserReportStatus, UserStatus } from "@omochat/db";
import { resolveUserAccess } from "../access/access.utils";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { PrismaService } from "../prisma/prisma.service";
import { AdminStatusState, ListAdminStatusesQueryDto } from "./dto/list-admin-statuses-query.dto";
import { ListAdminUsersQueryDto } from "./dto/list-admin-users-query.dto";
import { UpdateAdminUserRolesDto } from "./dto/update-admin-user-roles.dto";
import { UpdateAdminUserStatusDto } from "./dto/update-admin-user-status.dto";

const adminUserSelect = {
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
  },
  _count: {
    select: {
      participants: true,
      reportsReceived: true,
      reportsFiled: true
    }
  },
  adminActionsReceived: {
    select: {
      id: true,
      type: true,
      note: true,
      createdAt: true,
      actorUser: {
        select: {
          id: true,
          username: true,
          userCode: true,
          displayName: true,
          avatarUrl: true,
          email: true
        }
      }
    },
    orderBy: { createdAt: "desc" },
    take: 1
  }
} as const;

const adminActionPreviewSelect = {
  id: true,
  type: true,
  note: true,
  createdAt: true,
  actorUser: {
    select: {
      id: true,
      username: true,
      userCode: true,
      displayName: true,
      avatarUrl: true,
      email: true
    }
  }
} as const;

const adminActionSelect = {
  id: true,
  type: true,
  note: true,
  createdAt: true,
  actorUser: {
    select: {
      id: true,
      username: true,
      userCode: true,
      displayName: true,
      avatarUrl: true,
      email: true
    }
  },
  targetUser: {
    select: {
      id: true,
      username: true,
      userCode: true,
      displayName: true,
      avatarUrl: true,
      email: true
    }
  }
} as const;

const adminStatusSelect = {
  id: true,
  type: true,
  text: true,
  caption: true,
  createdAt: true,
  expiresAt: true,
  removedAt: true,
  removedReason: true,
  mediaProvider: true,
  mediaBucket: true,
  mediaStorageKey: true,
  mediaUrl: true,
  mediaMimeType: true,
  mediaSizeBytes: true,
  mediaWidth: true,
  mediaHeight: true,
  mediaDurationMs: true,
  mediaChecksum: true,
  user: {
    select: {
      id: true,
      email: true,
      username: true,
      userCode: true,
      displayName: true,
      avatarUrl: true,
      phoneNumber: true
    }
  },
  _count: {
    select: {
      views: true,
      reactions: true,
      comments: true
    }
  }
} as const;

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  assertPlatformAdmin(user: AuthenticatedUser) {
    const access = resolveUserAccess(user);
    if (access.isPlatformAdmin || access.isSiteAdmin) {
      return;
    }

    throw new ForbiddenException("You do not have platform admin access.");
  }

  assertSiteAdmin(user: AuthenticatedUser) {
    if (resolveUserAccess(user).isSiteAdmin) {
      return;
    }

    throw new ForbiddenException("You do not have site admin access.");
  }

  async getOverview(user: AuthenticatedUser) {
    this.assertSiteAdmin(user);

    const [totalUsers, activeUsers, suspendedUsers, openReports, totalConversations, pendingRequests, siteAdmins, platformAdmins, moderators] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
        this.prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
        this.prisma.userReport.count({ where: { status: UserReportStatus.OPEN } }),
        this.prisma.conversation.count(),
        this.prisma.directMessageRequest.count({ where: { status: DirectMessageRequestStatus.PENDING } }),
        this.prisma.userPlatformRole.count({ where: { role: PlatformRole.SITE_ADMIN } }),
        this.prisma.userPlatformRole.count({ where: { role: PlatformRole.PLATFORM_ADMIN } }),
        this.prisma.userPlatformRole.count({ where: { role: PlatformRole.MODERATOR } })
      ]);

    return {
      totalUsers,
      activeUsers,
      suspendedUsers,
      openReports,
      totalConversations,
      pendingRequests,
      siteAdmins,
      platformAdmins,
      moderators
    };
  }

  async listRecentActions(user: AuthenticatedUser) {
    this.assertSiteAdmin(user);

    const items = await this.prisma.userAdminAction.findMany({
      select: adminActionSelect,
      orderBy: [{ createdAt: "desc" }],
      take: 12
    });

    return items.map((item) => this.toAdminAction(item));
  }

  async listUsers(user: AuthenticatedUser, query: ListAdminUsersQueryDto) {
    this.assertSiteAdmin(user);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const normalizedQuery = query.q?.trim();
    const normalizedPhone = normalizedQuery?.replace(/[^\d+]/g, "") ?? "";
    const where: Prisma.UserWhereInput = {
      ...(query.status ? { status: query.status } : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { email: { contains: normalizedQuery, mode: "insensitive" } },
              { username: { contains: normalizedQuery, mode: "insensitive" } },
              { userCode: { contains: normalizedQuery.replace(/^@/, ""), mode: "insensitive" } },
              { displayName: { contains: normalizedQuery, mode: "insensitive" } },
              ...(normalizedPhone.length >= 4
                ? [{ phoneNumber: { contains: normalizedPhone, mode: "insensitive" as const } }]
                : [])
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        where,
        select: adminUserSelect,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.user.count({ where })
    ]);

    return {
      items: items.map((item) => this.toAdminUser(item)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async listStatuses(user: AuthenticatedUser, query: ListAdminStatusesQueryDto) {
    this.assertSiteAdmin(user);

    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 12;
    const normalizedQuery = query.q?.trim();
    const normalizedPhone = normalizedQuery?.replace(/[^\d+]/g, "") ?? "";
    const now = new Date();

    const where: Prisma.UserStatusPostWhereInput = {
      ...(query.state === AdminStatusState.LIVE
        ? {
            removedAt: null,
            expiresAt: { gt: now }
          }
        : query.state === AdminStatusState.REMOVED
          ? {
              removedAt: { not: null }
            }
          : query.state === AdminStatusState.EXPIRED
            ? {
                removedAt: null,
                expiresAt: { lte: now }
              }
            : {}),
      ...(normalizedQuery
        ? {
            OR: [
              { text: { contains: normalizedQuery, mode: "insensitive" } },
              { caption: { contains: normalizedQuery, mode: "insensitive" } },
              { mediaStorageKey: { contains: normalizedQuery, mode: "insensitive" } },
              {
                user: {
                  OR: [
                    { email: { contains: normalizedQuery, mode: "insensitive" } },
                    { username: { contains: normalizedQuery, mode: "insensitive" } },
                    { userCode: { contains: normalizedQuery.replace(/^@/, ""), mode: "insensitive" } },
                    { displayName: { contains: normalizedQuery, mode: "insensitive" } },
                    ...(normalizedPhone.length >= 4
                      ? [{ phoneNumber: { contains: normalizedPhone, mode: "insensitive" as const } }]
                      : [])
                  ]
                }
              }
            ]
          }
        : {})
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.userStatusPost.findMany({
        where,
        select: adminStatusSelect,
        orderBy: [{ createdAt: "desc" }],
        skip: (page - 1) * pageSize,
        take: pageSize
      }),
      this.prisma.userStatusPost.count({ where })
    ]);

    return {
      items: items.map((item) => this.toAdminStatus(item)),
      total,
      page,
      pageSize,
      totalPages: Math.max(1, Math.ceil(total / pageSize))
    };
  }

  async updateUserStatus(user: AuthenticatedUser, targetUserId: string, input: UpdateAdminUserStatusDto) {
    this.assertSiteAdmin(user);

    if (![UserStatus.ACTIVE, UserStatus.SUSPENDED].includes(input.status)) {
      throw new BadRequestException("Only ACTIVE and SUSPENDED are supported here.");
    }

    if (user.id === targetUserId && input.status === UserStatus.SUSPENDED) {
      throw new BadRequestException("You cannot suspend your own access.");
    }

    const note = this.normalizeNote(input.note);
    if (input.status === UserStatus.SUSPENDED && !note) {
      throw new BadRequestException("A suspension note is required before access can be paused.");
    }

    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: { id: true, status: true }
    });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const nextUser = await tx.user.update({
        where: { id: targetUserId },
        data: {
          status: input.status
        },
        select: adminUserSelect
      });

      await tx.userAdminAction.create({
        data: {
          actorUserId: user.id,
          targetUserId,
          type: input.status === UserStatus.SUSPENDED ? AdminActionType.USER_SUSPENDED : AdminActionType.USER_RESTORED,
          note:
            note ??
            (input.status === UserStatus.SUSPENDED
              ? "Access was suspended by a site admin."
              : existing.status === UserStatus.SUSPENDED
                ? "Access was restored by a site admin."
                : "Account status was confirmed active by a site admin.")
        }
      });

      return nextUser;
    });

    return this.toAdminUser(updated);
  }

  async updateUserRoles(user: AuthenticatedUser, targetUserId: string, input: UpdateAdminUserRolesDto) {
    this.assertSiteAdmin(user);

    const uniqueRoles = [...new Set(input.roles)];
    const existing = await this.prisma.user.findUnique({
      where: { id: targetUserId },
      select: {
        id: true,
        platformRoles: {
          select: {
            role: true
          }
        }
      }
    });

    if (!existing) {
      throw new NotFoundException("User not found.");
    }

    if (user.id === targetUserId && !uniqueRoles.includes(PlatformRole.SITE_ADMIN)) {
      throw new BadRequestException("You cannot remove your own site admin access here.");
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.userPlatformRole.deleteMany({
        where: {
          userId: targetUserId,
          role: {
            notIn: uniqueRoles
          }
        }
      });

      if (uniqueRoles.length) {
        await tx.userPlatformRole.createMany({
          data: uniqueRoles.map((role) => ({
            userId: targetUserId,
            role,
            assignedByUserId: user.id
          })),
          skipDuplicates: true
        });
      }

      await tx.userAdminAction.create({
        data: {
          actorUserId: user.id,
          targetUserId,
          type: AdminActionType.USER_ROLE_UPDATED,
          note: uniqueRoles.length
            ? `Role access updated to ${uniqueRoles.map((role) => this.formatRoleLabel(role)).join(", ")}.`
            : "All elevated platform roles were removed."
        }
      });

      return tx.user.findUniqueOrThrow({
        where: { id: targetUserId },
        select: adminUserSelect
      });
    });
    return this.toAdminUser(updated);
  }

  private toAdminUser(user: Prisma.UserGetPayload<{ select: typeof adminUserSelect }>) {
    const latestAdminAction = user.adminActionsReceived[0] ? this.toAdminActionPreview(user.adminActionsReceived[0]) : null;

    return {
      id: user.id,
      email: user.email,
      username: user.username,
      userCode: user.userCode,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      statusMessage: user.statusMessage,
      bio: user.bio,
      addressLine1: user.addressLine1,
      city: user.city,
      stateRegion: user.stateRegion,
      countryCode: user.countryCode,
      latitude: user.latitude,
      longitude: user.longitude,
      phoneNumber: user.phoneNumber,
      phoneVerifiedAt: user.phoneVerifiedAt,
      dmPolicy: user.dmPolicy,
      status: user.status,
      lastSeenAt: user.lastSeenAt,
      createdAt: user.createdAt,
      access: resolveUserAccess(user),
      latestAdminAction,
      counts: {
        conversations: user._count.participants,
        reportsReceived: user._count.reportsReceived,
        reportsFiled: user._count.reportsFiled
      }
    };
  }

  private toAdminAction(action: Prisma.UserAdminActionGetPayload<{ select: typeof adminActionSelect }>) {
    return {
      id: action.id,
      type: action.type,
      note: action.note,
      createdAt: action.createdAt,
      actorUser: action.actorUser,
      targetUser: action.targetUser
    };
  }

  private toAdminActionPreview(action: Prisma.UserAdminActionGetPayload<{ select: typeof adminActionPreviewSelect }>) {
    return {
      id: action.id,
      type: action.type,
      note: action.note,
      createdAt: action.createdAt,
      actorUser: action.actorUser
    };
  }

  private normalizeNote(note?: string | null) {
    const normalized = note?.trim();
    return normalized ? normalized : null;
  }

  private toAdminStatus(status: Prisma.UserStatusPostGetPayload<{ select: typeof adminStatusSelect }>) {
    return {
      id: status.id,
      type: status.type,
      text: status.text,
      caption: status.caption,
      createdAt: status.createdAt,
      expiresAt: status.expiresAt,
      removedAt: status.removedAt,
      removedReason: status.removedReason,
      owner: status.user,
      media:
        status.mediaProvider &&
        status.mediaStorageKey &&
        status.mediaUrl &&
        status.mediaMimeType &&
        status.mediaSizeBytes
          ? {
              provider: status.mediaProvider,
              bucket: status.mediaBucket ?? null,
              storageKey: status.mediaStorageKey,
              url: status.mediaUrl,
              mimeType: status.mediaMimeType,
              sizeBytes: status.mediaSizeBytes,
              width: status.mediaWidth ?? null,
              height: status.mediaHeight ?? null,
              durationMs: status.mediaDurationMs ?? null,
              checksum: status.mediaChecksum ?? null
            }
          : null,
      counts: {
        views: status._count.views,
        reactions: status._count.reactions,
        comments: status._count.comments
      }
    };
  }

  private formatRoleLabel(role: PlatformRole) {
    switch (role) {
      case PlatformRole.SITE_ADMIN:
        return "site admin";
      case PlatformRole.PLATFORM_ADMIN:
        return "platform admin";
      case PlatformRole.MODERATOR:
        return "moderator";
    }
  }
}
