import { Module } from "@nestjs/common";
import { BootstrapSiteAdminsService } from "./admin/bootstrap-site-admins.service";
import { AdminController } from "./admin/admin.controller";
import { AdminService } from "./admin/admin.service";
import { AuthModule } from "./auth/auth.module";
import { CallsController } from "./calls/calls.controller";
import { CallsService } from "./calls/calls.service";
import { HealthController } from "./health.controller";
import { ChatGateway } from "./chat/chat.gateway";
import { ConversationsController } from "./conversations/conversations.controller";
import { ConversationsService } from "./conversations/conversations.service";
import { MailModule } from "./mail/mail.module";
import { MessageRequestsController } from "./message-requests/message-requests.controller";
import { MessageRequestsService } from "./message-requests/message-requests.service";
import { MessagesController } from "./messages/messages.controller";
import { MessagesService } from "./messages/messages.service";
import { NotificationsController } from "./notifications/notifications.controller";
import { NotificationsService } from "./notifications/notifications.service";
import { PushNotificationsService } from "./notifications/push-notifications.service";
import { PrismaModule } from "./prisma/prisma.module";
import { SafetyController } from "./safety/safety.controller";
import { SafetyService } from "./safety/safety.service";
import { StatusesController } from "./statuses/statuses.controller";
import { StatusesService } from "./statuses/statuses.service";
import { UsersModule } from "./users/users.module";

@Module({
  imports: [PrismaModule, MailModule, AuthModule, UsersModule],
  controllers: [
    HealthController,
    AdminController,
    CallsController,
    ConversationsController,
    MessagesController,
    MessageRequestsController,
    NotificationsController,
    SafetyController,
    StatusesController
  ],
  providers: [
    CallsService,
    AdminService,
    BootstrapSiteAdminsService,
    ConversationsService,
    MessagesService,
    MessageRequestsService,
    NotificationsService,
    PushNotificationsService,
    SafetyService,
    StatusesService,
    ChatGateway
  ]
})
export class AppModule {}
