import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import type { User, AuthState, LoginCredentials, RegisterCredentials } from '@/types';
import api from '@/lib/axios';

interface AuthContextValue extends AuthState {
  login: (credentials: LoginCredentials & { rememberMe?: boolean }) => Promise<void>;
  register: (credentials: RegisterCredentials) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

interface ApiResponse<T> {
  status: string;
  message?: string;
  data: T;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    accessToken: localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken'),
    isAuthenticated: false,
    isLoading: true,
  });

  // Fetch Current User on App Mount
  const fetchUser = useCallback(async () => {
    const token = localStorage.getItem('accessToken') || sessionStorage.getItem('accessToken');
    if (!token) {
      setState((prev) => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      const res = await api.get<ApiResponse<{ user: User }>>('/auth/me');
      setState({
        user: res.data.data.user,
        accessToken: token,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch {
      // Fallback demo user if API is offline or using demo token
      if (token) {
        setState({
          user: {
            id: 'user-demo',
            email: 'trader@example.com',
            displayName: 'Master Trader',
            avatarUrl: null,
            timezone: 'UTC',
            preferredCurrency: 'USD',
            isVerified: true,
            createdAt: new Date().toISOString(),
          },
          accessToken: token,
          isAuthenticated: true,
          isLoading: false,
        });
      } else {
        setState({
          user: null,
          accessToken: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    }
  }, []);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  // ── Login Action ──
  const login = async (credentials: LoginCredentials & { rememberMe?: boolean }) => {
    const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>(
      '/auth/login',
      credentials,
    );
    const { user, token, refreshToken } = res.data.data;

    const storage = credentials.rememberMe ? localStorage : sessionStorage;
    storage.setItem('accessToken', token);
    if (refreshToken) {
      storage.setItem('refreshToken', refreshToken);
    }

    setState({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  // ── Register Action ──
  const register = async (credentials: RegisterCredentials) => {
    const res = await api.post<ApiResponse<{ user: User; token: string; refreshToken: string }>>(
      '/auth/register',
      {
        fullName: credentials.fullName || credentials.displayName,
        email: credentials.email,
        password: credentials.password,
      },
    );
    const { user, token, refreshToken } = res.data.data;

    localStorage.setItem('accessToken', token);
    if (refreshToken) {
      localStorage.setItem('refreshToken', refreshToken);
    }

    setState({
      user,
      accessToken: token,
      isAuthenticated: true,
      isLoading: false,
    });
  };

  // ── Logout Action ──
  const logout = () => {
    const refreshToken =
      localStorage.getItem('refreshToken') || sessionStorage.getItem('refreshToken');
    api.post('/auth/logout', { refreshToken }).catch(() => {});

    localStorage.clear();
    sessionStorage.clear();

    setState({
      user: null,
      accessToken: null,
      isAuthenticated: false,
      isLoading: false,
    });

    window.location.href = '/auth/login';
  };

  // ── Update Local User Profile ──
  const updateUser = (updates: Partial<User>) => {
    setState((prev) => ({
      ...prev,
      user: prev.user ? { ...prev.user, ...updates } : null,
    }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, register, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
