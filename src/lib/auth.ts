import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import type { Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import type { NextRequest } from "next/server";
import { prisma } from "./prisma";
import { verifyPassword } from "./password";
import { loginSchema } from "./validators";
import { env } from "./env";

const credentialsProvider = Credentials({
  name: "Email and Password",
  credentials: {
    email: { label: "Email", type: "email" },
    password: { label: "Password", type: "password" },
  },
  async authorize(credentials) {
    const parsed = loginSchema.safeParse(credentials);
    if (!parsed.success) {
      return null;
    }

    const user = await prisma.user.findUnique({
      where: { email: parsed.data.email },
    });

    if (!user?.passwordHash) {
      return null;
    }

    const valid = await verifyPassword(parsed.data.password, user.passwordHash);
    if (!valid) {
      return null;
    }

    return {
      id: user.id,
      email: user.email,
      name: user.name,
    };
  },
});

type SessionUser = {
  id?: string;
  email?: string | null;
  name?: string | null;
};

type SessionCallbackArgs = {
  session: {
    user?: SessionUser | null;
  };
  user?: SessionUser | null;
};

type AuthorizedCallbackArgs = {
  auth: { user?: SessionUser | null } | null;
  request: NextRequest;
};

const authConfig = {
  adapter: PrismaAdapter(prisma),
  session: {
    strategy: "database" as const,
  },
  pages: {
    signIn: "/auth/login",
  },
  providers: [credentialsProvider],
  callbacks: {
    async session({ session, user }: SessionCallbackArgs) {
      if (session.user && user?.id && user.email) {
        session.user.id = user.id;
        session.user.email = user.email;
        session.user.name = user.name ?? session.user.name ?? null;
      }

      return session;
    },
    authorized({ auth, request }: AuthorizedCallbackArgs) {
      const { pathname } = request.nextUrl;
      const isProtectedPath = pathname.startsWith("/app") || pathname.startsWith("/connect");
      const isJobPath = pathname.startsWith("/api/jobs/poll-gmail");

      if (isJobPath) {
        if (env.CRON_SECRET) {
          const headerSecret = request.headers.get("x-cron-secret");
          return headerSecret === env.CRON_SECRET;
        }

        return Boolean(auth?.user);
      }

      if (!isProtectedPath) {
        return true;
      }

      return Boolean(auth?.user);
    },
  },
  trustHost: true,
  secret: env.NEXTAUTH_SECRET,
};

// NextAuth's ESM build does not expose a callable default type under bundler resolution,
// so we coerce it to keep both TS and runtime happy.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nextAuth = NextAuth as unknown as (config: any) => {
  handlers: {
    GET: (...args: unknown[]) => Promise<Response>;
    POST: (...args: unknown[]) => Promise<Response>;
  };
  auth: (...args: unknown[]) => Promise<Session | null>;
  signIn: (...args: unknown[]) => Promise<unknown>;
  signOut: (...args: unknown[]) => Promise<unknown>;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const { handlers, auth, signIn, signOut } = nextAuth(authConfig as any);