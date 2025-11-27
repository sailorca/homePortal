export interface TokenPayload {
  sub: number;        // User ID (subject)
  email: string;      // User email
  role: string;       // User role (admin|user)
  iat: number;        // Issued at (timestamp)
  exp: number;        // Expiration (timestamp)
}

export interface User {
  id: number;
  email: string;
  password_hash: string;
  role: string;
  created_at: Date;
  updated_at: Date;
}

export interface UserSafe {
  id: number;
  email: string;
  role: string;
}

export interface UserWithMeta extends UserSafe {
  created_at: Date;
  updated_at: Date;
}

export interface UpdateUserRequest {
  role?: 'admin' | 'user';
}
