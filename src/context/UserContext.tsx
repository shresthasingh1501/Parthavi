// src/context/UserContext.tsx
import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { Session, User, Provider } from '@supabase/supabase-js';
import { Database } from '../types/supabase';

export type Profile = Database['public']['Tables']['profiles']['Row'];

interface UserContextType {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean; // Renamed from contextLoading for clarity if needed elsewhere
  signInWithOAuth: (provider: Provider) => Promise<void>;
  signOut: () => Promise<void>;
  userName: string | null;
  refreshProfile: () => Promise<void>;
  authError: string | null;
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
  const [loading, setLoading] = useState(true); // Global loading state (auth check, profile fetch)
  const [authError, setAuthError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`UserContext: Fetching profile for user: ${userId}`);
    try {
      const { data, error, status } = await supabase
        .from('profiles')
        .select(`*`)
        .eq('id', userId)
        .single();

      if (error && status !== 406) {
        console.error('UserContext: Error fetching profile:', error.message, 'Status:', status);
        // Don't throw here, allow handling null profile
        return null;
      }

      if (data) {
        console.log('UserContext: Profile data found.');
        return data;
      } else {
        console.log('UserContext: No profile found for user.');
        return null;
      }
    } catch (error) {
      console.error('UserContext: Exception fetching profile:', error);
      return null;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    console.log("UserContext: Auth listener setup initiating.");
    setLoading(true);
    setAuthError(null);

    // Define handler function separately for clarity
    const handleAuthStateChange = async (_event: string, currentSession: Session | null) => {
        if (!isMounted) {
             console.log("UserContext: Auth change ignored, component unmounted.");
             return;
        }
        console.log("UserContext: Auth State Change Event:", _event, "User:", currentSession?.user?.id);
        setAuthError(null); // Clear previous errors on new event

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (_event === 'INITIAL_SESSION') {
            console.log("UserContext: Handling INITIAL_SESSION.");
            if (currentSession?.user) {
                const initialProfile = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                    setProfile(initialProfile);
                     // --- Initial Navigation Logic ---
                    const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
                    if (initialProfile) {
                        if (initialProfile.onboarding_complete) {
                            if (isOnAuthPages) { console.log("(Initial Load) Navigating to /chat"); navigate('/chat', { replace: true }); }
                        } else {
                            if (location.pathname !== '/welcome') { console.log("(Initial Load) Navigating to /welcome (onboarding incomplete)"); navigate('/welcome', { replace: true }); }
                        }
                    } else { // No profile yet
                        if (location.pathname !== '/welcome') { console.log("(Initial Load) Navigating to /welcome (no profile)"); navigate('/welcome', { replace: true }); }
                    }
                    // --- End Initial Navigation Logic ---
                    setLoading(false); // Done loading initial state
                }
            } else {
                // No initial session user
                setProfile(null);
                if (isMounted) setLoading(false); // Done loading initial state
                 // Ensure user is on sign-in page if not authenticated
                 if (location.pathname !== '/') {
                    console.log("UserContext: No initial session, redirecting to /");
                    navigate('/', { replace: true });
                 }
            }
        } else if (_event === 'SIGNED_IN') {
            console.log("UserContext: Handling SIGNED_IN event.");
            if (currentSession?.user) {
                // Fetch profile, listener will handle navigation based on profile state
                setLoading(true); // Set loading while fetching profile after sign in
                const fetchedProfile = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                  setProfile(fetchedProfile);
                  // Navigation logic based on profile and onboarding status
                  if (fetchedProfile) {
                      if (fetchedProfile.onboarding_complete) {
                           console.log("UserContext: Navigating to /chat (onboarding complete).");
                           navigate('/chat', { replace: true });
                      } else {
                           console.log("UserContext: Navigating to /welcome (onboarding needed).");
                           navigate('/welcome', { replace: true });
                      }
                  } else { // Profile fetch failed or trigger pending
                      console.warn("UserContext: Profile not found after SIGNED_IN, redirecting to onboarding.");
                      navigate('/welcome', { replace: true });
                  }
                  setLoading(false); // Finished processing sign-in
                }
            } else {
                // Should not happen for SIGNED_IN, but handle defensively
                console.error("UserContext: SIGNED_IN event received but no user session found.");
                setProfile(null);
                if (isMounted) setLoading(false);
                if (location.pathname !== '/') navigate('/', { replace: true }); // Go to sign-in if state is inconsistent
            }
        } else if (_event === 'SIGNED_OUT') {
             console.log("UserContext: Handling SIGNED_OUT event.");
             setProfile(null); // Clear profile
             setUser(null); // Ensure user is cleared
             setSession(null); // Ensure session is cleared
             if (isMounted) setLoading(false); // Stop loading
             // Only navigate if not already on the sign-in page
             if (location.pathname !== '/') {
                console.log("UserContext: Navigating to / on sign out.");
                navigate('/', { replace: true });
             }
        } else if (_event === 'USER_UPDATED') {
             console.log("UserContext: Handling USER_UPDATED event.");
             if (currentSession?.user && isMounted) {
                 console.log("UserContext: Refreshing profile due to USER_UPDATED.");
                 await refreshProfile(); // Use the existing refreshProfile function
             }
        } else if (_event === 'PASSWORD_RECOVERY') {
             console.log("UserContext: Handling PASSWORD_RECOVERY event.");
             // Usually means user clicked a password recovery link, might navigate to a reset page
             if (isMounted) setLoading(false); // Ensure loading stops
        } else if (_event === 'TOKEN_REFRESHED') {
             console.log("UserContext: Handling TOKEN_REFRESHED event.");
              if (isMounted && !currentSession?.user) {
                  // If token refresh fails and results in no user, treat as sign out
                   console.warn("UserContext: Token refresh resulted in null session, handling as sign out.");
                   setProfile(null);
                   setLoading(false);
                   if (location.pathname !== '/') navigate('/', { replace: true });
              } else if (isMounted) {
                   setLoading(false); // Ensure loading stops if it was somehow true
              }
        } else {
             console.log("UserContext: Unhandled auth event:", _event);
             if (isMounted) setLoading(false); // Ensure loading stops for unknown events
        }
    };

    // Initial session check
    supabase.auth.getSession().then(({ data: { session: initialSession } }) => {
       console.log("UserContext: Initial getSession result User:", initialSession?.user?.id);
       // Call the handler with INITIAL_SESSION event
       handleAuthStateChange('INITIAL_SESSION', initialSession);
    }).catch(error => {
       console.error("UserContext: Error in initial getSession:", error);
       if (isMounted) {
           setAuthError("Failed to check initial session.");
           setLoading(false);
           // Force sign-out state if getSession fails badly
            setSession(null);
            setUser(null);
            setProfile(null);
            if (location.pathname !== '/') navigate('/', { replace: true });
       }
    });

    // Auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(handleAuthStateChange);

    // Cleanup
    return () => {
        isMounted = false;
        console.log("UserContext: Unsubscribing auth listener.");
        subscription?.unsubscribe();
    };
  }, [fetchProfile, navigate, location.pathname]); // Removed refreshProfile from deps, handled inside listener

  const signInWithOAuth = async (provider: Provider) => {
    setLoading(true);
    setAuthError(null);
    console.log(`UserContext: Attempting signInWithOAuth with provider: ${provider}`);
    try {
      if (!supabase) throw new Error("Supabase client is not available.");

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin + '/chat', // Redirect directly to chat after successful OAuth
          // Ensure this matches Supabase Auth URL config AND Vercel/Netlify settings if applicable
        },
      });

      console.log(`UserContext: supabase.auth.signInWithOAuth response for ${provider}:`, { data });

      if (error) {
        console.error(`UserContext: Supabase Auth Error (${provider}):`, error);
        setAuthError(`Sign-in failed: ${error.message}`);
        setLoading(false); // Stop loading on explicit error
      }
      // On success, Supabase handles redirect. Listener handles state changes post-redirect.
      // Do NOT set loading false here on success, redirect is happening.
    } catch (err) {
      console.error(`UserContext: Unexpected error during signInWithOAuth (${provider}):`, err);
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-in.");
      setLoading(false);
    }
  };

  const signOut = async () => {
    console.log("UserContext: Attempting Supabase sign out...");
    setLoading(true); // Set loading true *during* the sign out process
    setAuthError(null);
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('UserContext: Error signing out:', error.message);
        setAuthError(`Sign-out failed: ${error.message}`);
      } else {
        console.log("UserContext: Supabase sign out successful.");
        // Clear state immediately here for faster UI response, listener will also confirm
        setProfile(null);
        setUser(null);
        setSession(null);
        // Navigate immediately here as well, listener might be slightly delayed
        if (location.pathname !== '/') {
            console.log("UserContext: Navigating to / immediately after sign out call.");
            navigate('/', { replace: true });
        }
      }
    } catch (err) {
      console.error('UserContext: Unexpected error during signOut:', err);
      setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-out.");
    } finally {
      // **CRITICAL FIX:** Always set loading false after the attempt,
      // regardless of success/error. The listener handles the *consequences*
      // of sign out (state clearing, nav), but this stops the immediate spinner.
      console.log("UserContext: Setting loading false in signOut finally block.");
      setLoading(false);
    }
  };

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log("UserContext: refreshProfile - No user, clearing profile.");
      setProfile(null);
      return;
    }
    console.log("UserContext: Refreshing profile for user:", user.id);
    // Indicate loading *only* if not already globally loading? Or allow it?
    // Let's allow it for now, as it's a specific action.
    // setLoading(true); // Optional: make profile refresh show loading
    const refreshedProfile = await fetchProfile(user.id);
    setProfile(refreshedProfile); // Update profile state
    // setLoading(false); // Optional: stop loading indicator
  }, [user, fetchProfile]); // Dependencies

  const userName = profile?.full_name || user?.email?.split('@')[0] || null;

  const value = {
    session,
    user,
    profile,
    loading, // Expose the global loading state
    signInWithOAuth,
    signOut,
    userName,
    refreshProfile,
    authError
  };

  // Render children only when initial loading is complete? Or let pages handle loading state?
  // Let's render children immediately and let individual pages/components use the `loading` state.
  return (
    <UserContext.Provider value={value}>
      {children}
    </UserContext.Provider>
  );
};
