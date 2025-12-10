import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../services/apiClient';
import { login as loginRequest, fetchProfile, changePassword } from '../services/authApi';

const AuthContext = createContext(undefined);

const AUTH_STORAGE_KEY = 'alt-hosting-auth';

const storeTokens = (tokens) => {
  if (tokens) {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(tokens));
    apiClient.defaults.headers.common.Authorization = `Bearer ${tokens.accessToken}`;
  } else {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    delete apiClient.defaults.headers.common.Authorization;
  }
};

const loadStoredTokens = () => {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw);
    apiClient.defaults.headers.common.Authorization = `Bearer ${parsed.accessToken}`;
    return parsed;
  } catch (error) {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [tokens, setTokens] = useState(() => loadStoredTokens());
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(!!tokens);

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
    async (identifier, password) => {
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

  const updatePassword = useCallback(async (currentPassword, newPassword) => {
    const profile = await changePassword({ currentPassword, newPassword });
    setUser(profile);
  }, []);

  const value = useMemo(
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
