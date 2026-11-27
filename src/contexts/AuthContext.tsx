/* Copyright (c) 2026 Simon C.-Y. Wong. All rights reserved. */
import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { apiClient, type AuthUser } from '../services/apiClient';
import { carelinkStore } from '../services/carelinkStore';

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  hasSubmittedSurvey: boolean;
  workspaceVersion: number;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    email: string;
    password: string;
    displayName: string;
    inviteCode?: string;
    role?: 'owner' | 'sitter';
    petName?: string;
    petSpecies?: 'cat' | 'dog';
    petBreed?: string;
    petAgeLabel?: string;
  }) => Promise<AuthUser>;
  startDemo: (role?: 'owner' | 'sitter') => Promise<AuthUser>;
  logout: () => Promise<void>;
  refreshWorkspace: () => Promise<void>;
  markSurveySubmitted: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [hasSubmittedSurvey, setHasSubmittedSurvey] = useState<boolean>(false);
  const [workspaceVersion, setWorkspaceVersion] = useState<number>(0);

  const hydrateUserWorkspace = useCallback(async () => {
    try {
      const boot = await apiClient.bootstrapWorkspace();
      carelinkStore.hydrateFromCloud(boot);
      setUser(boot.user);
      setHasSubmittedSurvey(Boolean(boot.hasSubmittedSurvey));
      setWorkspaceVersion((v) => v + 1);
    } catch (err) {
      console.warn('Workspace cloud hydration skipped:', err);
    }
  }, []);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const me = await apiClient.getMe();
        if (!active) return;
        if (me.user) {
          setUser(me.user);
          await hydrateUserWorkspace();
        } else {
          setUser(null);
        }
      } catch {
        if (active) setUser(null);
      } finally {
        if (active) setIsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [hydrateUserWorkspace]);

  const login = useCallback(
    async (email: string, password: string): Promise<AuthUser> => {
      const res = await apiClient.login(email, password);
      setUser(res.user);
      await hydrateUserWorkspace();
      return res.user;
    },
    [hydrateUserWorkspace]
  );

  const register = useCallback(
    async (payload: {
      email: string;
      password: string;
      displayName: string;
      inviteCode?: string;
      role?: 'owner' | 'sitter';
      petName?: string;
      petSpecies?: 'cat' | 'dog';
      petBreed?: string;
      petAgeLabel?: string;
    }): Promise<AuthUser> => {
      const res = await apiClient.register(payload);
      setUser(res.user);
      await hydrateUserWorkspace();
      return res.user;
    },
    [hydrateUserWorkspace]
  );

  const startDemo = useCallback(
    async (role: 'owner' | 'sitter' = 'owner'): Promise<AuthUser> => {
      const res = await apiClient.startDemo(role);
      setUser(res.user);
      await hydrateUserWorkspace();
      return res.user;
    },
    [hydrateUserWorkspace]
  );

  const logout = useCallback(async () => {
    await apiClient.logout();
    carelinkStore.clearActiveUserCache();
    setUser(null);
    setHasSubmittedSurvey(false);
    setWorkspaceVersion((v) => v + 1);
  }, []);

  const refreshWorkspace = useCallback(async () => {
    await hydrateUserWorkspace();
  }, [hydrateUserWorkspace]);

  const markSurveySubmitted = useCallback(() => {
    setHasSubmittedSurvey(true);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated: Boolean(user),
        isAdmin: user?.role === 'admin',
        hasSubmittedSurvey,
        workspaceVersion,
        login,
        register,
        startDemo,
        logout,
        refreshWorkspace,
        markSurveySubmitted,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside AuthProvider');
  }
  return ctx;
}
