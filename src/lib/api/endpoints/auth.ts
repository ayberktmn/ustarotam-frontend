import { z } from "zod";

import { browserRequest } from "@/lib/api/client";
import { ApiError, createCancelledError } from "@/lib/api/errors";
import {
  apiAuthPayloadSchema,
  apiUserSchema,
} from "@/lib/api/schemas";
import {
  clearAccessToken,
  setAccessToken,
  beginSession,
  endSession,
  getSessionSignal,
  isSignedOut,
} from "@/lib/api/token-store";
import { refreshAccessToken, withSessionLock } from "@/lib/api/token-refresh";
import type {
  AuthSession,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegistrationResult,
} from "@/types/auth";

export const profileUpdateInputSchema = z.object({
  firstName: z.string().trim().min(2).max(100),
  lastName: z.string().trim().min(2).max(100),
}).strict().partial().refine((value) => Object.keys(value).length > 0);

export type ProfileUpdateInput = z.infer<typeof profileUpdateInputSchema>;

function requireSession(payload: {
  user: AuthUser;
  accessToken: string | null;
}): AuthSession {
  if (!payload.accessToken) {
    throw new ApiError({
      kind: "contract",
      message: "Authentication response did not include an access token.",
      code: "MISSING_ACCESS_TOKEN",
    });
  }

  setAccessToken(payload.accessToken);

  return {
    user: payload.user,
    accessToken: payload.accessToken,
  };
}

export const authService = {
  async login(input: LoginInput): Promise<AuthSession> {
    beginSession();
    const signal = getSessionSignal();
    let session: AuthSession;
    try {
      session = await withSessionLock(async () => {
        if (signal.aborted) throw createCancelledError();
        const payload = await browserRequest({
        path: "/auth/login",
        method: "POST",
        body: input,
        schema: apiAuthPayloadSchema,
        auth: "none",
        retries: 0,
        });
        if (signal.aborted) throw createCancelledError();
        return requireSession(payload);
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === "EMAIL_NOT_VERIFIED") clearAccessToken();
      throw error;
    }

    try {
      const user = await authService.me();
      if (signal.aborted) throw createCancelledError();
      if (!user.emailVerified) throw new ApiError({kind: "auth", status: 403, code: "EMAIL_NOT_VERIFIED", message: "Email verification required."});
      return {...session, user};
    } catch (error) { clearAccessToken(); throw error; }
  },

  async register(input: RegisterInput): Promise<RegistrationResult> {
    beginSession();
    const payload = await withSessionLock(() => browserRequest({
      path: "/auth/register",
      method: "POST",
      body: input,
      schema: apiAuthPayloadSchema,
      auth: "none",
      retries: 0,
    }));

    void payload;
    try {
      await authService.logout();
      return { sessionCleared: true };
    } catch {
      // The account already exists. Do not invite another registration POST.
      return { sessionCleared: false };
    }
  },

  async verifyEmail(token: string): Promise<void> {
    await browserRequest({
      path: "/auth/email-verification/confirm",
      method: "POST",
      body: { token },
      schema: z.void(),
      auth: "none",
      retries: 0,
    });
  },

  async resendEmailVerification(email: string): Promise<void> {
    await browserRequest({
      path: "/auth/email-verification/resend",
      method: "POST",
      body: { email },
      schema: z.object({ success: z.literal(true) }),
      responseMode: "raw",
      auth: "none",
      retries: 0,
    });
  },

  async requestPasswordReset(email: string): Promise<void> {
    await browserRequest({ path: "/auth/password-reset/request", method: "POST", body: { email },
      schema: z.object({ success: z.literal(true) }), responseMode: "raw", auth: "none", retries: 0 });
  },

  async resetPassword(token: string, newPassword: string): Promise<void> {
    await browserRequest({ path: "/auth/password-reset/confirm", method: "POST", body: { token, newPassword },
      schema: z.void(), auth: "none", retries: 0 });
  },

  async requestEmailChange(email: string): Promise<never> {
    void email;
    throw new ApiError({
      kind: "contract",
      code: "EMAIL_CHANGE_UNAVAILABLE",
      message: "The backend does not expose a verified email-change endpoint.",
      retryable: false,
    });
  },

  async verifyEmailChange(code: string): Promise<never> {
    void code;
    throw new ApiError({
      kind: "contract",
      code: "EMAIL_CHANGE_UNAVAILABLE",
      message: "The backend does not expose a verified email-change endpoint.",
      retryable: false,
    });
  },

  async me(): Promise<AuthUser> {
    return browserRequest({
      path: "/auth/me",
      schema: apiUserSchema,
      auth: "required",
      retries: 0,
    });
  },

  async updateProfile(input: ProfileUpdateInput): Promise<AuthUser> {
    return browserRequest({
      path: "/auth/me",
      method: "PATCH",
      body: profileUpdateInputSchema.parse(input),
      schema: apiUserSchema,
      auth: "required",
      retries: 0,
    });
  },

  async logout(): Promise<void> {
    endSession();
    await withSessionLock(async () => {
      try {
        await browserRequest({
        path: "/auth/logout",
        method: "POST",
        schema: z.void(),
        auth: "none",
        retries: 0,
        });
      } finally {
        clearAccessToken();
        if (typeof window !== "undefined" && typeof window.BroadcastChannel !== "undefined") {
          const channel = new window.BroadcastChannel("usta-rotam-auth");
          channel.postMessage("logout");
          channel.close();
        }
      }
    });
  },

  async refreshSession(): Promise<AuthUser | null> {
    if (isSignedOut()) return null;
    const result = await refreshAccessToken();

    if (result.status === "expired") {
      return null;
    }

    if (result.status === "unavailable") {
      throw result.error;
    }

    try {
      return await this.me();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        clearAccessToken();
        return null;
      }

      throw error;
    }
  },
};

export async function bootstrapSession(): Promise<AuthUser | null> {
  return authService.refreshSession();
}
