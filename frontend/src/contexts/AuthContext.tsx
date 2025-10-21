import {
  ReactNode,
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { AuthTokens, UserProfile } from '../types/auth';
import { login as loginRequest, fetchProfile, changePassword } from '../services/authApi';

type AuthContextValue = {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isLoading: boolean;
  login: (identifier: string, password: string) => Promise<void>;
  logout: () => void;
  refreshProfile: () => Promise<void>;
  updatePassword: (currentPassword: string, newPassword: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const AUTH_STORAGE_KEY = 'alt-hosting-auth';

const storeTokens = (tokens: AuthTokens | null) => {
  if (tokens) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    delete apiClient.defaults.headers.common.Authorization;
  }
};

const loadStoredTokens = (): AuthTokens | null => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthTokens;
    apiClient.defaults.headers.common.Authorization = `Bearer ${parsed.accessToken}`;
    return parsed;
  } catch (error) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

type AuthProviderProps = {
  children: ReactNode;
};

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState<AuthTokens | null>(() => loadStoredTokens());
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(!!tokens);

  useEffect(() => {
    if (!tokens) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    fetchProfile()
      .then((profile) => {
        setUser(profile);
      })
      .catch(() => {
        setTokens(null);
        storeTokens(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [tokens]);

  const login = useCallback(
    async (identifier: string, password: string) => {
      const authTokens = await loginRequest(identifier, password);
      setTokens(authTokens);
      storeTokens(authTokens);

      const profile = await fetchProfile();
      setUser(profile);
      navigate('/');
    },
    [navigate]
  );

  const logout = useCallback(() => {
    setTokens(null);
    setUser(null);
    storeTokens(null);
    navigate('/login');
  }, [navigate]);

  const refreshProfile = useCallback(async () => {
    const profile = await fetchProfile();
    setUser(profile);
  }, []);

  const updatePassword = useCallback(
    async (currentPassword: string, newPassword: string) => {
      const profile = await changePassword({ currentPassword, newPassword });
      setUser(profile);
    },
    []
  );

  const value = useMemo<AuthContextValue>(
    () => ({ user, tokens, isLoading, login, logout, refreshProfile, updatePassword }),
    [user, tokens, isLoading, login, logout, refreshProfile, updatePassword]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
