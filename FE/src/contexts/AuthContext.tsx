'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  login: (email: string, password: string) => Promise<boolean>;
  register: (firstName: string, lastName: string, email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');

    if (storedToken && storedUser) {
      setToken(storedToken);
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        // Decode token to get user info (simplified)
        const payload = JSON.parse(atob(data.token.split('.')[1]));
        const userData = {
          id: payload.sub,
          email: payload.email,
          firstName: payload['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name'] || '',
          lastName: '',
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const register = async (firstName: string, lastName: string, email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'https://prn232-assignment2.onrender.com'}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ firstName, lastName, email, password }),
      });

      if (response.ok) {
        const data = await response.json();
        setToken(data.token);
        const userData = {
          id: data.userId || '',
          email,
          firstName,
          lastName,
        };
        setUser(userData);
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(userData));
        return { success: true };
      } else {
        // Try to get error details from response
        let errorMessage = 'Registration failed';
        try {
          const errorData = await response.json();
          console.log('Error data:', errorData); // Debug log
          if (Array.isArray(errorData)) {
            // Handle ASP.NET Identity errors array format
            const errorMessages = errorData.map((error: { description?: string; message?: string; [key: string]: unknown }) => error.description || error.message || String(error));
            errorMessage = errorMessages.join('\n• ');
            errorMessage = '• ' + errorMessage;
          } else if (errorData.errors) {
            // Handle ASP.NET Identity errors object format
            const errorMessages = [];
            for (const field in errorData.errors) {
              errorMessages.push(...errorData.errors[field]);
            }
            errorMessage = errorMessages.join('. ');
          } else if (errorData.message) {
            errorMessage = errorData.message;
          } else if (errorData.title) {
            errorMessage = errorData.title;
          }
        } catch (parseError) {
          console.log('Parse error:', parseError); // Debug log
          // If we can't parse JSON, use status text
          errorMessage = response.statusText || 'Registration failed';
        }
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('Register error:', error);
      return { success: false, error: 'Network error. Please try again.' };
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  const value: AuthContextType = {
    user,
    token,
    login,
    register,
    logout,
    isLoading,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};