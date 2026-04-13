import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { UserStatus } from "@omochat/db";
import { Request } from "express";
import { resolveUserAccess } from "../access/access.utils";
import { PrismaService } from "../prisma/prisma.service";
import { AuthenticatedUser } from "./types/authenticated-user";

type AccessTokenPayload = AuthenticatedUser & {
  sub: string;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { user?: AuthenticatedUser }>();
    const token = this.getBearerToken(request);

    if (!token) {
      throw new UnauthorizedException("Missing bearer token");
    }

    try {
      const payload = await this.jwt.verifyAsync<AccessTokenPayload>(token, {
        secret: process.env.JWT_ACCESS_SECRET ?? "change-me-access"
      });
      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          username: true,
          userCode: true,
          displayName: true,
          status: true,
          platformRoles: {
            select: {
              role: true
            }
          }
        }
      });

      if (!user || user.status !== UserStatus.ACTIVE) {
        throw new UnauthorizedException("Account access is not available.");
      }

      request.user = {
        id: user.id,
        email: user.email,
        username: user.username,
        userCode: user.userCode,
        displayName: user.displayName,
        access: resolveUserAccess(user)
      };
      return true;
    } catch {
      throw new UnauthorizedException("Invalid or expired bearer token");
    }
  }

  private getBearerToken(request: Request) {
    const header = request.headers.authorization;
    if (!header) {
      return undefined;
    }

    const [type, token] = header.split(" ");
    return type?.toLowerCase() === "bearer" ? token : undefined;
  }
}
