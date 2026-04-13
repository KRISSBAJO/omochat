import "../env";
import { CookieOptions } from "express";

const localOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  "http://localhost:3002",
  "http://localhost:3003",
  "http://localhost:3004",
  "http://localhost:3005",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:3001",
  "http://127.0.0.1:3002"
];

type SameSiteMode = "lax" | "strict" | "none";

function normalizeOrigin(origin?: string | null) {
  const trimmed = origin?.trim();
  return trimmed ? trimmed.replace(/\/$/, "") : null;
}

function parseOriginList(value?: string) {
  return (value ?? "")
    .split(",")
    .map((entry) => normalizeOrigin(entry))
    .filter((entry): entry is string => Boolean(entry));
}

function dedupe(values: string[]) {
  return [...new Set(values)];
}

export function getAllowedOrigins() {
  const configuredOrigins = [
    normalizeOrigin(process.env.WEB_ORIGIN),
    normalizeOrigin(process.env.FRONTEND_URL),
    ...parseOriginList(process.env.ALLOWED_ORIGINS)
  ].filter((entry): entry is string => Boolean(entry));

  const developmentOrigins = process.env.NODE_ENV === "production" ? [] : localOrigins;
  return dedupe([...configuredOrigins, ...developmentOrigins]);
}

export function getWebAppOrigin() {
  return (
    normalizeOrigin(process.env.WEB_ORIGIN) ??
    normalizeOrigin(process.env.FRONTEND_URL) ??
    parseOriginList(process.env.ALLOWED_ORIGINS)[0] ??
    "http://localhost:3000"
  );
}

export function getServerPort() {
  const rawPort = process.env.PORT ?? process.env.API_PORT ?? "4000";
  const parsedPort = Number(rawPort);
  return Number.isFinite(parsedPort) && parsedPort > 0 ? parsedPort : 4000;
}

function getRefreshCookieSameSite(): SameSiteMode {
  const rawValue = process.env.COOKIE_SAME_SITE?.trim().toLowerCase();

  if (rawValue === "strict" || rawValue === "none") {
    return rawValue;
  }

  return "lax";
}

function getRefreshCookieSecure(sameSite: SameSiteMode) {
  const rawValue = process.env.COOKIE_SECURE?.trim().toLowerCase();

  if (rawValue === "true") {
    return true;
  }

  if (rawValue === "false") {
    return sameSite === "none" ? true : false;
  }

  return sameSite === "none" ? true : process.env.NODE_ENV === "production";
}

function getRefreshCookiePath() {
  return process.env.COOKIE_PATH?.trim() || "/auth";
}

function getRefreshCookieDomain() {
  return normalizeOrigin(process.env.COOKIE_DOMAIN)?.replace(/^https?:\/\//, "") ?? undefined;
}

export function getRefreshCookieOptions(expires?: Date): CookieOptions {
  const sameSite = getRefreshCookieSameSite();
  const options: CookieOptions = {
    httpOnly: true,
    sameSite,
    secure: getRefreshCookieSecure(sameSite),
    path: getRefreshCookiePath()
  };

  const domain = getRefreshCookieDomain();
  if (domain) {
    options.domain = domain;
  }

  if (expires) {
    options.expires = expires;
  }

  return options;
}
