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
  loading: boolean; // Indicates if the auth state is currently resolving
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
  const [loading, setLoading] = useState(true); // Start as true
  const [authError, setAuthError] = useState<string | null>(null); // Initialize error state
  const navigate = useNavigate();
  const location = useLocation();

  const fetchProfile = useCallback(async (userId: string): Promise<Profile | null> => {
    console.log(`[UserContext] Fetching profile for user: ${userId}`);
    try {
        const { data, error, status } = await supabase
            .from('profiles')
            .select(`*`)
            .eq('id', userId)
            .single();

        if (error && status !== 406) { // 406 means no rows found, which is okay initially
            console.error('[UserContext] Error fetching profile:', error.message);
            throw error;
        }

        if (data) {
            console.log('[UserContext] Profile data found:', data);
            return data;
        } else {
            console.log('[UserContext] No profile found for user, might need creation/update.');
            return null;
        }
    } catch (error) {
        console.error('[UserContext] Exception fetching profile:', error);
        return null;
    }
  }, []); // Keep dependencies if any

  const refreshProfile = useCallback(async () => {
    if (!user) {
      console.log("[UserContext] refreshProfile: No user, clearing profile.");
      setProfile(null);
      return;
    }
    console.log("[UserContext] refreshProfile: Refreshing profile for user:", user.id);
    // setLoading(true); // Might cause flicker, decide if profile refresh needs global loading indicator
    const refreshedProfile = await fetchProfile(user.id);
    setProfile(refreshedProfile);
    // setLoading(false); // Only if setting loading true above
  }, [user, fetchProfile]); // Dependencies


  useEffect(() => {
    let isMounted = true;
    setLoading(true); // Ensure loading is true when starting auth check
    setAuthError(null); // Clear errors on initial load/change

    // Initial session check - important for page load
    supabase.auth.getSession().then(async ({ data: { session: initialSession } }) => {
       if (!isMounted) return;
       console.log("[UserContext] Initial getSession result:", initialSession?.user?.id ? `User ID ${initialSession.user.id}` : 'No user');

       setSession(initialSession);
       setUser(initialSession?.user ?? null);

       if (initialSession?.user) {
           const initialProfile = await fetchProfile(initialSession.user.id);
           if (isMounted) {
             setProfile(initialProfile);
              // --- Initial Navigation Logic ---
              const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
              // Check if onboarding is complete AND they are on an auth page
              if (initialProfile?.onboarding_complete && isOnAuthPages) {
                   console.log("[UserContext] (Initial Load) Onboarding complete, on auth page. Navigating to /chat");
                   navigate('/chat', { replace: true });
              } else if (!initialProfile?.onboarding_complete && location.pathname !== '/welcome') {
                   // Onboarding needed, but not on welcome page
                   console.log("[UserContext] (Initial Load) Onboarding needed, not on welcome. Navigating to /welcome");
                   navigate('/welcome', { replace: true });
              } else if (!initialProfile && location.pathname !== '/welcome') {
                  // No profile yet, not on welcome page
                   console.log("[UserContext] (Initial Load) No profile, not on welcome. Navigating to /welcome");
                   navigate('/welcome', { replace: true });
              }
              // If onboarding complete and already on /chat, or onboarding needed and already on /welcome, stay put.
              // If no session and on /, stay put.
              // --- End Initial Navigation Logic ---
           }
       } else {
            // Explicitly set profile to null if no user in initial session
            if (isMounted) setProfile(null);
       }

       if (isMounted) setLoading(false); // Set loading false after initial check is fully processed
    }).catch(error => {
       console.error("[UserContext] Error in getSession:", error);
       if (isMounted) {
           setAuthError("Failed to check session. Please try again.");
           setLoading(false); // Stop loading on error
       }
    });


    // Auth state change listener - for sign in/out/updates during app lifecycle
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, currentSession) => {
        if (!isMounted) return;
        console.log("[UserContext] Auth State Change Event:", _event, "User ID:", currentSession?.user?.id || 'null');
        setAuthError(null); // Clear previous errors on new event

        // Update session and user state immediately
        setSession(currentSession);
        setUser(currentSession?.user ?? null);

        if (_event === 'SIGNED_IN') {
            console.log("[UserContext] Handling SIGNED_IN event.");
            if (currentSession?.user) {
                // Setting loading here ensures components waiting for user context show a loading state
                // while profile is being fetched/created.
                setLoading(true);
                const fetchedProfile = await fetchProfile(currentSession.user.id);
                if (isMounted) {
                  setProfile(fetchedProfile);
                  // Navigation logic based on profile and onboarding status
                  // Only navigate away from auth pages if onboarding status requires it
                  const isOnAuthPages = location.pathname === '/' || location.pathname === '/welcome';
                   if (fetchedProfile?.onboarding_complete) {
                       console.log("[UserContext] SIGNED_IN: Onboarding complete. Navigating to /chat.");
                        // Only navigate if currently on an auth page or root
                       if (isOnAuthPages) { navigate('/chat', { replace: true }); }
                   } else { // Profile exists but onboarding not complete OR profile didn't exist yet
                       console.log("[UserContext] SIGNED_IN: Onboarding needed or profile missing. Navigating to /welcome.");
                       // Always navigate to welcome if onboarding needed, regardless of current page (unless already on welcome)
                       if (location.pathname !== '/welcome') { navigate('/welcome', { replace: true }); }
                   }
                   setLoading(false); // Stop loading after profile fetch and potential navigation
                }
            } else {
                // Should theoretically not happen for SIGNED_IN, but handle defensively
                console.warn("[UserContext] SIGNED_IN event with no user.");
                setProfile(null);
                setLoading(false);
            }
        } else if (_event === 'SIGNED_OUT') {
             console.log("[UserContext] Handling SIGNED_OUT event.");
             setProfile(null); // Clear profile
             // Setting loading here ensures components waiting for user context transition smoothly
             setLoading(true); // Indicate state change is processing
             // Wait a moment before navigating to allow state changes to propagate
             setTimeout(() => {
                if (isMounted) {
                   setLoading(false); // Stop loading after timeout/navigation
                   // Only navigate if not already on the sign-in page to avoid loop
                   if (location.pathname !== '/') {
                       console.log("[UserContext] SIGNED_OUT: Navigating to /.");
                       navigate('/', { replace: true });
                   } else {
                       console.log("[UserContext] SIGNED_OUT: Already on sign-in page.");
                   }
                }
             }, 100); // Small delay
        } else if (_event === 'USER_UPDATED') {
             console.log("[UserContext] Handling USER_UPDATED event.");
             // Refresh profile data if the user object itself changed
             if (currentSession?.user) {
                 await refreshProfile(); // Use memoized refreshProfile
             }
             // No loading state change needed unless refreshProfile sets it
        } else if (_event === 'PASSWORD_RECOVERY') {
             console.log("[UserContext] Handling PASSWORD_RECOVERY event.");
             // Logic for password recovery (e.g., navigate to reset page)
        } else {
             // Other events like TOKEN_REFRESHED usually don't require UI changes
             console.log("[UserContext] Unhandled auth event:", _event);
             // Ensure loading stops if it was somehow still true
             if (!currentSession?.user) {
                 setProfile(null);
                 setLoading(false);
             }
        }
      }
    );

    // Cleanup function: unsubscribe and reset state on unmount
    return () => {
        isMounted = false;
        subscription?.unsubscribe();
        console.log("[UserContext] Cleanup: Unsubscribed and set isMounted = false.");
    };
  }, [fetchProfile, refreshProfile, navigate, location.pathname]); // Added refreshProfile dependency

  // --- Updated signInWithOAuth ---
  const signInWithOAuth = async (provider: Provider) => { // Use imported Provider type
    console.log(`[UserContext] Attempting signInWithOAuth with provider: ${provider}`);
    // Set loading immediately upon button click
    setLoading(true);
    setAuthError(null); // Clear previous errors

    try {
        if (!supabase) { throw new Error("Supabase client is not available."); }

        // Pass redirectTo explicitly
        const { data, error } = await supabase.auth.signInWithOAuth({
            provider: provider,
            options: {
                redirectTo: window.location.origin, // Ensure this matches Supabase redirect URLs
                scopes: provider === 'google' ? 'email profile' : undefined // Optional scopes
            },
        });

        console.log(`[UserContext] supabase.auth.signInWithOAuth response for ${provider}:`, { data });

        if (error) {
            console.error(`[UserContext] Supabase Auth Error (${provider}):`, error);
            setAuthError(`Sign-in failed: ${error.message}`); // Set error state
            setLoading(false); // Stop loading on error
        }
        // On success, Supabase handles the redirect. The onAuthStateChange listener will pick it up.
        // No need to set loading false here on success; listener handles it after redirect.

    } catch (err) {
        console.error(`[UserContext] Unexpected error during signInWithOAuth (${provider}):`, err);
        setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-in.");
        setLoading(false); // Stop loading on unexpected error
    }
  };
  // --- End Updated signInWithOAuth ---


  // --- Updated signOut ---
  const signOut = async () => {
    console.log("[UserContext] Attempting Supabase sign out...");
    setLoading(true); // Indicate sign out process is starting
    setAuthError(null); // Clear any previous auth errors
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
         console.error('[UserContext] Error signing out:', error.message);
         setAuthError(`Sign-out failed: ${error.message}`);
         setLoading(false); // Stop loading ONLY if the signOut call itself fails
      } else {
          console.log("[UserContext] Supabase sign out successful. State/navigation handled by listener.");
          // The onAuthStateChange listener for 'SIGNED_OUT' will update state and navigate.
          // Do NOT set loading false or clear state here directly.
      }
    } catch(err) {
       console.error('[UserContext] Unexpected error during signOut:', err);
       setAuthError(err instanceof Error ? err.message : "An unexpected error occurred during sign-out.");
       setLoading(false); // Stop loading on unexpected error
    }
  };
  // --- End Updated signOut ---

  // userName derived from profile or user email
  const userName = profile?.full_name || user?.email?.split('@')[0] || null;

  const value = {
      session,
      user,
      profile,
      loading, // Export loading state
      signInWithOAuth,
      signOut,
      userName,
      refreshProfile,
      authError // Expose error state
  };

  return ( <UserContext.Provider value={value}> {children} </UserContext.Provider> );
};
