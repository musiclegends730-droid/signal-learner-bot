import React, { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { useLogin, useRegister, useGetMe, getGetMeQueryKey, setAuthTokenGetter } from "@workspace/api-client-react";
import type { User, AuthInput } from "@workspace/api-client-react";
import { useQueryClient } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (data: AuthInput) => Promise<void>;
  register: (data: AuthInput) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(localStorage.getItem("slb_token"));
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  useEffect(() => {
    setAuthTokenGetter(() => localStorage.getItem("slb_token"));
    if (token) {
      localStorage.setItem("slb_token", token);
    } else {
      localStorage.removeItem("slb_token");
    }
  }, [token]);

  const { data: user, isLoading: isUserLoading, error } = useGetMe({
    query: {
      enabled: !!token,
      queryKey: getGetMeQueryKey(),
      retry: false,
    },
  });

  useEffect(() => {
    if (error && (error as any).status === 401) {
      setToken(null);
      setLocation("/login");
    }
  }, [error, setLocation]);

  const loginMutation = useLogin();
  const registerMutation = useRegister();

  const login = async (data: AuthInput) => {
    try {
      const res = await loginMutation.mutateAsync({ data });
      setToken(res.token);
      queryClient.setQueryData(getGetMeQueryKey(), res.user);
      setLocation("/");
    } catch (e: any) {
      toast({
        title: "Login Failed",
        description: e.message || "Invalid credentials",
        variant: "destructive",
      });
      throw e;
    }
  };

  const register = async (data: AuthInput) => {
    try {
      const res = await registerMutation.mutateAsync({ data });
      setToken(res.token);
      queryClient.setQueryData(getGetMeQueryKey(), res.user);
      setLocation("/");
    } catch (e: any) {
      toast({
        title: "Registration Failed",
        description: e.message || "An error occurred",
        variant: "destructive",
      });
      throw e;
    }
  };

  const logout = () => {
    setToken(null);
    queryClient.clear();
    setLocation("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user: user || null,
        token,
        isLoading: isUserLoading && !!token,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
