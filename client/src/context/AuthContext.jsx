import { useState, useEffect, useCallback, useMemo } from "react";
import { authClient } from "../services/authClient.js";
import { AuthContext } from "./authContextDef.js";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const checkAuth = useCallback(async () => {
    try {
      const data = await authClient.getMe();
      if (data?.user) {
        setUser(data.user);
      } else {
        setUser(null);
      }
    } catch {
      setUser(null);
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
          setIsLoading(false);
        }
      })
      .catch(() => {
        if (active) {
          setUser(null);
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
      setUser(null);
    }
  }, []);

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
