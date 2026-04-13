import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from "@nestjs/common";
import { ApiBearerAuth, ApiOkResponse, ApiParam, ApiTags } from "@nestjs/swagger";
import { CurrentUser } from "../auth/current-user.decorator";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { AuthenticatedUser } from "../auth/types/authenticated-user";
import { RemovePushSubscriptionDto } from "./dto/remove-push-subscription.dto";
import { RemoveMobilePushTokenDto } from "./dto/remove-mobile-push-token.dto";
import { ListNotificationsQueryDto } from "./dto/list-notifications-query.dto";
import { UpsertMobilePushTokenDto } from "./dto/upsert-mobile-push-token.dto";
import { UpsertPushSubscriptionDto } from "./dto/upsert-push-subscription.dto";
import { NotificationsService } from "./notifications.service";
import { PushNotificationsService } from "./push-notifications.service";

@ApiTags("notifications")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("notifications")
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly pushNotifications: PushNotificationsService
  ) {}

  @Get()
  @ApiOkResponse({
    schema: {
      example: {
        unreadCount: 2,
        items: [
          {
            id: "31594924-4d62-40de-8ad4-dcbcf6226fe0",
            type: "MESSAGE_REQUEST",
            title: "New message request",
            body: "Mira Stone wants to start a private conversation with you.",
            status: "PENDING",
            contextId: "9f66844a-12ca-4d29-8fe8-22c4ea27287c",
            createdAt: "2026-04-11T15:00:00.000Z",
            readAt: null
          }
        ]
      }
    }
  })
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: ListNotificationsQueryDto) {
    return this.notifications.listForUser(user.id, query);
  }

  @Post(":notificationId/read")
  @ApiParam({ name: "notificationId", example: "31594924-4d62-40de-8ad4-dcbcf6226fe0" })
  markRead(@CurrentUser() user: AuthenticatedUser, @Param("notificationId") notificationId: string) {
    return this.notifications.markRead(notificationId, user.id);
  }

  @Post("read-all")
  markAllRead(@CurrentUser() user: AuthenticatedUser) {
    return this.notifications.markAllRead(user.id);
  }

  @Post("push-subscriptions")
  upsertPushSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertPushSubscriptionDto
  ) {
    return this.pushNotifications.upsertSubscription(user.id, body);
  }

  @Delete("push-subscriptions")
  removePushSubscription(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RemovePushSubscriptionDto
  ) {
    return this.pushNotifications.removeSubscription(user.id, body.endpoint);
  }

  @Post("mobile-push-token")
  upsertMobilePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: UpsertMobilePushTokenDto
  ) {
    return this.pushNotifications.upsertMobilePushToken(user.id, body);
  }

  @Delete("mobile-push-token")
  removeMobilePushToken(
    @CurrentUser() user: AuthenticatedUser,
    @Body() body: RemoveMobilePushTokenDto
  ) {
    return this.pushNotifications.removeMobilePushToken(user.id, body);
  }
}
