import { PlatformRole } from "@omochat/db";

export type AuthenticatedUser = {
  id: string;
  email: string;
  username: string;
  userCode?: string | null;
  displayName: string;
  access: {
    isModerator: boolean;
    isPlatformAdmin: boolean;
    isSiteAdmin: boolean;
    roles: PlatformRole[];
  };
};
