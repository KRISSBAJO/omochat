import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { PlatformRole, UserStatus } from "@omochat/db";
import bcrypt from "bcryptjs";
import { PrismaService } from "../prisma/prisma.service";

type BootstrapIdentity = {
  email: string;
  username: string;
};

@Injectable()
export class BootstrapSiteAdminsService implements OnModuleInit {
  private readonly logger = new Logger(BootstrapSiteAdminsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onModuleInit() {
    const identities = this.resolveBootstrapSiteAdmins();

    if (!identities.length) {
      return;
    }

    const password = process.env.SITE_ADMIN_BOOTSTRAP_PASSWORD?.trim() || "Abiodun@1";
    const passwordHash = await bcrypt.hash(password, 12);

    for (const identity of identities) {
      await this.ensureSiteAdmin(identity, passwordHash);
    }
  }

  private async ensureSiteAdmin(identity: BootstrapIdentity, passwordHash: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email: identity.email }, { username: identity.username }]
      },
      select: {
        id: true,
        email: true,
        username: true,
        displayName: true,
        status: true,
        platformRoles: {
          select: {
            role: true
          }
        }
      }
    });

    if (!existing) {
      const created = await this.prisma.user.create({
        data: {
          email: identity.email,
          username: identity.username,
          displayName: this.toDisplayName(identity.username, identity.email),
          passwordHash,
          status: UserStatus.ACTIVE,
          userCode: await this.generateUniqueUserCode(),
          statusMessage: "Site admin access ready",
          platformRoles: {
            create: {
              role: PlatformRole.SITE_ADMIN
            }
          }
        },
        select: {
          id: true
        }
      });

      this.logger.log(`Bootstrapped site admin account for ${identity.email} (${created.id}).`);
      return;
    }

    if (!existing.platformRoles.some((role) => role.role === PlatformRole.SITE_ADMIN)) {
      await this.prisma.userPlatformRole.create({
        data: {
          userId: existing.id,
          role: PlatformRole.SITE_ADMIN
        }
      });
      this.logger.log(`Granted SITE_ADMIN to existing account ${identity.email}.`);
    }
  }

  private resolveBootstrapSiteAdmins() {
    const emails = this.parseList(process.env.SITE_ADMIN_EMAILS);
    const usernames = this.parseList(process.env.SITE_ADMIN_USERNAMES);
    const total = Math.max(emails.length, usernames.length);
    const identities = new Map<string, BootstrapIdentity>();

    for (let index = 0; index < total; index += 1) {
      const email = emails[index];
      const username = usernames[index] || (email ? this.usernameFromEmail(email) : "");

      if (!email || !username) {
        continue;
      }

      identities.set(email, {
        email,
        username
      });
    }

    return [...identities.values()];
  }

  private parseList(input?: string) {
    return (input ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean);
  }

  private usernameFromEmail(email: string) {
    return email.split("@")[0]?.replace(/[^a-z0-9._-]/gi, "").toLowerCase() ?? "";
  }

  private toDisplayName(username: string, email: string) {
    const base = username || this.usernameFromEmail(email);
    const parts = base
      .split(/[._-]+/)
      .map((part) => part.trim())
      .filter(Boolean);

    if (!parts.length) {
      return email.split("@")[0] || "Site Admin";
    }

    return parts.map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(" ");
  }

  private async generateUniqueUserCode() {
    const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";

    for (let attempt = 0; attempt < 20; attempt += 1) {
      let candidate = "";
      for (let index = 0; index < 5; index += 1) {
        candidate += alphabet[Math.floor(Math.random() * alphabet.length)];
      }

      const existing = await this.prisma.user.findUnique({
        where: { userCode: candidate },
        select: { id: true }
      });

      if (!existing) {
        return candidate;
      }
    }

    return `adm${Date.now().toString(36).slice(-5)}`;
  }
}
