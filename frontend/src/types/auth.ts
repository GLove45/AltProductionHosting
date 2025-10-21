export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type UserProfile = {
  id: string;
  username: string;
  email: string;
  plan: string;
  storageLimitGb: number;
  role: string;
};
