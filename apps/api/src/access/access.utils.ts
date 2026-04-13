import { PlatformRole } from "@omochat/db";

export type UserAccess = {
  isModerator: boolean;
  isPlatformAdmin: boolean;
  isSiteAdmin: boolean;
  roles: PlatformRole[];
};

type Identity = {
  email: string;
  username: string;
  platformRoles?: Array<{ role: PlatformRole } | PlatformRole>;
};

function parseAllowlist(input?: string) {
  return new Set(
    (input ?? "")
      .split(",")
      .map((value) => value.trim().toLowerCase())
      .filter(Boolean)
  );
}

function normalizeAssignedRoles(platformRoles?: Identity["platformRoles"]) {
  return new Set(
    (platformRoles ?? []).map((role) => (typeof role === "string" ? role : role.role))
  );
}

export function resolveUserAccess(identity: Identity): UserAccess {
  const normalizedEmail = identity.email.toLowerCase();
  const normalizedUsername = identity.username.toLowerCase();
  const assignedRoles = normalizeAssignedRoles(identity.platformRoles);
  const siteAdminEmails = parseAllowlist(process.env.SITE_ADMIN_EMAILS);
  const siteAdminUsernames = parseAllowlist(process.env.SITE_ADMIN_USERNAMES);
  const moderatorEmails = parseAllowlist(process.env.MODERATOR_EMAILS);
  const moderatorUsernames = parseAllowlist(process.env.MODERATOR_USERNAMES);
  const isDevelopment = (process.env.NODE_ENV ?? "development") !== "production";
  const adminConfigured = siteAdminEmails.size > 0 || siteAdminUsernames.size > 0;
  const moderatorConfigured = moderatorEmails.size > 0 || moderatorUsernames.size > 0;

  const allowlistedSiteAdmin =
    siteAdminEmails.has(normalizedEmail) || siteAdminUsernames.has(normalizedUsername);
  const allowlistedModerator =
    moderatorEmails.has(normalizedEmail) || moderatorUsernames.has(normalizedUsername);

  const isBootstrapSiteAdmin = allowlistedSiteAdmin || (isDevelopment && !adminConfigured);
  const isSiteAdmin = isBootstrapSiteAdmin || assignedRoles.has(PlatformRole.SITE_ADMIN);
  const isPlatformAdmin = isSiteAdmin || assignedRoles.has(PlatformRole.PLATFORM_ADMIN);
  const isModerator =
    isPlatformAdmin ||
    assignedRoles.has(PlatformRole.MODERATOR) ||
    allowlistedModerator ||
    (isDevelopment && !moderatorConfigured);

  const roles = new Set<PlatformRole>();
  if (isSiteAdmin) {
    roles.add(PlatformRole.SITE_ADMIN);
  }
  if (isPlatformAdmin && !isSiteAdmin) {
    roles.add(PlatformRole.PLATFORM_ADMIN);
  } else if (assignedRoles.has(PlatformRole.PLATFORM_ADMIN)) {
    roles.add(PlatformRole.PLATFORM_ADMIN);
  }
  if (isModerator && !isPlatformAdmin) {
    roles.add(PlatformRole.MODERATOR);
  } else if (assignedRoles.has(PlatformRole.MODERATOR) || allowlistedModerator) {
    roles.add(PlatformRole.MODERATOR);
  }

  return {
    isModerator,
    isPlatformAdmin,
    isSiteAdmin,
    roles: [...roles]
  };
}
