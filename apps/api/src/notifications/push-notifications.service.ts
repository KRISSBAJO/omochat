import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import webpush from "web-push";

type PushPayload = {
  body: string;
  tag?: string;
  title: string;
  url?: string;
};

@Injectable()
export class PushNotificationsService {
  private vapidConfigured = false;

  constructor(private readonly prisma: PrismaService) {}

  async upsertSubscription(
    userId: string,
    input: {
      endpoint: string;
      keys: {
        auth: string;
        p256dh: string;
      };
      userAgent?: string;
    }
  ) {
    return this.prisma.pushSubscription.upsert({
      where: {
        endpoint: input.endpoint
      },
      update: {
        userId,
        auth: input.keys.auth,
        p256dh: input.keys.p256dh,
        userAgent: input.userAgent?.trim() || null,
        lastUsedAt: new Date()
      },
      create: {
        userId,
        endpoint: input.endpoint,
        auth: input.keys.auth,
        p256dh: input.keys.p256dh,
        userAgent: input.userAgent?.trim() || null,
        lastUsedAt: new Date()
      }
    });
  }

  async removeSubscription(userId: string, endpoint: string) {
    await this.prisma.pushSubscription.deleteMany({
      where: {
        endpoint,
        userId
      }
    });

    return { ok: true };
  }

  async upsertMobilePushToken(
    userId: string,
    input: {
      pushToken: string;
      platform: string;
      installationId: string;
      deviceLabel?: string;
    }
  ) {
    const pushToken = input.pushToken.trim();
    const platform = input.platform.trim().toLowerCase();
    const installationId = input.installationId.trim();
    const label = input.deviceLabel?.trim() || null;

    await this.prisma.device.updateMany({
      where: {
        pushToken,
        userId: {
          not: userId
        }
      },
      data: {
        pushToken: null
      }
    });

    const existing = await this.prisma.device.findFirst({
      where: {
        userId,
        OR: [
          { publicKey: installationId },
          { pushToken }
        ]
      },
      orderBy: [{ updatedAt: "desc" }],
      select: { id: true }
    });

    const device = existing
      ? await this.prisma.device.update({
          where: { id: existing.id },
          data: {
            label,
            lastSeenAt: new Date(),
            platform,
            publicKey: installationId,
            pushToken
          }
        })
      : await this.prisma.device.create({
          data: {
            label,
            lastSeenAt: new Date(),
            platform,
            publicKey: installationId,
            pushToken,
            userId
          }
        });

    return {
      id: device.id,
      platform: device.platform,
      pushToken: device.pushToken
    };
  }

  async removeMobilePushToken(
    userId: string,
    input: {
      pushToken?: string;
      installationId?: string;
    }
  ) {
    const pushToken = input.pushToken?.trim();
    const installationId = input.installationId?.trim();

    if (!pushToken && !installationId) {
      return { ok: true };
    }

    await this.prisma.device.updateMany({
      where: {
        userId,
        ...(installationId || pushToken
          ? {
              OR: [
                ...(installationId ? [{ publicKey: installationId }] : []),
                ...(pushToken ? [{ pushToken }] : [])
              ]
            }
          : {})
      },
      data: {
        pushToken: null
      }
    });

    return { ok: true };
  }

  async notifyUsers(userIds: string[], payload: PushPayload) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return;
    }

    const [subscriptions, devices] = await Promise.all([
      this.prisma.pushSubscription.findMany({
        where: {
          userId: {
            in: uniqueUserIds
          }
        }
      }),
      this.prisma.device.findMany({
        where: {
          userId: {
            in: uniqueUserIds
          },
          pushToken: {
            not: null
          }
        },
        select: {
          id: true,
          pushToken: true
        }
      })
    ]);

    const tasks: Promise<unknown>[] = [];

    if (subscriptions.length > 0 && this.ensureVapidConfigured()) {
      const encodedPayload = JSON.stringify({
        body: payload.body,
        tag: payload.tag ?? "omochat-alert",
        title: payload.title,
        url: payload.url ?? "/"
      });

      tasks.push(
        Promise.all(
          subscriptions.map(async (subscription) => {
            try {
              await webpush.sendNotification(
                {
                  endpoint: subscription.endpoint,
                  keys: {
                    auth: subscription.auth,
                    p256dh: subscription.p256dh
                  }
                },
                encodedPayload
              );

              await this.prisma.pushSubscription.update({
                where: { endpoint: subscription.endpoint },
                data: {
                  lastUsedAt: new Date()
                }
              });
            } catch (error) {
              const statusCode =
                typeof error === "object" && error && "statusCode" in error ? Number((error as { statusCode?: unknown }).statusCode) : null;

              if (statusCode === 404 || statusCode === 410) {
                await this.prisma.pushSubscription.deleteMany({
                  where: {
                    endpoint: subscription.endpoint
                  }
                });
              }
            }
          })
        )
      );
    }

    if (devices.length > 0) {
      tasks.push(this.notifyExpoDevices(devices, payload));
    }

    await Promise.all(tasks);
  }

  private ensureVapidConfigured() {
    if (this.vapidConfigured) {
      return true;
    }

    const publicKey = process.env.WEB_PUSH_PUBLIC_KEY?.trim();
    const privateKey = process.env.WEB_PUSH_PRIVATE_KEY?.trim();
    const subject = process.env.WEB_PUSH_SUBJECT?.trim();

    if (!publicKey || !privateKey || !subject) {
      return false;
    }

    webpush.setVapidDetails(subject, publicKey, privateKey);
    this.vapidConfigured = true;
    return true;
  }

  private async notifyExpoDevices(
    devices: Array<{ id: string; pushToken: string | null }>,
    payload: PushPayload
  ) {
    const url = payload.url ?? "/";
    const deliveredAt = new Date();

    await Promise.all(
      devices
        .filter((device): device is { id: string; pushToken: string } => Boolean(device.pushToken))
        .map(async (device) => {
          try {
            const response = await fetch("https://exp.host/--/api/v2/push/send", {
              method: "POST",
              headers: {
                "Content-Type": "application/json"
              },
              body: JSON.stringify({
                to: device.pushToken,
                title: payload.title,
                body: payload.body,
                sound: "default",
                data: {
                  tag: payload.tag ?? "omochat-alert",
                  url
                }
              })
            });

            const body = await response.json().catch(() => null) as
              | {
                  data?: {
                    status?: string;
                    details?: {
                      error?: string;
                    };
                  };
                }
              | null;

            if (!response.ok || body?.data?.status === "error") {
              if (body?.data?.details?.error === "DeviceNotRegistered") {
                await this.prisma.device.updateMany({
                  where: {
                    id: device.id
                  },
                  data: {
                    pushToken: null
                  }
                });
              }
              return;
            }

            await this.prisma.device.update({
              where: { id: device.id },
              data: {
                lastSeenAt: deliveredAt
              }
            });
          } catch {
            return;
          }
        })
    );
  }
}
