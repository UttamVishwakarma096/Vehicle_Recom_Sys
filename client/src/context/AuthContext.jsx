import { useState, useEffect, useCallback, useMemo } from "react";
import { authClient } from "../services/authClient.js";
import { AuthContext } from "./authContextDef.js";
import {
  setCompareStorageUser,
  clearStoredCompareIds,
  clearStoredVerdict,
} from "../services/compareStorage.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  // Synchronize comparison storage with the authenticated user ID
  useEffect(() => {
    setCompareStorageUser(user?.id || null);
  }, [user?.id]);

  const checkAuth = useCallback(async () => {
    try {
      const data = await authClient.getMe();
      if (data?.user) {
        setUser(data.user);
        setCompareStorageUser(data.user.id);
      } else {
        setUser(null);
        setCompareStorageUser(null);
      }
    } catch {
      setUser(null);
      setCompareStorageUser(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    let active = true;
    authClient
      .getMe()
      .then((data) => {
        if (active) {
          setUser(data?.user || null);
          setCompareStorageUser(data?.user?.id || null);
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
          setCompareStorageUser(null);
          setIsLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async ({ email, password }) => {
    setAuthError(null);
    try {
      const data = await authClient.login({ email, password });
      setUser(data.user);
      setCompareStorageUser(data.user?.id);
      return data.user;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const register = useCallback(async ({ email, password, displayName, profile }) => {
    setAuthError(null);
    try {
      const data = await authClient.register({ email, password, displayName, profile });
      setUser(data.user);
      setCompareStorageUser(data.user?.id);
      return data.user;
    } catch (error) {
      setAuthError(error.message);
      throw error;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await authClient.logout();
    } finally {
      clearStoredCompareIds(user?.id);
      clearStoredVerdict(user?.id);
      setCompareStorageUser(null);
      setUser(null);
    }
  }, [user?.id]);

  const value = useMemo(() => ({
    user,
    isAuthenticated: Boolean(user),
    isAdmin: user?.role === "admin",
    isLoading,
    authError,
    login,
    register,
    logout,
    checkAuth,
  }), [user, isLoading, authError, login, register, logout, checkAuth]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}
