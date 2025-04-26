// src/components/sidebar_panels/ProfilePanel.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Settings,
  History,
  Languages, // Changed from Volume2
  MessageCircle, // Keep for feedback
  Share2,
  ExternalLink, // Using this for Discord
  Shield,
  FileText,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { clsx } from 'clsx';

// --- Prop to trigger share popup ---
interface ProfilePanelProps {
    openSharePopup: () => void;
}

const ProfilePanel: React.FC<ProfilePanelProps> = ({ openSharePopup }) => {
    const { userName } = useUser();
    const navigate = useNavigate();

    const profileItems = [
        { icon: Settings, label: 'Account', path: '/account', hasArrow: true },
        { icon: History, label: 'Manage history', path: '/history', hasArrow: true },
        { icon: Languages, label: 'Language settings', path: '/language-settings', hasArrow: true }, // Updated
        { icon: MessageCircle, label: 'Give feedback', path: '/feedback', hasArrow: false }, // Keep as link for now
        // Share is now a button handled below
    ];

    const communityItems = [
        { icon: ExternalLink, label: 'Join our Discord community', href: 'https://discord.com', target: '_blank' } // Replace with actual Discord link
    ];

    const policyItems = [
        { icon: Shield, label: 'Privacy policy', path: '/privacy' },
        { icon: FileText, label: 'Terms of service', path: '/terms' }
    ];

     const handleSignOut = () => {
        console.log("Signing out...");
        // Add actual sign out logic here (e.g., clear context, redirect)
        navigate('/'); // Example redirect
     }

  return (
    <div className="p-4 h-full flex flex-col justify-between overflow-y-auto">
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
                        <Link
                           key={item.path}
                           to={item.path}
                           className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                        >
                            <div className="flex items-center gap-3">
                                 <Icon size={20} strokeWidth={1.75} />
                                 <span className="truncate">{item.label}</span>
                            </div>
                             {item.hasArrow && <ChevronRight size={16} className="text-gray-400" />}
                        </Link>
                    );
                 })}
                  {/* Share Button */}
                 <button
                    onClick={openSharePopup} // Trigger popup
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
                      <Link
                         key={item.path}
                         to={item.path}
                         className="flex items-center gap-3 px-3 py-2 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                      >
                         <Icon size={20} strokeWidth={1.75} />
                         <span className="truncate">{item.label}</span>
                      </Link>
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
