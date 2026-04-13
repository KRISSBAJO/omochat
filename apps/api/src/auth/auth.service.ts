import { BadRequestException, ConflictException, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { DirectMessagePolicy, PlatformRole, Prisma, UserStatus } from "@omochat/db";
import bcrypt from "bcryptjs";
import { randomBytes, createHash } from "node:crypto";
import { resolveUserAccess } from "../access/access.utils";
import { MailService } from "../mail/mail.service";
import { PrismaService } from "../prisma/prisma.service";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { StartPhoneVerificationDto } from "./dto/start-phone-verification.dto";
import { VerifyPhoneDto } from "./dto/verify-phone.dto";

type AuthUser = {
  id: string;
  email: string;
  username: string;
  userCode: string | null;
  displayName: string;
  avatarUrl: string | null;
  statusMessage?: string | null;
  bio?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  countryCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  phoneNumber: string | null;
  phoneVerifiedAt: Date | null;
  dmPolicy: DirectMessagePolicy;
  status: UserStatus;
  platformRoles?: Array<{ role: PlatformRole }>;
};

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService
  ) {}

  async register(input: RegisterDto) {
    const email = input.email.toLowerCase().trim();
    const username = input.username.toLowerCase().trim();
    const existing = await this.prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }]
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException("Email or username is already registered");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    const user = await this.prisma.user.create({
      data: {
        email,
        username,
        userCode: await this.generateUniqueUserCode(),
        displayName: input.displayName.trim(),
        passwordHash,
        devices: {
          create: {
            label: input.deviceLabel,
            platform: input.platform ?? "web"
          }
        }
      },
      include: {
        devices: { orderBy: { createdAt: "desc" }, take: 1 },
        platformRoles: {
          select: {
            role: true
          }
        }
      }
    });

    return this.issueSession(user, user.devices[0]?.id);
  }

  async login(input: LoginDto) {
    const identifier = input.identifier.trim();
    const normalizedIdentifier = identifier.toLowerCase();
    const normalizedPhone = this.normalizePhoneNumberOrNull(identifier);
    const identityMatchers: Prisma.UserWhereInput[] = [
      { email: normalizedIdentifier },
      { username: normalizedIdentifier },
      { userCode: this.normalizeUserCode(normalizedIdentifier) }
    ];

    if (normalizedPhone) {
      identityMatchers.push({
        phoneNumber: normalizedPhone,
        phoneVerifiedAt: {
          not: null
        }
      });
    }

    let user = await this.prisma.user.findFirst({
      where: {
        OR: identityMatchers
      },
      include: {
        devices: { orderBy: { createdAt: "desc" }, take: 1 },
        platformRoles: {
          select: {
            role: true
          }
        }
      }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid credentials");
    }

    const passwordOk = await bcrypt.compare(input.password, user.passwordHash);
    if (!passwordOk) {
      throw new UnauthorizedException("Invalid credentials");
    }

    if (!user.userCode) {
      user = await this.prisma.user.update({
        where: { id: user.id },
        data: { userCode: await this.generateUniqueUserCode() },
        include: {
          devices: { orderBy: { createdAt: "desc" }, take: 1 },
          platformRoles: {
            select: {
              role: true
            }
          }
        }
      });
    }

    const device =
      user.devices[0] ??
      (await this.prisma.device.create({
        data: {
          userId: user.id,
          label: input.deviceLabel,
          platform: input.platform ?? "web"
        }
      }));

    return this.issueSession(user, device.id);
  }

  async startPhoneVerification(userId: string, input: StartPhoneVerificationDto) {
    const phoneNumber = this.normalizePhoneNumber(input.phoneNumber);
    await this.assertPhoneAvailableForUser(phoneNumber, userId);
    await this.sendTwilioVerification(phoneNumber);

    return {
      ok: true,
      phoneNumber
    };
  }

  async verifyPhoneNumber(userId: string, input: VerifyPhoneDto) {
    const phoneNumber = this.normalizePhoneNumber(input.phoneNumber);
    await this.assertPhoneAvailableForUser(phoneNumber, userId);
    const approved = await this.checkTwilioVerification(phoneNumber, input.code.trim());

    if (!approved) {
      throw new BadRequestException("That verification code is invalid or expired.");
    }

    const user = await this.prisma.user.update({
      where: { id: userId },
      data: {
        phoneNumber,
        phoneVerifiedAt: new Date()
      }
    });

    return {
      ok: true,
      user: this.toPublicUser(user)
    };
  }

  async refresh(refreshToken?: string) {
    if (!refreshToken) {
      throw new UnauthorizedException("Missing refresh token");
    }

    const tokenHash = this.hashRefreshToken(refreshToken);
    const stored = await this.prisma.refreshToken.findUnique({
      where: { tokenHash },
      include: {
        user: {
          include: {
            platformRoles: {
              select: {
                role: true
              }
            }
          }
        }
      }
    });

    if (!stored || stored.revokedAt || stored.expiresAt <= new Date() || stored.user.status !== UserStatus.ACTIVE) {
      throw new UnauthorizedException("Invalid refresh token");
    }

    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() }
    });

    return this.issueSession(stored.user, stored.deviceId ?? undefined);
  }

  async logout(refreshToken?: string) {
    if (!refreshToken) {
      return { ok: true };
    }

    await this.prisma.refreshToken.updateMany({
      where: {
        tokenHash: this.hashRefreshToken(refreshToken),
        revokedAt: null
      },
      data: { revokedAt: new Date() }
    });

    return { ok: true };
  }

  async forgotPassword(input: ForgotPasswordDto) {
    const email = input.email.toLowerCase().trim();
    const user = await this.prisma.user.findUnique({
      where: { email },
      select: { id: true, email: true, status: true }
    });

    if (!user || user.status !== UserStatus.ACTIVE) {
      return { ok: true };
    }

    const token = randomBytes(32).toString("base64url");
    await this.prisma.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: this.hashRefreshToken(token),
        expiresAt: new Date(Date.now() + 30 * 60 * 1000)
      }
    });

    const frontendUrl = process.env.FRONTEND_URL ?? "http://localhost:3001";
    const resetUrl = `${frontendUrl}/?resetToken=${encodeURIComponent(token)}`;
    await this.mail.sendPasswordResetEmail(user.email, resetUrl);

    return { ok: true };
  }

  async resetPassword(input: ResetPasswordDto) {
    const stored = await this.prisma.passwordResetToken.findUnique({
      where: { tokenHash: this.hashRefreshToken(input.token) }
    });

    if (!stored || stored.usedAt || stored.expiresAt <= new Date()) {
      throw new UnauthorizedException("Invalid or expired reset token");
    }

    const passwordHash = await bcrypt.hash(input.password, 12);
    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: stored.userId },
        data: { passwordHash }
      }),
      this.prisma.passwordResetToken.update({
        where: { id: stored.id },
        data: { usedAt: new Date() }
      }),
      this.prisma.refreshToken.updateMany({
        where: { userId: stored.userId, revokedAt: null },
        data: { revokedAt: new Date() }
      })
    ]);

    return { ok: true };
  }

  private async issueSession(user: AuthUser, deviceId?: string) {
    const hydratedUser = await this.ensureBootstrapPlatformRoles(user);
    const accessToken = await this.jwt.signAsync(
      {
        sub: hydratedUser.id,
        email: hydratedUser.email,
        username: hydratedUser.username,
        userCode: hydratedUser.userCode,
        displayName: hydratedUser.displayName,
        access: resolveUserAccess(hydratedUser)
      },
      {
        secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access",
        expiresIn: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 900)
      }
    );
    const refreshToken = randomBytes(48).toString("base64url");
    const refreshDays = Number(process.env.JWT_REFRESH_TTL_DAYS ?? 30);
    const refreshExpiresAt = new Date(Date.now() + refreshDays * 24 * 60 * 60 * 1000);

    await this.prisma.refreshToken.create({
      data: {
        userId: user.id,
        deviceId,
        tokenHash: this.hashRefreshToken(refreshToken),
        expiresAt: refreshExpiresAt
      }
    });

    return {
      accessToken,
      refreshToken,
      refreshExpiresAt,
      tokenType: "Bearer",
      user: this.toPublicUser(hydratedUser)
    };
  }

  private normalizeUserCode(value: string) {
    return value.startsWith("@") ? value.slice(1).toLowerCase() : value.toLowerCase();
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

    return randomBytes(4).toString("hex").slice(0, 6);
  }

  private hashRefreshToken(refreshToken: string) {
    return createHash("sha256").update(refreshToken).digest("hex");
  }

  private toPublicUser(user: AuthUser) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      userCode: user.userCode,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      statusMessage: user.statusMessage ?? null,
      bio: user.bio ?? null,
      addressLine1: user.addressLine1 ?? null,
      city: user.city ?? null,
      stateRegion: user.stateRegion ?? null,
      countryCode: user.countryCode ?? null,
      latitude: user.latitude ?? null,
      longitude: user.longitude ?? null,
      phoneNumber: user.phoneNumber,
      phoneVerifiedAt: user.phoneVerifiedAt,
      dmPolicy: user.dmPolicy,
      status: user.status,
      access: resolveUserAccess(user)
    };
  }

  private async ensureBootstrapPlatformRoles(user: AuthUser) {
    const access = resolveUserAccess(user);
    const assignedRoles = new Set((user.platformRoles ?? []).map((role) => role.role));
    const rolesToAssign: PlatformRole[] = [];

    if (access.isSiteAdmin && !assignedRoles.has(PlatformRole.SITE_ADMIN)) {
      rolesToAssign.push(PlatformRole.SITE_ADMIN);
    }

    if (access.isModerator && !access.isSiteAdmin && !access.isPlatformAdmin && !assignedRoles.has(PlatformRole.MODERATOR)) {
      rolesToAssign.push(PlatformRole.MODERATOR);
    }

    if (!rolesToAssign.length) {
      return user;
    }

    await this.prisma.userPlatformRole.createMany({
      data: rolesToAssign.map((role) => ({
        userId: user.id,
        role
      })),
      skipDuplicates: true
    });

    const refreshed = await this.prisma.user.findUniqueOrThrow({
      where: { id: user.id },
      select: {
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
        platformRoles: {
          select: {
            role: true
          }
        }
      }
    });

    return refreshed;
  }

  private async assertPhoneAvailableForUser(phoneNumber: string, userId: string) {
    const existing = await this.prisma.user.findFirst({
      where: {
        phoneNumber,
        id: { not: userId }
      },
      select: { id: true }
    });

    if (existing) {
      throw new ConflictException("That phone number is already attached to another account.");
    }
  }

  private normalizePhoneNumber(rawValue: string) {
    const normalized = rawValue.replace(/[^\d+]/g, "");

    if (!/^\+[1-9]\d{7,14}$/.test(normalized)) {
      throw new BadRequestException("Phone number must be in international format like +16155543592.");
    }

    return normalized;
  }

  private normalizePhoneNumberOrNull(rawValue: string) {
    const cleaned = rawValue.replace(/[^\d+]/g, "");
    if (!cleaned) {
      return null;
    }

    if (!/^\+?[0-9]{8,15}$/.test(cleaned)) {
      return null;
    }

    return cleaned.startsWith("+") ? this.normalizePhoneNumber(cleaned) : null;
  }

  private async sendTwilioVerification(phoneNumber: string) {
    const payload = await this.callTwilioVerify("Verifications", {
      To: phoneNumber,
      Channel: "sms"
    });

    if (payload.status !== "pending") {
      throw new BadRequestException("Twilio could not start verification for that phone number.");
    }
  }

  private async checkTwilioVerification(phoneNumber: string, code: string) {
    const payload = await this.callTwilioVerify("VerificationCheck", {
      To: phoneNumber,
      Code: code
    });

    return payload.status === "approved";
  }

  private async callTwilioVerify(path: "Verifications" | "VerificationCheck", body: Record<string, string>) {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

    if (!accountSid || !authToken || !serviceSid) {
      throw new BadRequestException("Phone verification is not configured yet.");
    }

    const response = await fetch(`https://verify.twilio.com/v2/Services/${serviceSid}/${path}`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString("base64")}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: new URLSearchParams(body)
    });

    const payload = (await response.json().catch(() => null)) as { message?: string; status?: string } | null;

    if (!response.ok) {
      throw new BadRequestException(payload?.message ?? "Twilio verification request failed.");
    }

    return payload ?? {};
  }
}
