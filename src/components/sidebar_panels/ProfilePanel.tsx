// src/components/sidebar_panels/ProfilePanel.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  History,
  Languages,
  MessageCircle,
  Share2,
  ExternalLink,
  Shield,
  FileText,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive'; // Import useMediaQuery

// --- Prop to trigger share popup and close mobile sidebar ---
interface ProfilePanelProps {
    openSharePopup: () => void;
    onCloseMobileSidebar: () => void; // Prop to close the mobile sidebar
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ openSharePopup, onCloseMobileSidebar }) => {
    const { userName } = useUser();
    const navigate = useNavigate();
     const isMobile = useMediaQuery({ query: '(max-width: 768px)' }); // Detect mobile screen


    const handleLinkClick = (path: string) => {
        navigate(path);
        if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar on mobile after navigation
        }
    };

     const handleSignOut = () => {
        console.log("Signing out...");
        // Add actual sign out logic here (e.g., clear context, redirect)
        navigate('/'); // Example redirect
         if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar on mobile after navigation
        }
     }

  const profileItems = [
      // Modify to use handleLinkClick instead of direct Link component
        { icon: Settings, label: 'Account', path: '/account', hasArrow: true },
        { icon: History, label: 'Manage history', path: '/history', hasArrow: true },
        { icon: Languages, label: 'Language settings', path: '/language-settings', hasArrow: true },
        { icon: MessageCircle, label: 'Give feedback', path: '/feedback', hasArrow: false },
        // Share is now a button handled below
    ];

    const communityItems = [
        // Use a for external links, no close necessary as it opens a new tab
        { icon: ExternalLink, label: 'Join our Discord community', href: 'https://discord.com', target: '_blank' }
    ];

    const policyItems = [
         // Modify to use handleLinkClick instead of direct Link component
        { icon: Shield, label: 'Privacy policy', path: '/privacy' },
        { icon: FileText, label: 'Terms of service', path: '/terms' }
    ];


  return (
    <div className="p-4 h-full flex flex-col justify-between overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent -mr-1 pr-1">
        <div>
            {/* Profile Header */}
            <div className="flex items-center gap-3 mb-5 pl-2">
                {/* You might want a profile picture placeholder here */}
                <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary font-medium">
                   {userName ? userName.charAt(0).toUpperCase() : '?'}
                </div>
                <h2 className="text-lg font-semibold font-serif text-secondary truncate">
                     {userName || 'Profile'}
                </h2>
            </div>


             {/* Profile Action Items */}
             <div className="space-y-1 mb-4">
                 {profileItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        // Use a button or div and onClick instead of Link directly
                        <button
                           key={item.path}
                           onClick={() => handleLinkClick(item.path)}
                           className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                        >
                            <div className="flex items-center gap-3">
                                 <Icon size={20} strokeWidth={1.75} />
                                 <span className="truncate">{item.label}</span>
                            </div>
                             {item.hasArrow && <ChevronRight size={16} className="text-gray-400" />}
                        </button>
                    );
                 })}
                  {/* Share Button */}
                 <button
                    onClick={() => {
                        openSharePopup(); // Trigger popup
                        if (isMobile) {
                            onCloseMobileSidebar(); // Close sidebar on mobile after triggering popup
                        }
                    }}
                    className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm text-left"
                 >
                    <div className="flex items-center gap-3">
                         <Share2 size={20} strokeWidth={1.75} />
                         <span className="truncate">Share Parthavi with others</span>
                    </div>
                    {/* No arrow for share button */}
                 </button>
             </div>

             {/* Community Links */}
             <div className="space-y-1">
                 {communityItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <a // Use <a> for external links
                         key={item.label}
                         href={item.href}
                         target={item.target}
                         rel="noopener noreferrer" // Security best practice
                         className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                      >
                         <Icon size={20} strokeWidth={1.75} />
                         <span className="truncate">{item.label}</span>
                          {/* Add an external link icon */}
                          <ExternalLink size={14} className="text-gray-400 flex-shrink-0" />
                      </a>
                    );
                 })}
             </div>
        </div>

        {/* Policy and Sign Out */}
        <div className="pt-4 border-t border-gray-200/80">
            {/* Policy Links */}
            <div className="space-y-1 mb-3">
                 {policyItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <button // Use button/onClick for internal navigation
                         key={item.path}
                         onClick={() => handleLinkClick(item.path)}
                         className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                      >
                         <Icon size={20} strokeWidth={1.75} />
                         <span className="truncate">{item.label}</span>
                      </button>
                    );
                 })}
             </div>
             {/* Sign Out Button */}
             <button
                onClick={handleSignOut}
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
