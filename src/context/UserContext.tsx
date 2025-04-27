// src/context/UserContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Session, User } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithOAuth: (provider: 'google' | 'linkedin_oidc') => Promise<void>;
  signOut: () => Promise<void>;
  userName: string | null;
  refreshProfile: () => Promise<void>;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = (): UserContextType => {
  const context = useContext(UserContext);
  if (!context) { throw new Error('useUser must be used within a UserProvider'); }
  return context;
};

interface UserProviderProps {
  children: ReactNode;
}

export const UserProvider: React.FC<UserProviderProps> = ({ children }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => { /* ... */ }, []);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);

    const handleNavigation = (currentSession: Session | null, currentProfile: Profile | null) => { /* ... */ };

    // Initial session check (keep as is)
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => { /* ... */ }).catch(error => { /* ... */ });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;
        console.log("Auth State Change Event:", _event, "User:", currentSession?.user?.id);

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (_event === 'SIGNED_OUT' || !currentSession?.user) {
             // Explicitly handle SIGNED_OUT or null session
             console.log("Handling SIGNED_OUT or null session.");
             setProfile(null); // Clear profile
             setLoading(false); // Stop loading
             if (location.pathname !== '/') {
                console.log("Navigating to / on sign out.");
                navigate('/', { replace: true });
             }
        } else if (currentSession?.user) {
            // Handle SIGNED_IN or INITIAL_SESSION with a user
             console.log("Handling SIGNED_IN or INITIAL_SESSION.");
             setLoading(true); // Start loading for profile fetch
             const fetchedProfile = await fetchProfile(currentSession.user.id);
             // Navigation logic based on profile and onboarding status
             const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
             if (fetchedProfile) {
                 if (fetchedProfile.onboarding_complete) {
                     if (isOnAuthPages) { console.log("Navigating to /chat (onboarding complete)."); navigate('/chat', { replace: true }); }
                 } else {
                     if (location.pathname === '/') { console.log("Navigating to /welcome (onboarding needed)."); navigate('/welcome', { replace: true }); }
                 }
             } else { // Profile fetch failed or trigger pending
                 console.warn("Profile not found after auth change.");
                 if (location.pathname === '/') { console.log("Navigating to /welcome (profile missing)."); navigate('/welcome', { replace: true }); }
             }
             setLoading(false); // Stop loading after profile check/navigation attempt
        } else {
             // Catch any other unexpected null session case
             setProfile(null);
             setLoading(false);
             if (location.pathname !== '/') { navigate('/', { replace: true }); }
        }
      }
    );

    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [fetchProfile, navigate, location.pathname]);


  const signInWithOAuth = async (provider: 'google' | 'linkedin_oidc') => { /* ... */ };

  const signOut = async () => {
    console.log("Attempting Supabase sign out...");
    setLoading(true); // Optionally show loading during sign out
    const { error } = await supabase.auth.signOut();
    // **Do not** setLoading(false) here. Let the listener handle it.
    if (error) {
       console.error('Error signing out:', error.message);
       setLoading(false); // Stop loading ONLY if the signout call itself fails
    } else {
        console.log("Supabase sign out successful, waiting for listener...");
        // The listener should detect the change and navigate/clear state.
    }
  };

  const refreshProfile = useCallback(async () => { /* ... */ }, [user, fetchProfile]);
  const userName = profile?.full_name || user?.email?.split('@')[0] || null;
  const value = { session, user, profile, loading, signInWithOAuth, signOut, userName, refreshProfile };

  return ( <UserContext.Provider value={value}> {children} </UserContext.Provider> );
};
