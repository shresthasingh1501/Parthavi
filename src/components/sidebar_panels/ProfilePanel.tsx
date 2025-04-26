import React from 'react';
import { Link } from 'react-router-dom'; // Keep Link for external/policy pages
import {
  User, // Re-use User for Account
  History,
  Volume2,
  Share2,
  MessageCircle,
  Shield,
  FileText,
  Settings, // Keep settings icon
  ChevronRight,
  LogOut
} from 'lucide-react';
import { useUser } from '../../context/UserContext';
import { clsx } from 'clsx';

const ProfilePanel = () => {
    const { userName } = useUser();

    // Combine all items previously in sidebar lower sections
    const profileItems = [
        { icon: Settings, label: 'Account', path: '/account', hasArrow: true },
        { icon: History, label: 'Manage history', path: '/history', hasArrow: true },
        { icon: Volume2, label: 'Voice settings', path: '/voice', hasArrow: true },
        { icon: MessageCircle, label: 'Give feedback', path: '/feedback' },
        { icon: Share2, label: 'Share Parthavi', path: '/share' }
        // Add 'Join our Discord community' if needed: { icon: DiscordIcon, label: 'Join Discord', path: '/discord'}
    ];

    const policyItems = [
        { icon: Shield, label: 'Privacy policy', path: '/privacy' },
        { icon: FileText, label: 'Terms of service', path: '/terms' }
    ];

     // Dummy sign out function
     const handleSignOut = () => {
        console.log("Signing out...");
        // Add actual sign out logic here
     }

  return (
    <div className="p-4 h-full flex flex-col justify-between overflow-y-auto">
        <div>
            <h2 className="text-xl font-semibold font-serif text-secondary mb-4">
                 {userName || 'Profile'}
            </h2>

             <div className="space-y-1">
                 {profileItems.map((item) => {
                    const Icon = item.icon;
                    const commonProps = {
                        key: item.path,
                        className: "flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg text-secondary hover:bg-gray-100 transition-colors w-full text-sm"
                    };
                    // Render as Link or Button based on need (e.g., feedback might be a modal trigger)
                    return (
                        <Link to={item.path} {...commonProps}>
                            <div className="flex items-center gap-3">
                                 <Icon size={20} strokeWidth={1.75} />
                                 <span className="truncate">{item.label}</span>
                            </div>
                             {item.hasArrow && <ChevronRight size={16} className="text-gray-400" />}
                        </Link>
                    );
                 })}
             </div>
        </div>

        <div className="pt-4 border-t border-gray-200/80">
            <div className="space-y-1 mb-4">
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
