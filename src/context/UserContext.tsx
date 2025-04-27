// src/context/UserContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Session, User, Provider } from '@supabase/supabase-js'; // Import Provider type
import { Database } from '../types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signInWithOAuth: (provider: Provider) => Promise<void>; // Use imported Provider type
  signOut: () => Promise<void>;
  userName: string | null;
  refreshProfile: () => Promise<void>;
  authError: string | null; // Add state for auth errors
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
  const [authError, setAuthError] = useState<string | null>(null); // Initialize error state
  const navigate = useNavigate();
  const location = useLocation();

  // Fetch Profile function (keep your implementation)
  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`Fetching profile for user: ${userId}`);
    try {
        const { data, error, status } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', userId)
            .single();

        if (error && status !== 406) { // 406 means no rows found, which is okay initially
            console.error('Error fetching profile:', error.message);
            throw error;
        }

        if (data) {
            console.log('Profile data found:', data);
            return data;
        } else {
            console.log('No profile found for user, might need creation/update.');
            return null;
        }
    } catch (error) {
        console.error('Exception fetching profile:', error);
        return null;
    }
  }, []); // Keep dependencies if any

  // Auth State Change Listener (keep your existing logic, logging is already good)
  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setAuthError(null); // Clear errors on initial load/change

    // Initial session check
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
       if (!isMounted) return;
       console.log("Initial getSession result:", initialSession?.user?.id);
       setSession(initialSession);
       setUser(initialSession?.user ?? null);
       if (initialSession?.user) {
           const initialProfile = await fetchProfile(initialSession.user.id);
           if (isMounted) {
             setProfile(initialProfile);
              // --- Initial Navigation Logic ---
              const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
              if (initialProfile) {
                if (initialProfile.onboarding_complete) {
                    if (isOnAuthPages) { console.log("(Initial Load) Navigating to /chat"); navigate('/chat', { replace: true }); }
                } else {
                    // Needs onboarding, ensure they are on /welcome if not already
                    if (location.pathname === '/') { console.log("(Initial Load) Navigating to /welcome"); navigate('/welcome', { replace: true }); }
                }
              } else { // No profile yet
                  // Should be directed to onboarding
                  if (location.pathname === '/') { console.log("(Initial Load) Navigating to /welcome (no profile)"); navigate('/welcome', { replace: true }); }
              }
              // --- End Initial Navigation Logic ---
           }
       }
       if (isMounted) setLoading(false); // Set loading false after initial check
    }).catch(error => {
       console.error("Error in getSession:", error);
       if (isMounted) setLoading(false);
    });


    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;
        console.log("Auth State Change Event:", _event, "User:", currentSession?.user?.id);
        setAuthError(null); // Clear previous errors on new event

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (_event === 'INITIAL_SESSION') {
             // Already handled by getSession above, just update state
             if (!currentSession?.user) {
                setProfile(null);
                setLoading(false); // Ensure loading stops if initial session is null
             }
             // No navigation needed here, getSession handles initial nav
        } else if (_event === 'SIGNED_IN') {
            console.log("Handling SIGNED_IN event.");
            if (currentSession?.user) {
                setLoading(true);
                const fetchedProfile = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                  setProfile(fetchedProfile);
                  // Navigation logic based on profile and onboarding status
                  const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
                  if (fetchedProfile) {
                      if (fetchedProfile.onboarding_complete) {
                           console.log("Navigating to /chat (onboarding complete).");
                           navigate('/chat', { replace: true });
                      } else {
                           console.log("Navigating to /welcome (onboarding needed).");
                           navigate('/welcome', { replace: true });
                      }
                  } else { // Profile fetch failed or trigger pending
                      console.warn("Profile not found after SIGNED_IN.");
                      console.log("Navigating to /welcome (profile missing after sign in).");
                      navigate('/welcome', { replace: true }); // Go to onboarding if profile missing
                  }
                  setLoading(false);
                }
            } else {
                // Should not happen for SIGNED_IN, but handle defensively
                setProfile(null);
                setLoading(false);
            }
        } else if (_event === 'SIGNED_OUT') {
             console.log("Handling SIGNED_OUT event.");
             setProfile(null); // Clear profile
             setLoading(false); // Stop loading
             // Only navigate if not already on the sign-in page
             if (location.pathname !== '/') {
                console.log("Navigating to / on sign out.");
                navigate('/', { replace: true });
             }
        } else if (_event === 'USER_UPDATED') {
             console.log("Handling USER_UPDATED event.");
             // May need to refresh profile if relevant user details changed
             if (currentSession?.user) {
                 await refreshProfile();
             }
        } else if (_event === 'PASSWORD_RECOVERY') {
             console.log("Handling PASSWORD_RECOVERY event.");
             // Might navigate to a password reset page if needed
        } else {
             // Other events like TOKEN_REFRESHED usually don't require UI changes
             console.log("Unhandled auth event:", _event);
             // Ensure loading stops if it was somehow still true
             if (!currentSession?.user) setProfile(null);
             setLoading(false);
        }
      }
    );

    return () => { isMounted = false; subscription?.unsubscribe(); };
  }, [fetchProfile, navigate, location.pathname]); // Add refreshProfile to dependencies if needed


  // --- Updated signInWithOAuth ---
  const signInWithOAuth = async (provider: Provider) => { // Use imported Provider type
    setLoading(true);
    setAuthError(null); // Clear previous errors
    console.log(`UserContext: Attempting signInWithOAuth with provider: ${provider}`);
    try {
        // Ensure supabase client is available
        if (!supabase) {
            throw new Error("Supabase client is not available.");
        }
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                // **CRITICAL**: Ensure this matches a URL listed in your Supabase Auth->URL Configuration->Redirect URLs
                // For local dev, it's typically the base URL Vite runs on.
                // For production, it's your deployed app's base URL.
                redirectTo: window.location.origin,
                // Optional: Add scopes if needed, e.g., for Google 'profile email' is default
                // scopes: 'profile email'
            },
        });

        console.log(`UserContext: supabase.auth.signInWithOAuth response for ${provider}:`, { data });

        if (error) {
            console.error(`UserContext: Supabase Auth Error (${provider}):`, error);
            setAuthError(`Sign-in failed: ${error.message}`); // Set error state
            setLoading(false); // Stop loading on error
        }
        // On success, Supabase handles the redirect. The listener will pick up the SIGNED_IN event after redirect.
        // No need to setLoading(false) here on success.

    } catch (err) {
        console.error(`UserContext: Unexpected error during signInWithOAuth (${provider}):`, err);
        setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-in.");
        setLoading(false);
    }
  };
  // --- End Updated signInWithOAuth ---


  // --- Updated signOut ---
  const signOut = async () => {
    console.log("UserContext: Attempting Supabase sign out...");
    setLoading(true); // Show loading during sign out process
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
         console.error('UserContext: Error signing out:', error.message);
         setAuthError(`Sign-out failed: ${error.message}`);
         setLoading(false); // Stop loading ONLY if the signout call itself fails
      } else {
          console.log("UserContext: Supabase sign out successful, Auth listener should handle state clear and navigation.");
          // State (session, user, profile) and navigation are handled by the onAuthStateChange listener responding to SIGNED_OUT event
          // Do NOT set loading false here, let the listener do it.
      }
    } catch(err) {
       console.error('UserContext: Unexpected error during signOut:', err);
       setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-out.");
       setLoading(false);
    }
  };
  // --- End Updated signOut ---

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log("refreshProfile: No user, clearing profile.");
      setProfile(null);
      return;
    }
    console.log("refreshProfile: Refreshing profile for user:", user.id);
    setLoading(true); // Indicate loading during refresh
    const refreshedProfile = await fetchProfile(user.id);
    setProfile(refreshedProfile);
    setLoading(false); // Stop loading after refresh attempt
  }, [user, fetchProfile]); // Dependencies

  const userName = profile?.full_name || user?.email?.split('@')[0] || null;

  const value = {
      session,
      user,
      profile,
      loading,
      signInWithOAuth,
      signOut,
      userName,
      refreshProfile,
      authError // Expose error state
  };

  return ( <UserContext.Provider value={value}> {children} </UserContext.Provider> );
};
