// ================================================
// FILE: src/pages/AccountPage.tsx
// ================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { clsx } from 'clsx';

const AccountPage: React.FC = () => {
    // Use context loading state (userLoading) primarily for disabling actions
    const { profile, user, signOut, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const [messageCount, setMessageCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(true);
    const [countError, setCountError] = useState<string | null>(null);
    // Keep isSigningOut specifically for the button's visual state during the async call
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        const fetchMessageCount = async () => {
            // Only fetch if user exists and context isn't loading user data
            if (!user?.id || userLoading) {
                setLoadingCount(false);
                return;
            }
            setLoadingCount(true);
            setCountError(null);
            try {
                // **IMPORTANT**: Ensure RLS policy exists on `messages` table:
                // `CREATE POLICY "Allow users to count their own messages" ON messages FOR SELECT USING (auth.uid() = user_id);`
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (error) throw error;
                setMessageCount(count ?? 0);
            } catch (err) {
                console.error("AccountPage: Error fetching message count:", err);
                setCountError("Couldn't load message count.");
                setMessageCount(null);
            } finally {
                setLoadingCount(false);
            }
        };
        // Trigger fetch only when userLoading is false
        if (!userLoading) {
            fetchMessageCount();
        } else {
            // If user context is still loading, reset count state
            setLoadingCount(true);
            setMessageCount(null);
            setCountError(null);
        }
    }, [user?.id, userLoading]); // Depend on user ID and the context's loading state

    const handleSignOut = async () => {
        if (isSigningOut || userLoading) return; // Prevent double clicks

        setIsSigningOut(true);
        await signOut();
        // Navigation is handled by UserContext listener after state updates.
        // No need to setIsSigningOut(false) here, the component will unmount or re-render.
        // If the sign-out fails and the component *doesn't* unmount,
        // the context `loading` state will become false, re-enabling the button.
        // The `isSigningOut` state primarily provides immediate visual feedback.
    };

    // Defensive check for user/profile data during render
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const displayInitial = displayName?.charAt(0)?.toUpperCase() ?? '?';
    const displayAvatar = profile?.avatar_url;

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate('/chat')} // Navigate back to chat
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back to Chat"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Account</h1>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">

                     {/* Display loading indicator if user context is loading */}
                     {userLoading && !profile && (
                         <div className="flex flex-col items-center text-secondary mb-6">
                             <Loader2 size={24} className="animate-spin mb-2" />
                             <p>Loading account info...</p>
                         </div>
                     )}

                     {/* Display profile info only when user context is not loading */}
                     {!userLoading && user && (
                         <>
                             {displayAvatar ? (
                                 <img src={displayAvatar} alt={displayName} className="w-20 h-20 rounded-full mb-4 shadow-sm" referrerPolicy="no-referrer" />
                             ) : (
                                 <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-4xl mb-4 shadow-sm">
                                     {displayInitial}
                                 </div>
                             )}

                             <p className="text-lg text-secondary mb-4">
                                 Signed in as <span className="font-semibold">{displayName}</span>
                             </p>

                             {loadingCount ? (
                                 <p className="text-3xl md:text-4xl font-serif text-secondary mb-3 flex items-center"><Loader2 size={28} className="animate-spin mr-2" /> Checking messages...</p>
                             ) : countError ? (
                                 <p className="text-red-500 mb-3">{countError}</p>
                             ) : (
                                 <h2 className="text-3xl md:text-4xl font-serif text-secondary mb-3">
                                     We've exchanged {messageCount ?? 0} messages!
                                 </h2>
                             )}

                             <Link
                                 to="/history"
                                 className="text-primary hover:underline font-medium mb-10 text-sm"
                             >
                                 Manage history
                             </Link>

                             <button
                                 onClick={handleSignOut}
                                 // Disable if either the sign-out action is in progress OR the main user context is still loading
                                 disabled={isSigningOut || userLoading}
                                 className={clsx(
                                     "px-6 py-2.5 border border-gray-300 rounded-full text-secondary hover:bg-gray-50 transition-colors text-sm font-medium flex items-center justify-center",
                                     (isSigningOut || userLoading) && "opacity-50 cursor-not-allowed"
                                  )}
                             >
                                  {isSigningOut ? (
                                      <>
                                         <Loader2 size={16} className="animate-spin mr-2" /> Signing out...
                                      </>
                                  ) : (
                                      "Sign out"
                                  )}
                             </button>
                         </>
                     )}

                     {/* Fallback if user disappears unexpectedly */}
                      {!userLoading && !user && (
                          <p className="text-red-500">User session lost. Please sign in again.</p>
                          // Optionally add a button to navigate to sign-in
                      )}

                </div>
            </div>
        </PageTransition>
    );
};

export default AccountPage;
