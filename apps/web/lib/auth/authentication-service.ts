import type {
  AuthenticatedSession,
  AuthErrorCode,
  AuthErrorResponse,
  EmailVerificationRequest,
  EmailVerificationResponse,
  GenericAuthResponse,
  LoginRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
  RegistrationRequest,
  RegistrationResponse,
} from "@aop/types";

export type {
  AuthenticatedSession,
  EmailVerificationRequest,
  LoginRequest,
  PasswordResetRequest,
  PasswordUpdateRequest,
  RegistrationRequest,
} from "@aop/types";

export interface AuthenticationService {
  login(request: LoginRequest): Promise<AuthenticatedSession>;
  register(request: RegistrationRequest): Promise<RegistrationResponse>;
  verifyEmail(
    request: EmailVerificationRequest,
  ): Promise<EmailVerificationResponse>;
  resendVerification(): Promise<GenericAuthResponse>;
  requestPasswordReset(
    request: PasswordResetRequest,
  ): Promise<GenericAuthResponse>;
  resetPassword(request: PasswordUpdateRequest): Promise<GenericAuthResponse>;
  getSession(): Promise<AuthenticatedSession>;
  logout(): Promise<void>;
}

export class AuthenticationError extends Error {
  constructor(
    readonly code: AuthErrorCode,
    message: string,
    readonly statusCode: number,
  ) {
    super(message);
    this.name = "AuthenticationError";
  }
}

export const apiOrigin = (process.env.NEXT_PUBLIC_API_ORIGIN ?? "").replace(
  /\/$/,
  "",
);

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${apiOrigin}${path}`, {
    ...init,
    credentials: "include",
    headers: {
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...init.headers,
    },
  });

  if (!response.ok) {
    let problem: Partial<AuthErrorResponse> = {};
    try {
      problem = (await response.json()) as Partial<AuthErrorResponse>;
    } catch {
      // Invalid server responses are collapsed into a stable client error.
    }
    throw new AuthenticationError(
      problem.code ?? "SERVICE_UNAVAILABLE",
      problem.message ?? "Authentication is currently unavailable.",
      problem.statusCode ?? response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}

export const authenticationService: AuthenticationService = {
  login(input) {
    return request<AuthenticatedSession>("/auth/login", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  register(input) {
    return request<RegistrationResponse>("/auth/register", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  verifyEmail(input) {
    return request<EmailVerificationResponse>("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resendVerification() {
    return request<GenericAuthResponse>("/auth/resend-verification", {
      method: "POST",
    });
  },
  requestPasswordReset(input) {
    return request<GenericAuthResponse>("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  resetPassword(input) {
    return request<GenericAuthResponse>("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },
  getSession() {
    return request<AuthenticatedSession>("/auth/session");
  },
  logout() {
    return request<void>("/auth/logout", { method: "POST" });
  },
};
