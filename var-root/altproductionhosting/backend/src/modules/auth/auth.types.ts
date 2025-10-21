export interface RegisterPayload {
  email: string;
  password: string;
  plan: 'starter' | 'professional' | 'enterprise';
  storageLimitGb: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserProfile {
  id: string;
  email: string;
  plan: string;
  storageLimitGb: number;
}
