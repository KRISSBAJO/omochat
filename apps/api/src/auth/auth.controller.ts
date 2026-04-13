import { Body, Controller, HttpCode, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiTags } from "@nestjs/swagger";
import { Request, Response } from "express";
import { CurrentUser } from "./current-user.decorator";
import { AuthService } from "./auth.service";
import { REFRESH_TOKEN_COOKIE } from "./auth.constants";
import { JwtAuthGuard } from "./jwt-auth.guard";
import { AuthenticatedUser } from "./types/authenticated-user";
import { ForgotPasswordDto } from "./dto/forgot-password.dto";
import { LoginDto } from "./dto/login.dto";
import { LogoutDto } from "./dto/logout.dto";
import { RefreshTokenDto } from "./dto/refresh-token.dto";
import { RegisterDto } from "./dto/register.dto";
import { ResetPasswordDto } from "./dto/reset-password.dto";
import { StartPhoneVerificationDto } from "./dto/start-phone-verification.dto";
import { VerifyPhoneDto } from "./dto/verify-phone.dto";
import { getRefreshCookieOptions } from "../config/runtime";

const authResponseExample = {
  tokenType: "Bearer",
  accessToken: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  refreshToken: "mobile-refresh-token-value",
  refreshExpiresAt: "2026-05-10T17:00:00.000Z",
  user: {
    id: "5bf7d271-950a-4ef6-a028-1d447e552a7d",
    email: "mira@omochat.local",
    username: "mira",
    userCode: "23yg2",
    displayName: "Mira Stone",
    avatarUrl: null,
    phoneNumber: "+16155543592",
    phoneVerifiedAt: "2026-05-10T17:00:00.000Z",
    dmPolicy: "OPEN",
    status: "ACTIVE",
    access: {
      isModerator: true,
      isSiteAdmin: true
    }
  }
};

@ApiTags("auth")
@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("register")
  @ApiCreatedResponse({ schema: { example: authResponseExample } })
  async register(@Body() body: RegisterDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.register(body);
    this.setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
    return session;
  }

  @Post("login")
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: authResponseExample } })
  async login(@Body() body: LoginDto, @Res({ passthrough: true }) response: Response) {
    const session = await this.auth.login(body);
    this.setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
    return session;
  }

  @Post("refresh")
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOkResponse({ schema: { example: authResponseExample } })
  async refresh(@Body() body: RefreshTokenDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = body.refreshToken ?? request.cookies?.[REFRESH_TOKEN_COOKIE];
    const session = await this.auth.refresh(token);
    this.setRefreshCookie(response, session.refreshToken, session.refreshExpiresAt);
    return session;
  }

  @Post("logout")
  @HttpCode(200)
  @ApiCookieAuth(REFRESH_TOKEN_COOKIE)
  @ApiOkResponse({ schema: { example: { ok: true } } })
  async logout(@Body() body: LogoutDto, @Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const token = body.refreshToken ?? request.cookies?.[REFRESH_TOKEN_COOKIE];
    response.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshCookieOptions());
    return this.auth.logout(token);
  }

  @Post("forgot-password")
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { ok: true } } })
  forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.auth.forgotPassword(body);
  }

  @Post("reset-password")
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { ok: true } } })
  resetPassword(@Body() body: ResetPasswordDto, @Res({ passthrough: true }) response: Response) {
    response.clearCookie(REFRESH_TOKEN_COOKIE, getRefreshCookieOptions());
    return this.auth.resetPassword(body);
  }

  @Post("phone/start")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { ok: true, phoneNumber: "+16155543592" } } })
  startPhoneVerification(@CurrentUser() user: AuthenticatedUser, @Body() body: StartPhoneVerificationDto) {
    return this.auth.startPhoneVerification(user.id, body);
  }

  @Post("phone/verify")
  @UseGuards(JwtAuthGuard)
  @HttpCode(200)
  @ApiOkResponse({ schema: { example: { ok: true, user: authResponseExample.user } } })
  verifyPhone(@CurrentUser() user: AuthenticatedUser, @Body() body: VerifyPhoneDto) {
    return this.auth.verifyPhoneNumber(user.id, body);
  }

  private setRefreshCookie(response: Response, refreshToken: string, expires: Date) {
    response.cookie(REFRESH_TOKEN_COOKIE, refreshToken, getRefreshCookieOptions(expires));
  }
}
