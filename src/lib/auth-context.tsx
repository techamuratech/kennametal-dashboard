'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { loginWithFirestore } from './firestore-service';

type UserRole = 'master' | 'admin' | 'user' | 'pending';

interface UserData {
  uid: string;
  email: string | null;
  role: UserRole;
  name: string | null;
  phone: string | null;
}

interface AuthContextType {
  user: User | null;
  userData: UserData | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Since we're not using Firebase Auth anymore, just set loading to false
    // You might want to check localStorage for persisted login state here
    const checkAuthState = () => {
      const savedUser = localStorage.getItem('currentUser');
      if (savedUser) {
        const userData = JSON.parse(savedUser);
        setUser({ uid: userData.uid, email: userData.email } as any);
        setUserData(userData);
      }
      setLoading(false);
    };
    
    checkAuthState();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const user = await loginWithFirestore(email, password);
      if (user) {
        const userData = {
          uid: user.id!,
          email: user.email,
          role: user.role as UserRole,
          name: user.name || null,
          phone: user.phone || null
        };
        
        setUserData(userData);
        setUser({
          uid: user.id!,
          email: user.email,
          emailVerified: true
        } as any);
        
        // Persist login state
        localStorage.setItem('currentUser', JSON.stringify(userData));
      }
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email);
  };

  const logout = async () => {
    setUser(null);
    setUserData(null);
    localStorage.removeItem('currentUser');
  };

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    resetPassword
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  // console.log("context", context)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
