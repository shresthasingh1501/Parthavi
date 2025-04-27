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
    ExternalLink // Added for Discord
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
    const { profile, user, signOut } = useUser();
    const navigate = useNavigate();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [messageCount, setMessageCount] = useState<number | null>(null);
    const [loadingCount, setLoadingCount] = useState(true);
    const [countError, setCountError] = useState<string | null>(null);

    useEffect(() => {
        const fetchMessageCount = async () => {
            if (!user?.id) {
                setLoadingCount(false);
                return;
            }
            setLoadingCount(true);
            setCountError(null);
            try {
                const { count, error } = await supabase
                    .from('messages')
                    .select('*', { count: 'exact', head: true })
                    .eq('user_id', user.id);

                if (error) throw error;
                setMessageCount(count ?? 0);
            } catch (err) {
                console.error("Error fetching message count:", err);
                setCountError("Couldn't load message count.");
                setMessageCount(null);
            } finally {
                setLoadingCount(false);
            }
        };

        fetchMessageCount();
    }, [user?.id]);

    const handleLinkClick = (path: string) => {
        navigate(path);
        if (isMobile) {
            onCloseMobileSidebar();
        }
    };

    const handleSignOut = async () => {
        await signOut();
        if (isMobile) {
            onCloseMobileSidebar();
        }
    };

    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const displayInitial = displayName.charAt(0).toUpperCase();
    const displayAvatar = profile?.avatar_url;

    const profileItems = [
        { name: 'Account', icon: User, path: '/account' },
        { name: 'Manage History', icon: History, path: '/history' },
        { name: 'Language', icon: Languages, path: '/language-settings' },
        { name: 'Give Feedback', icon: MessageSquare, path: '/feedback' },
        { name: 'Share Parthavi', icon: Share2, action: openSharePopup },
    ];

    const communityItems = [
         { name: 'Join Discord', icon: ExternalLink, href: 'https://discord.gg/your-invite-link', target: '_blank' } // Replace with your Discord link
    ];

    const policyItems = [
        { name: 'Terms of Service', icon: FileText, path: '/terms' },
        { name: 'Privacy Policy', icon: ShieldCheck, path: '/privacy' },
    ];

    return (
        <div className="p-4 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin">
            <div>
                <div className="flex items-center gap-3 mb-5 pl-1">
                    {displayAvatar ? (
                        <img src={displayAvatar} alt={displayName} className="w-9 h-9 rounded-full" referrerPolicy="no-referrer" />
                    ) : (
                        <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium text-lg">
                            {displayInitial}
                        </div>
                    )}
                    <div>
                        <h2 className="text-lg font-semibold font-serif text-secondary truncate leading-tight">
                            {displayName}
                        </h2>
                         {loadingCount ? (
                             <span className="text-xs text-gray-400 flex items-center"><Loader2 size={12} className="animate-spin mr-1" /> Loading messages...</span>
                         ) : countError ? (
                             <span className="text-xs text-red-500">{countError}</span>
                         ) : (
                            <span className="text-xs text-gray-500">{messageCount ?? 0} Messages</span>
                         )}
                    </div>
                </div>

                <div className="space-y-1 mb-6">
                    {profileItems.map((item) => (
                        <button
                            key={item.name}
                            onClick={() => item.path ? handleLinkClick(item.path) : item.action?.()}
                            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm font-medium"
                        >
                            <item.icon size={20} strokeWidth={1.75} className="text-gray-600" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>

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

            <div className="pt-4 border-t border-gray-200/80">
                 <div className="space-y-1 mb-3">
                    {policyItems.map((item) => (
                         <button
                            key={item.name}
                            onClick={() => handleLinkClick(item.path)}
                            className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                        >
                            <item.icon size={18} strokeWidth={1.75} className="text-gray-500" />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </div>
                <button
                    onClick={handleSignOut}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-sm"
                >
                    <LogOut size={18} strokeWidth={1.75} />
                    <span>Sign Out</span>
                </button>
            </div>
        </div>
    );
};

export default ProfilePanel;
