"use client";

import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface UserOut {
  id: string;
  email: string;
  username: string;
  full_name: string;
}

interface AuthContextType {
  user: UserOut | null;
  token: string | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: UserOut) => void;
  logout: () => void;
  updateUser: (user: UserOut) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "digital_fte_token";
const USER_KEY = "digital_fte_user";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserOut | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    try {
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
    } catch {
      // Ignore invalid persisted state
    }
    setIsLoading(false);
  }, []);

  const login = useCallback((newToken: string, newUser: UserOut) => {
    setToken(newToken);
    setUser(newUser);
    try {
      localStorage.setItem(TOKEN_KEY, newToken);
      localStorage.setItem(USER_KEY, JSON.stringify(newUser));
    } catch {
      // Ignore write failures
    }
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
    try {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem("digital-fte-page-state");
      localStorage.removeItem("digital-fte-auth");
    } catch {
      // Ignore
    }
    window.location.href = "/login";
  }, []);

  const updateUser = useCallback((updatedUser: UserOut) => {
    setUser(updatedUser);
    try {
      localStorage.setItem(USER_KEY, JSON.stringify(updatedUser));
    } catch {
      // Ignore
    }
  }, []);

  const isAuthenticated = Boolean(user && token);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, isAuthenticated, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
