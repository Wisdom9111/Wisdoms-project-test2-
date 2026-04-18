import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  register: (email: string, password: string, name: string, role: Role, level?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setUser(docSnap.data() as User);
        } else {
          // Fallback if document doesn't exist yet but user is in Auth
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || 'User',
            role: 'student', // Default
          });
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async (email: string, password: string, role?: Role): Promise<User> => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = res.user;

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      
      let fetchedUser: User;
      if (docSnap.exists()) {
        fetchedUser = docSnap.data() as User;
        setUser(fetchedUser);
      } else {
        // Just in case auth exists but profile doesn't
        fetchedUser = {
          uid: firebaseUser.uid,
          email,
          role: role || 'student',
          name: email.split('@')[0],
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), fetchedUser);
        } catch (err) {
          handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
        }
        setUser(fetchedUser);
      }
      return fetchedUser;
    } catch (error: any) {
      if (error?.code === 'permission-denied') {
        // Handled silently above
      }
      console.error("Auth error:", error.code || error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: Role, level?: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      const firebaseUser = res.user;

      const userData: User = {
        uid: firebaseUser.uid,
        email,
        role,
        name,
        level: level || (role === 'student' ? '100L' : undefined),
      };

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), userData);
      } catch (err) {
        handleFirestoreError(err, OperationType.WRITE, `users/${firebaseUser.uid}`);
      }
      setUser(userData);
    } catch (error: any) {
      console.error("Register error:", error.code || error.message);
      throw error;
    }
  };

  const logout = async () => {
    try {
      sessionStorage.removeItem('activeLevel');
    } catch (e) {}
    await signOut(auth);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
