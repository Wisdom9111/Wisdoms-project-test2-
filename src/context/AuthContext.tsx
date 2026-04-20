import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Role } from '../types';
import { auth, db, handleFirestoreError, OperationType } from '../lib/firebase';
import { onAuthStateChanged, signOut, signInWithEmailAndPassword, createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string, role?: Role) => Promise<User>;
  register: (email: string, password: string, name: string, role: Role, level?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_EMAIL = 'wisdomezekiel28@gmail.com';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Heartbeat to track active presence
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (user && !user.is_suspended) {
      interval = setInterval(() => {
        try {
          setDoc(doc(db, 'users', user.uid), { last_active: serverTimestamp() }, { merge: true });
        } catch (e) {}
      }, 60000); // Only ping every minute to save Firebase reads/writes
    }
    return () => clearInterval(interval);
  }, [user]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const isAdmin = firebaseUser.email?.toLowerCase() === ADMIN_EMAIL;
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const userData = docSnap.data() as User;
          if (userData.is_suspended && !isAdmin) {
            // Immediately boot suspended users
            await signOut(auth);
            setUser(null);
          } else {
            // Force admin role if matched
            if (isAdmin && userData.role !== 'admin') {
              userData.role = 'admin';
              await setDoc(docRef, { role: 'admin' }, { merge: true });
            }
            
            // Initial heartbeat pulse
            try {
              await setDoc(docRef, { last_active: serverTimestamp() }, { merge: true });
            } catch (e) {}

            setUser(userData);
          }
        } else {
          // Fallback if document doesn't exist yet but user is in Auth
          setUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || '',
            name: firebaseUser.displayName || (isAdmin ? 'Master Admin' : 'User'),
            role: isAdmin ? 'admin' : 'student', // Default
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
      const isAdmin = authEmail === ADMIN_EMAIL;
      
      let firebaseUser;
      try {
        const res = await signInWithEmailAndPassword(auth, authEmail, password);
        firebaseUser = res.user;
      } catch (err: any) {
        if (isAdmin && (err.code === 'auth/user-not-found' || err.code === 'auth/invalid-credential')) {
          console.log("Auto-bootstrapping Master Admin account...");
          try {
            const createRes = await createUserWithEmailAndPassword(auth, authEmail, password);
            firebaseUser = createRes.user;
          } catch (createErr: any) {
            if (createErr.code === 'auth/email-already-in-use') {
              throw new Error("Admin password incorrect. The account exists, but this isn't the right password. Please click 'Forgot Password'.");
            }
            throw createErr;
          }
        } else {
          throw err;
        }
      }

      const docRef = doc(db, 'users', firebaseUser.uid);
      const docSnap = await getDoc(docRef);
      
      let fetchedUser: User;
      if (docSnap.exists()) {
        fetchedUser = docSnap.data() as User;

        if (fetchedUser.is_suspended && !isAdmin) {
          await signOut(auth);
          throw new Error("Your account has been suspended by the administrator.");
        }
        
        // Auto-heal verified property if missing
        if (!fetchedUser.is_verified) {
          fetchedUser.is_verified = true;
          try {
            await setDoc(docRef, { is_verified: true, last_active: serverTimestamp() }, { merge: true });
          } catch (e) {}
        } else {
          try {
            await setDoc(docRef, { last_active: serverTimestamp() }, { merge: true });
          } catch(e) {}
        }
        
        if (isAdmin && fetchedUser.role !== 'admin') {
          fetchedUser.role = 'admin';
          await setDoc(docRef, { role: 'admin' }, { merge: true });
        }
        
        setUser(fetchedUser);
      } else {
        // Just in case auth exists but profile doesn't (from incomplete registration sync)
        fetchedUser = {
          uid: firebaseUser.uid,
          email: authEmail,
          role: isAdmin ? 'admin' : (role || 'student'),
          name: isAdmin ? 'System Admin' : authEmail.split('@')[0],
          is_verified: true,
        };
        try {
          await setDoc(doc(db, 'users', firebaseUser.uid), { ...fetchedUser, last_active: serverTimestamp() });
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
      const isAdmin = authEmail === ADMIN_EMAIL;
      let firebaseUser;
      let existingRole: Role | undefined = undefined;
      let existingLevel: string | undefined = undefined;
      let isSuspended = false;
      
      try {
        const res = await createUserWithEmailAndPassword(auth, authEmail, password);
        firebaseUser = res.user;
      } catch (authErr: any) {
        if (authErr.code === 'auth/email-already-in-use') {
          // Auto-Login Recovery
          const loginRes = await signInWithEmailAndPassword(auth, authEmail, password);
          firebaseUser = loginRes.user;
          
          // Pull existing data to not override their true role/level if they already set it
          const docRef = doc(db, 'users', firebaseUser.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            const existingData = docSnap.data() as User;
            existingRole = existingData.role;
            existingLevel = existingData.level;
            isSuspended = !!existingData.is_suspended;
          }
        } else {
          throw authErr;
        }
      }

      if (isSuspended && !isAdmin) {
         await signOut(auth);
         throw new Error("This account is permanently suspended from registering.");
      }

      const finalRole = isAdmin ? 'admin' : (existingRole || role);
      const finalLevel = existingLevel || level || '100L';

      const userData: any = {
        uid: firebaseUser.uid,
        email: authEmail,
        role: finalRole,
        name,
        is_verified: true,
        created_at: serverTimestamp(),
      };

      if (finalRole === 'lecturer') {
        // All brand new lecturers must wait for Master Admin to toggle this bool
        userData.is_approved = false;
      }

      if (finalRole === 'student') {
        userData.level = finalLevel;
      }

      try {
        await setDoc(doc(db, 'users', firebaseUser.uid), { ...userData, last_active: serverTimestamp() }, { merge: true });
      } catch (err) {
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
      if (user) {
        // clear last active on manual logout
        await setDoc(doc(db, 'users', user.uid), { last_active: null }, { merge: true });
      }
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
