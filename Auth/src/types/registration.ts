// Registration token types for user onboarding

export interface RegistrationToken {
  id: number;
  token: string;
  expires_at: Date;
  used: boolean;
  used_by: number | null;
  used_at: Date | null;
  created_by: number;
  created_at: Date;
}

export interface RegistrationTokenSafe {
  id: number;
  token: string;
  expires_at: Date;
  used: boolean;
  used_by_email: string | null;
  used_at: Date | null;
  created_by_email: string;
  created_at: Date;
}

export interface CreateTokenRequest {
  expiresInDays?: number; // Default: 7
}

export interface CreateTokenResponse {
  token: string;
  expires_at: Date;
  registration_url: string;
}

export interface RegisterUserRequest {
  token: string;
  email: string;
  password: string;
}

export interface RegisterUserResponse {
  success: boolean;
  user: {
    id: number;
    email: string;
    role: string;
  };
}

export interface TokenValidationResponse {
  valid: boolean;
  error?: string;
}
