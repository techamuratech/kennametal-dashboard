'use client'
import React, { createContext, useContext, useEffect, useState } from 'react';
import { 
  User, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged 
} from 'firebase/auth';
import { doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { auth, db } from './firebase';
import { loginWithFirestore } from './firestore-service';
import { useToast } from './toast-context';

type UserRole = 'master' | 'admin' | 'user';

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
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isClient, setIsClient] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { showToast } = useToast();

  const logout = async () => {
    if (isLoggingOut) return; // Prevent multiple logout calls
    
    try {
      setIsLoggingOut(true);
      
      // Clear state first
      setUser(null);
      setUserData(null);
      
      // Clear localStorage
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
      }
      
      // Sign out from Firebase
      await signOut(auth);
      
      // Force navigation after a brief delay
      setTimeout(() => {
        window.location.replace('/login');
      }, 100);
      
    } catch (error) {
      console.error('Error during logout:', error);
      // Even if Firebase signout fails, clear local state
      setUser(null);
      setUserData(null);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('currentUser');
      }
      window.location.replace('/login');
    }
  };

  // Function to refresh user data from Firestore
  const refreshUserData = async () => {
    if (typeof window === 'undefined' || !isClient) return;
    
    const savedUser = localStorage.getItem('currentUser');
    if (!savedUser) return;

    try {
      const currentUserData = JSON.parse(savedUser);
      
      // Query Firestore for the latest user data
      const usersRef = collection(db, 'users');
      const q = query(usersRef, where('email', '==', currentUserData.email));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const userDoc = querySnapshot.docs[0];
        const latestUserData = userDoc.data();
        
        // Check if role or status has changed
        if (latestUserData.role !== currentUserData.role || 
            latestUserData.status !== currentUserData.status) {
          
          const updatedUserData = {
            uid: userDoc.id,
            email: latestUserData.email,
            role: latestUserData.role as UserRole,
            name: latestUserData.name || null,
            phone: latestUserData.phone || null
          };
          
          // Update state and localStorage
          setUserData(updatedUserData);
          setUser({
            uid: userDoc.id,
            email: latestUserData.email,
            emailVerified: true
          } as any);
          
          localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
          
          // Show notification if role changed (for active users) - only after hydration
          if (isClient && latestUserData.role !== currentUserData.role && latestUserData.status !== 'disabled') {
            setTimeout(() => {
              try {
                showToast(`Your role has been updated to: ${latestUserData.role.toUpperCase()}`, 'info');
              } catch (toastError) {
                console.error('Error showing role change toast:', toastError);
              }
            }, 100);
          }
          
          // If user is disabled, log them out immediately
          if (isClient && latestUserData.status === 'disabled' && !isLoggingOut) {
            setTimeout(() => {
              try {
                showToast('Your account has been disabled. You will be logged out.', 'error');
                setTimeout(() => logout(), 2000);
              } catch (toastError) {
                console.error('Error showing disabled account toast:', toastError);
                logout();
              }
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  useEffect(() => {
    setIsClient(true);
    
    const checkAuthState = () => {
      if (typeof window !== 'undefined') {
        const savedUser = localStorage.getItem('currentUser');
        if (savedUser) {
          const userData = JSON.parse(savedUser);
          setUser({ uid: userData.uid, email: userData.email } as any);
          setUserData(userData);
        }
      }
      setLoading(false);
    };
    
    checkAuthState();
  }, []);

  // Add event listeners only after client-side hydration
  useEffect(() => {
    if (!isClient || !userData || isLoggingOut) return;

    const handleVisibilityChange = () => {
      if (!document.hidden && userData && isClient && !isLoggingOut) {
        refreshUserData();
      }
    };

    const handleFocus = () => {
      if (userData && isClient && !isLoggingOut) {
        refreshUserData();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleFocus);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [userData, isClient, isLoggingOut]);

  const login = async (email: string, password: string) => {
    try {
      // Don't clear localStorage here - let logout handle it properly
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
        if (typeof window !== 'undefined') {
          localStorage.setItem('currentUser', JSON.stringify(userData));
        }
      }
    } catch (error) {
      throw error;
    }
  };

  const resetPassword = async (email: string) => {
    const { sendPasswordResetEmail } = await import('firebase/auth');
    await sendPasswordResetEmail(auth, email);
  };

  const value = {
    user,
    userData,
    loading,
    login,
    logout,
    resetPassword,
    refreshUserData
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
