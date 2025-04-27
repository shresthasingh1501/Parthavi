// ================================================
// FILE: src/components/sidebar_panels/ProfilePanel.tsx
// ================================================
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    User,
    History,
    Languages,
    MessageSquare,
    Share2,
    FileText,
    ShieldCheck,
    LogOut,
    Loader2,
    ExternalLink,
    AlertCircle // Added for error
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive';
import { supabase } from '../../lib/supabaseClient';

interface ProfilePanelProps {
    openSharePopup: () => void;
    onCloseMobileSidebar: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ openSharePopup, onCloseMobileSidebar }) => {
    // Use context loading state (userLoading)
    const { profile, user, signOut, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [messageCount, setMessageCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(true);
    const [countError, setCountError] = useState<string | null>(null);
    // State specifically for the sign out button's visual feedback
    const [isSigningOut, setIsSigningOut] = useState(false);

    useEffect(() => {
        const fetchMessageCount = async () => {
            // Check user and context loading state
            if (!user?.id || userLoading) {
                setLoadingCount(false);
                return;
            }
            setLoadingCount(true);
            setCountError(null);
            try {
                // Ensure RLS policy exists
                 const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (error) throw error;
                setMessageCount(count ?? 0);
            } catch (err) {
                console.error("ProfilePanel: Error fetching message count:", err);
                setCountError("Couldn't load count."); // Shorter error
                setMessageCount(null);
            } finally {
                setLoadingCount(false);
            }
        };

        if (!userLoading) {
            fetchMessageCount();
        } else {
            setLoadingCount(true);
            setMessageCount(null);
            setCountError(null);
        }
    }, [user?.id, userLoading]); // Depend on user context loading state

    const handleLinkClick = (path: string) => {
        navigate(path);
        if (isMobile) {
            onCloseMobileSidebar();
        }
    };

    const handleSignOut = async () => {
        if (isSigningOut || userLoading) return; // Prevent double clicks

        setIsSigningOut(true);
        await signOut();
        // Context listener handles navigation and final state updates
        // If sign-out fails, context `loading` becomes false, re-enabling button
        // No need to setIsSigningOut(false) here as component might unmount
        if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar optimistically on mobile
        }
    };

    const handleShareClick = () => {
        openSharePopup();
         if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar after opening popup on mobile
        }
    }

    // Defensive checks during render
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const displayInitial = displayName?.charAt(0)?.toUpperCase() ?? '?';
    const displayAvatar = profile?.avatar_url;

    const profileItems = [
        { name: 'Account', icon: User, path: '/account' },
        { name: 'Manage History', icon: History, path: '/history' },
        { name: 'Language', icon: Languages, path: '/language-settings' },
        { name: 'Give Feedback', icon: MessageSquare, path: '/feedback' },
        { name: 'Share Parthavi', icon: Share2, action: handleShareClick }, // Use wrapped action
    ];

    const communityItems = [
         { name: 'Join Discord', icon: ExternalLink, href: '#', target: '_blank' } // Placeholder Link
    ];

    const policyItems = [
        { name: 'Terms of Service', icon: FileText, path: '/terms' },
        { name: 'Privacy Policy', icon: ShieldCheck, path: '/privacy' },
    ];

    return (
        <div className="p-4 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin">
            <div>
                {/* User Info Section */}
                 <div className="flex items-center gap-3 mb-5 pl-1">
                    {userLoading && !profile ? (
                         <div className="flex items-center text-sm text-gray-500">
                             <Loader2 size={16} className="animate-spin mr-2" /> Loading...
                         </div>
                     ) : user ? (
                         <>
                             {displayAvatar ? (
                                 <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-full object-cover" referrerPolicy="no-referrer" />
                             ) : (
                                 <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-lg">
                                     {displayInitial}
                                 </div>
                             )}
                             <div>
                                 <h2 className="text-base font-semibold font-serif text-secondary truncate leading-tight">
                                     {displayName}
                                 </h2>
                                  {loadingCount ? (
                                      <span className="text-xs text-gray-400 flex items-center"><Loader2 size={12} className="animate-spin mr-1" /> Loading messages...</span>
                                  ) : countError ? (
                                      <span className="text-xs text-red-500 flex items-center gap-1" title={countError}><AlertCircle size={12} /> Count error</span>
                                  ) : (
                                     <span className="text-xs text-gray-500">{messageCount ?? 0} Messages</span>
                                  )}
                             </div>
                         </>
                     ) : (
                          <p className="text-sm text-gray-500">Not signed in.</p>
                     )}
                 </div>

                {/* Action Items */}
                <div className="space-y-1 mb-6">
                    {profileItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => item.path ? handleLinkClick(item.path) : item.action?.()}
                            // Disable buttons if user context is loading
                            disabled={userLoading && !item.action} // Keep share enabled maybe?
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm font-medium",
                                userLoading && !item.action && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <item.icon size={20} strokeWidth={1.75} className="text-gray-600" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>

                 {/* Community Items */}
                 <div className="space-y-1 mb-6">
                      <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-3 mb-1.5">Community</h3>
                      {communityItems.map((item) => (
                        <a
                            key={item.name}
                            href={item.href}
                            target={item.target}
                            rel="noopener noreferrer"
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm font-medium"
                        >
                            <item.icon size={20} strokeWidth={1.75} className="text-gray-600" />
                            <span>{item.name}</span>
                        </a>
                    ))}
                 </div>
            </div>

            {/* Footer Actions */}
            <div className="pt-4 border-t border-gray-200/80">
                 <div className="space-y-1 mb-3">
                    {policyItems.map((item) => (
                         <button
                            key={item.name}
                            onClick={() => handleLinkClick(item.path)}
                            // Disable if user context is loading
                            disabled={userLoading}
                            className={clsx(
                                "flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm",
                                userLoading && "opacity-50 cursor-not-allowed"
                            )}
                        >
                            <item.icon size={18} strokeWidth={1.75} className="text-gray-500" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleSignOut}
                    // Disable if sign out action is happening OR user context is loading
                    disabled={isSigningOut || userLoading || !user} // Also disable if no user
                    className={clsx(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-sm",
                        (isSigningOut || userLoading || !user) && "opacity-50 cursor-not-allowed"
                    )}
                >
                     {isSigningOut ? (
                         <>
                            <Loader2 size={18} strokeWidth={1.75} className="animate-spin" /> Signing Out...
                         </>
                     ) : (
                        <>
                           <LogOut size={18} strokeWidth={1.75} /> Sign Out
                        </>
                     )}
                </button>
            </div>
        </div>
    );
};

export default ProfilePanel;
