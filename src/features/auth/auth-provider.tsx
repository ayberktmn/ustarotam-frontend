"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { useTranslations } from "next-intl";
import { toast } from "sonner";

import { SESSION_EXPIRED_EVENT } from "@/lib/api/events";
import { clearAccessToken, endSession, getSessionSignal, isSignedOut } from "@/lib/api/token-store";
import { createCancelledError } from "@/lib/api/errors";
import { authService, bootstrapSession } from "@/lib/api/endpoints/auth";
import { queryKeys } from "@/lib/query/keys";
import type {
  AuthSession,
  AuthStatus,
  AuthUser,
  LoginInput,
  RegisterInput,
  RegistrationResult,
} from "@/types/auth";

interface AuthContextValue {
  user: AuthUser | null;
  status: AuthStatus;
  isLoading: boolean;
  isLoggingIn: boolean;
  isRegistering: boolean;
  isLoggingOut: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  completeGoogleLogin: () => Promise<AuthUser>;
  register: (input: RegisterInput) => Promise<RegistrationResult>;
  resendEmailVerification: (email: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const t = useTranslations("toasts");
  const [signedOut, setSignedOut] = useState(false);

  const sessionQuery = useQuery<AuthUser | null>({
    queryKey: queryKeys.auth.me,
    queryFn: bootstrapSession,
    enabled: !signedOut,
    retry: false,
    staleTime: 5 * 60_000,
    gcTime: Infinity,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const loginMutation = useMutation({
    onMutate: () => queryClient.cancelQueries({ queryKey: queryKeys.auth.me }),
    mutationFn: ({ input, signal }: { input: LoginInput; signal: AbortSignal }) => {
      if (signal.aborted) throw createCancelledError();
      return authService.login(input);
    },
    retry: false,
    onSuccess: (session, { signal }) => {
      if (signal.aborted || isSignedOut()) return;
      toast.dismiss("login-error");
      queryClient.setQueryData(queryKeys.auth.me, session.user);
      setSignedOut(false);
    },
  });

  const registerMutation = useMutation({
    onMutate: () => queryClient.cancelQueries({ queryKey: queryKeys.auth.me }),
    mutationFn: authService.register,
    retry: false,
    onSuccess: () => queryClient.setQueryData(queryKeys.auth.me, null),
  });

  const logoutMutation = useMutation({
    onMutate: async () => {
      endSession();
      setSignedOut(true);
      toast.dismiss();
      loginMutation.reset();
      registerMutation.reset();
      await queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
    },
    mutationFn: authService.logout,
    retry: false,
    onSettled: () => {
      toast.dismiss("login-error");
      toast.dismiss("logout-error");
      toast.dismiss("session-expired");
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.removeQueries({ queryKey: queryKeys.workshops.all });
      queryClient.removeQueries({ queryKey: queryKeys.reviews.all });
      queryClient.removeQueries({ queryKey: queryKeys.workshopPanel.all });
      queryClient.removeQueries({ queryKey: queryKeys.workRequests.all });
    },
  });

  const resetLogin = loginMutation.reset;

  useEffect(() => {
    const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("usta-rotam-auth") : null;
    if (channel) channel.onmessage = (event: MessageEvent<unknown>) => {
      if (event.data !== "logout") return;
      endSession();
      setSignedOut(true);
      resetLogin();
      toast.dismiss();
      void queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.removeQueries({ queryKey: queryKeys.workshops.all });
      queryClient.removeQueries({ queryKey: queryKeys.reviews.all });
      queryClient.removeQueries({ queryKey: queryKeys.workshopPanel.all });
      queryClient.removeQueries({ queryKey: queryKeys.workRequests.all });
    };
    function handleSessionExpired() {
      if (isSignedOut()) return;
      clearAccessToken();
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.removeQueries({ queryKey: queryKeys.reviews.all });
      queryClient.removeQueries({ queryKey: queryKeys.workshopPanel.all });
      queryClient.removeQueries({ queryKey: queryKeys.workRequests.all });
      toast.info(t("sessionExpired"), { id: "session-expired" });
    }

    window.addEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);

    return () => {
      channel?.close();
      window.removeEventListener(SESSION_EXPIRED_EVENT, handleSessionExpired);
    };
  }, [queryClient, t, resetLogin]);

  const value = useMemo<AuthContextValue>(() => {
    const user = sessionQuery.data ?? null;
    const status: AuthStatus = sessionQuery.isPending
      ? "loading"
      : user
        ? "authenticated"
        : "unauthenticated";

    return {
      user,
      status,
      isLoading: status === "loading",
      isLoggingIn: loginMutation.isPending,
      isRegistering: registerMutation.isPending,
      isLoggingOut: logoutMutation.isPending,
      login: async (input) => {
        const signal = getSessionSignal();
        try {
          const session = await loginMutation.mutateAsync({ input, signal });
          if (signal.aborted) throw createCancelledError();
          return session;
        } catch (error) {
          if (signal.aborted) throw createCancelledError();
          throw error;
        }
      },
      completeGoogleLogin: async () => {
        await queryClient.cancelQueries({ queryKey: queryKeys.auth.me });
        const user = await authService.completeGoogleLogin();
        queryClient.setQueryData(queryKeys.auth.me, user);
        setSignedOut(false);
        return user;
      },
      register: async (input) => registerMutation.mutateAsync(input),
      resendEmailVerification: authService.resendEmailVerification,
      logout: async () => {
        await logoutMutation.mutateAsync();
      },
    };
  }, [
    loginMutation,
    logoutMutation,
    registerMutation,
    queryClient,
    sessionQuery.data,
    sessionQuery.isPending,
  ]);

  return (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within AuthProvider.");
  }

  return context;
}

export { AuthProvider, useAuth };
