export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  emailVerified: boolean;
  roles: string[];
}

export interface AuthSession {
  user: AuthUser;
  accessToken: string;
}

export interface RegistrationResult {
  sessionCleared: boolean;
}

export interface LoginInput {
  email: string;
  password: string;
  rememberMe: boolean;
}

export interface RegisterInput {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone?: string;
  provinceId: string;
  termsAccepted: true;
  privacyAccepted: true;
}

export type AuthStatus = "loading" | "authenticated" | "unauthenticated";
