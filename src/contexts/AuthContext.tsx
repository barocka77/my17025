import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'quality_manager' | 'personnel' | 'super_admin';

interface UserProfile {
  role: UserRole | null;
  featureNotepad: boolean;
  isApproved: boolean;
}

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
  featureNotepad: boolean;
  isApproved: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshRole: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [role, setRole] = useState<UserRole | null>(null);
  const [featureNotepad, setFeatureNotepad] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchUserProfile = async (userId: string): Promise<UserProfile> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('role, feature_notepad, approved')
        .eq('id', userId)
        .maybeSingle();

      if (error || !data) {
        return { role: null, featureNotepad: false, isApproved: false };
      }

      return {
        role: data.role as UserRole | null,
        featureNotepad: data.feature_notepad ?? false,
        isApproved: data.approved ?? false,
      };
    } catch {
      return { role: null, featureNotepad: false, isApproved: false };
    }
  };

  const applyProfile = (profile: UserProfile) => {
    setRole(profile.role);
    setFeatureNotepad(profile.featureNotepad);
    setIsApproved(profile.isApproved);
  };

  const clearProfile = () => {
    setRole(null);
    setFeatureNotepad(false);
    setIsApproved(false);
  };

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        const profile = await fetchUserProfile(session.user.id);
        applyProfile(profile);
      } else {
        clearProfile();
      }
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (_event === 'SIGNED_IN') {
        localStorage.removeItem('acknowledged_urgent_deadlines');
      }

      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('acknowledged_urgent_deadlines');
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          const profile = await fetchUserProfile(session.user.id);
          applyProfile(profile);
        })();
      } else {
        clearProfile();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem('acknowledged_urgent_deadlines');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
  };

  const signOut = async () => {
    try {
      setUser(null);
      clearProfile();
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    } catch (error) {
      console.error('Error during sign out:', error);
      setUser(null);
      clearProfile();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const refreshRole = async () => {
    if (user) {
      const profile = await fetchUserProfile(user.id);
      applyProfile(profile);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, featureNotepad, isApproved, loading, signIn, signUp, signOut, refreshRole }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
