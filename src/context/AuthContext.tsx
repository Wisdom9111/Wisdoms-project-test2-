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
      const authEmail = email.toLowerCase().trim();
      const res = await signInWithEmailAndPassword(auth, authEmail, password);
      const firebaseUser = res.user;

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      
      let fetchedUser: User;
      if (docSnap.exists()) {
        fetchedUser = docSnap.data() as User;
        
        // Auto-heal verified property if missing
        if (!fetchedUser.is_verified) {
          fetchedUser.is_verified = true;
          try {
            await setDoc(docRef, { is_verified: true }, { merge: true });
          } catch (e) {}
        }
        
        setUser(fetchedUser);
      } else {
        // Just in case auth exists but profile doesn't (from incomplete registration sync)
        fetchedUser = {
          uid: firebaseUser.uid,
          email: authEmail,
          role: role || 'student',
          name: authEmail.split('@')[0],
          is_verified: true,
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), fetchedUser);
        } catch (err) {
          console.error("Set doc ignored on fallback login:", err);
        }
        setUser(fetchedUser);
      }
      return fetchedUser;
    } catch (error: any) {
      console.error("Auth error:", error.code || error.message);
      throw error;
    }
  };

  const register = async (email: string, password: string, name: string, role: Role, level?: string) => {
    try {
      const authEmail = email.toLowerCase().trim();
      let firebaseUser;
      let existingRole: Role | undefined = undefined;
      let existingLevel: string | undefined = undefined;
      
      try {
        const res = await createUserWithEmailAndPassword(auth, authEmail, password);
        firebaseUser = res.user;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Auto-Login Recovery: If they've proven email ownership via OTP code but already existed, we log them in dynamically!
          const loginRes = await signInWithEmailAndPassword(auth, authEmail, password);
          firebaseUser = loginRes.user;
          
          // Pull existing data to not override their true role/level if they already set it
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data() as User;
            existingRole = existingData.role;
            existingLevel = existingData.level;
          }
        } else {
          throw authErr; // It's another type of error (weak pass, etc)
        }
      }

      const finalRole = existingRole || role;
      const finalLevel = existingLevel || level || '100L';

      const userData: any = {
        uid: firebaseUser.uid,
        email: authEmail,
        role: finalRole,
        name,
        is_verified: true,
      };

      if (finalRole === 'student') {
        userData.level = finalLevel;
      }

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), userData, { merge: true });
      } catch (err) {
        // Log explicitly, but do NOT throw an error that crashes the Register flow
        console.error("SetDoc Registration safely ignored:", err);
      }
      
      setUser(userData as User);
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
