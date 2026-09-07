import { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      emailVerified?: Date | null;
      isSuperAdmin?: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    emailVerified?: Date | null;
    isSuperAdmin?: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    sub?: string;
    emailVerified?: Date | null;
    isSuperAdmin?: boolean;
    accessToken?: string;
  }
}
