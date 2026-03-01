import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User } from '@supabase/supabase-js';

type UserRole = 'admin' | 'quality_manager' | 'personnel' | 'super_admin';

interface AuthContextType {
  user: User | null;
  role: UserRole | null;
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
  const [loading, setLoading] = useState(true);

  const fetchUserRole = async (userId: string) => {
    console.log('=== fetchUserRole START ===');
    console.log('User ID:', userId);
    console.log('Supabase client configured:', !!supabase);

    try {
      const { data, error, status, statusText } = await supabase
        .from('profiles')
        .select('role, email, full_name, id')
        .eq('id', userId)
        .maybeSingle();

      console.log('Query response:');
      console.log('  - Status:', status, statusText);
      console.log('  - Data:', data);
      console.log('  - Error:', error);

      if (error) {
        console.error('❌ Error fetching user role:', error);
        console.error('Error code:', error.code);
        console.error('Error message:', error.message);
        console.error('Error details:', error.details);
        console.error('Error hint:', error.hint);
        return null;
      }

      if (!data) {
        console.warn('⚠️ No profile found for user:', userId);
        console.warn('This means either:');
        console.warn('  1. The profile does not exist in the database');
        console.warn('  2. RLS policy is blocking access to the profile');
        return null;
      }

      console.log('✅ Profile fetched successfully:', {
        id: data.id,
        email: data.email,
        role: data.role,
        full_name: data.full_name
      });
      console.log('=== fetchUserRole END ===');

      return data.role as UserRole | null;
    } catch (err) {
      console.error('❌ Exception in fetchUserRole:', err);
      return null;
    }
  };

  useEffect(() => {
    console.log('🔄 AuthContext useEffect initialized');

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      console.log('📋 Initial session check:', {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      setUser(session?.user ?? null);
      if (session?.user) {
        console.log('👤 User authenticated, fetching role for:', session.user.id);
        const userRole = await fetchUserRole(session.user.id);
        console.log('📊 Role fetched, setting state to:', userRole);
        setRole(userRole);
      } else {
        console.log('❌ No session, user not authenticated');
        setRole(null);
      }
      setLoading(false);
      console.log('✅ Initial auth check complete, loading set to false');
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('🔔 Auth state change event:', _event, {
        hasSession: !!session,
        userId: session?.user?.id,
        userEmail: session?.user?.email,
      });

      if (_event === 'SIGNED_IN') {
        localStorage.removeItem('acknowledged_urgent_deadlines');
      }

      if (_event === 'SIGNED_OUT') {
        localStorage.removeItem('acknowledged_urgent_deadlines');
      }

      setUser(session?.user ?? null);
      if (session?.user) {
        (async () => {
          console.log('👤 Auth state changed, user exists, fetching role...');
          const userRole = await fetchUserRole(session.user.id);
          console.log('📊 Role fetched from auth state change, setting to:', userRole);
          setRole(userRole);
        })();
      } else {
        console.log('❌ Auth state changed, no user, clearing role');
        setRole(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    localStorage.removeItem('acknowledged_urgent_deadlines');

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) throw error;
  };

  const signUp = async (email: string, password: string) => {
    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) throw error;
  };

  const signOut = async () => {
    try {
      // Clear user state immediately
      setUser(null);
      setRole(null);

      // Sign out from Supabase (clears session from storage)
      await supabase.auth.signOut();

      // Manually clear all storage to ensure no cached auth data remains
      localStorage.clear();
      sessionStorage.clear();

      // Force reload to clear any cached state and return to login
      window.location.href = '/';
    } catch (error) {
      // Even if signOut fails, clear all state and storage
      console.error('Error during sign out:', error);
      setUser(null);
      setRole(null);
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/';
    }
  };

  const refreshRole = async () => {
    if (user) {
      console.log('Manually refreshing role for user:', user.id);
      const userRole = await fetchUserRole(user.id);
      console.log('Refreshed role from database:', userRole);
      setRole(userRole);
    }
  };

  return (
    <AuthContext.Provider value={{ user, role, loading, signIn, signUp, signOut, refreshRole }}>
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
