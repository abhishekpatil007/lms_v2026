import { create } from 'zustand';
import type { User } from '../types';
import { storage } from '../utils/storage';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isInitialized: boolean;
  setAuth: (user: User, tokens: { accessToken: string; refreshToken: string }) => void;
  logout: () => void;
  updateUser: (user: User) => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAuthenticated: false,
  isInitialized: false,

  setAuth: (user, tokens) => {
    storage.setUser(user);
    storage.setAccessToken(tokens.accessToken);
    storage.setRefreshToken(tokens.refreshToken);
    set({ user, isAuthenticated: true, isInitialized: true });
  },

  logout: () => {
    storage.clearAuth();
    set({ user: null, isAuthenticated: false, isInitialized: true });
  },

  updateUser: (user) => {
    storage.setUser(user);
    set({ user });
  },

  initialize: () => {
    const user = storage.getUser();
    const token = storage.getAccessToken();
    if (user && token) {
      set({ user, isAuthenticated: true, isInitialized: true });
    } else {
      set({ isInitialized: true });
    }
  },
}));
