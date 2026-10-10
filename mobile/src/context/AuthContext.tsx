import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/services/supabase/supabaseClient';
import type { User, Session } from '@supabase/supabase-js';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  isLoading: boolean;
  signIn: (email: string, pass: string) => Promise<{ error: any }>;
  signUp: (name: string, email: string, pass: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  session: null,
  isLoading: true,
  signIn: async () => ({ error: null }),
  signUp: async () => ({ error: null }),
  signOut: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, pass: string) => {
    const res = await supabase.auth.signInWithPassword({ email, password: pass });
    return { error: res.error };
  };

  const signUp = async (name: string, email: string, pass: string) => {
    const res = await supabase.auth.signUp({
      email,
      password: pass,
      options: {
        data: { full_name: name },
      },
    });

    if (res.data.user && !res.error) {
      await supabase.from('users_profile').upsert({
        id: res.data.user.id,
        full_name: name,
        level: 'seed',
        total_km: 0,
        total_trees: 0,
        active_days: 1,
      });
    }

    return { error: res.error };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, isLoading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
