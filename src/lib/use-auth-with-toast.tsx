'use client';
import { useAuth } from './auth-context';
import { useToast } from './toast-context';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export function useAuthWithToast() {
  const auth = useAuth();
  const { showToast } = useToast();

  const refreshUserDataWithToast = async () => {
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
            role: latestUserData.role,
            name: latestUserData.name || null,
            phone: latestUserData.phone || null
          };
          
          // Update localStorage
          localStorage.setItem('currentUser', JSON.stringify(updatedUserData));
          
          // Use auth context's refreshUserData instead of reload
          await auth.refreshUserData();
          
          // Show notification if role changed
          if (latestUserData.role !== currentUserData.role) {
            showToast(
              `Your role has been updated to: ${latestUserData.role.toUpperCase()}`,
              'info',
              7000
            );
          }
          
          // If user is disabled, log them out immediately
          if (latestUserData.status === 'disabled') {
            showToast('Your account has been disabled. You will be logged out.', 'error', 3000);
            setTimeout(async () => {
              try {
                await auth.logout();
                // Force a clean navigation to login page
                window.location.href = '/login';
              } catch (error) {
                console.error('Logout error:', error);
                window.location.href = '/login';
              }
            }, 3000);
          }
        }
      }
    } catch (error) {
      console.error('Error refreshing user data:', error);
    }
  };

  return {
    ...auth,
    refreshUserDataWithToast
  };
}
