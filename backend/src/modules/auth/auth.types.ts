export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  username: string;
  email: string;
  plan: string;
  storageLimitGb: number;
  role: string;
}

export interface RegisterPayload {
  email: string;
  username: string;
  password: string;
  plan: 'starter' | 'professional' | 'enterprise';
  storageLimitGb: number;
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
}
