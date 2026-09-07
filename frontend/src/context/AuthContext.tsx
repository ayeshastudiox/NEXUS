import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';

interface User {
  id: number;
  email: string;
  name: string;
  role: string;
  company_name: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (token: string, userData: User) => void;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  login: () => {},
  logout: () => {},
  isAdmin: false,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('nexus-token');
    const savedUser = localStorage.getItem('nexus-user');
    if (token && savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('nexus-token');
        localStorage.removeItem('nexus-user');
      }
    }
    setLoading(false);
  }, []);

  const loginFn = (token: string, userData: User) => {
    localStorage.setItem('nexus-token', token);
    localStorage.setItem('nexus-user', JSON.stringify(userData));
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('nexus-token');
    localStorage.removeItem('nexus-user');
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login: loginFn, logout, isAdmin: user?.role === 'ADMIN' }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
