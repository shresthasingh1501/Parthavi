// src/components/sidebar_panels/ProfilePanel.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { /* ... icons ... */ LogOut } from 'lucide-react';
import { useUser } from '../../context/UserContext'; // Import useUser
import { clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive';

interface ProfilePanelProps {
    openSharePopup: () => void;
    onCloseMobileSidebar: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ openSharePopup, onCloseMobileSidebar }) => {
    // Get user info and signOut function from context
    const { profile, user, signOut } = useUser();
    const navigate = useNavigate();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    const handleLinkClick = (path: string) => {
        navigate(path);
        if (isMobile) {
            onCloseMobileSidebar();
        }
    };

    const handleSignOut = async () => {
        console.log("Signing out...");
        await signOut(); // Call the signOut function from context
        // Navigation is handled by the auth state listener in UserContext now
        // navigate('/'); // No need to navigate manually here
        if (isMobile) {
            onCloseMobileSidebar();
        }
    }

     // Determine display name and initial
    const displayName = profile?.full_name || user?.email?.split('@')[0] || 'User';
    const displayInitial = displayName.charAt(0).toUpperCase();
    const displayAvatar = profile?.avatar_url; // Use avatar if available

  // ... rest of your profile items, community items, policy items definitions ...

  return (
    <div className="p-4 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin ...">
        <div>
            {/* Profile Header */}
            <div className="flex items-center gap-3 mb-5 pl-2">
                {displayAvatar ? (
                   <img src={displayAvatar} alt={displayName} className="w-8 h-8 rounded-full" referrerPolicy="no-referrer" />
                ) : (
                   <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                      {displayInitial}
                   </div>
                )}
                <h2 className="text-lg font-semibold font-serif text-secondary truncate">
                     {displayName}
                </h2>
            </div>
             {/* Profile Action Items (using handleLinkClick) */}
             {/* ... */}
             {/* Share Button (using openSharePopup) */}
             {/* ... */}
        </div>
        {/* ... Community Links ... */}
        {/* ... Policy Links (using handleLinkClick) ... */}
         {/* Sign Out Button */}
         <div className="pt-4 border-t border-gray-200/80">
             {/* ... Policy items ... */}
             <button
                onClick={handleSignOut} // Use updated handler
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 transition-colors w-full text-sm"
             >
                <LogOut size={20} strokeWidth={1.75} />
                <span>Sign Out</span>
            </button>
        </div>
    </div>
  );
};

export default ProfilePanel;
