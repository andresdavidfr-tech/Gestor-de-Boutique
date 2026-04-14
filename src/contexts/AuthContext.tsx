import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false });

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      
      if (user && user.uid) {
        // Save usage update automatically
        try {
          const userRef = doc(db, 'users', user.uid);
          await setDoc(userRef, {
            email: user.email,
            displayName: user.displayName,
            photoURL: user.photoURL,
            lastActive: serverTimestamp(),
            emailVerified: user.emailVerified
          }, { merge: true });
        } catch (error) {
          console.error("Error updating user profile:", error);
        }
      }
      
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const adminEmails = ['andresdavidfr@gmail.com', 'holalvsm@gmail.com'];
  const isAdmin = user?.email && adminEmails.includes(user.email) && user?.emailVerified;

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin: !!isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
