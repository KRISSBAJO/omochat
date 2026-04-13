import { ForbiddenException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@omochat/db";
import { PrismaService } from "../prisma/prisma.service";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";

const notificationInclude = {
  message: {
    select: {
      id: true,
      conversationId: true,
      body: true
    }
  }
} satisfies Prisma.NotificationInclude;

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, query: ListNotificationsQueryDto = {}) {
    const where: Prisma.NotificationWhereInput = {
      userId,
      ...(query.unreadOnly ? { readAt: null } : {})
    };

    const [items, unreadCount] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        include: notificationInclude,
        orderBy: [{ createdAt: "desc" }],
        take: query.limit ?? 40
      }),
      this.prisma.notification.count({
        where: {
          userId,
          readAt: null
        }
      })
    ]);

    return {
      items,
      unreadCount
    };
  }

  async markRead(notificationId: string, userId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      include: notificationInclude
    });

    if (!notification) {
      throw new NotFoundException("Notification not found.");
    }

    if (notification.userId !== userId) {
      throw new ForbiddenException("You cannot update this notification.");
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: {
        status: "READ",
        readAt: new Date()
      },
      include: notificationInclude
    });
  }

  async markAllRead(userId: string) {
    await this.prisma.notification.updateMany({
      where: {
        userId,
        readAt: null
      },
      data: {
        status: "READ",
        readAt: new Date()
      }
    });

    return { ok: true };
  }
}
