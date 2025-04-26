import React from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  MessageSquare,
  User,
} from 'lucide-react';
import DiscoverPanel from '../sidebar_panels/DiscoverPanel';
import ThreadsPanelSidebar from '../sidebar_panels/ThreadsPanelSidebar';
import ProfilePanel from '../sidebar_panels/ProfilePanel';
import { ActivePanelType } from '../../pages/ChatPage';

interface SidebarProps {
  isExpanded: boolean;
  activePanel: ActivePanelType;
  onPanelChange: (panel: ActivePanelType) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isExpanded, activePanel, onPanelChange }) => {

  const menuItems: { name: ActivePanelType; icon: React.ElementType; label: string }[] = [
    { name: 'discover', icon: Sparkles, label: 'Discover' },
    { name: 'threads', icon: MessageSquare, label: 'Threads' },
    { name: 'profile', icon: User, label: 'Profile' }
  ];

  const renderPanelContent = () => {
    switch (activePanel) {
      case 'discover':
        return <DiscoverPanel />;
      case 'threads':
        return <ThreadsPanelSidebar />;
      case 'profile':
        return <ProfilePanel />;
      default:
        return null;
    }
  };

  return (
    <div
      className={clsx(
        "bg-background h-screen flex transition-all duration-300 ease-in-out flex-shrink-0 relative border-r border-gray-200",
        isExpanded ? 'w-80' : 'w-24' // Adjusted collapsed width for labels
      )}
    >
        {/* Icon Buttons Column */}
        <div className="w-24 h-full flex flex-col items-center pt-4 pb-4 space-y-1 flex-shrink-0 absolute left-0 top-0 border-r border-gray-200 z-10 bg-gray-50/30">
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 const isActive = activePanel === item.name && isExpanded;
                 const isSelectedCollapsed = activePanel === item.name && !isExpanded;
                return (
                    <button
                        key={item.name}
                        onClick={() => onPanelChange(item.name)}
                        className={clsx(
                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-[76px] h-auto min-h-[60px]",
                           isActive ? 'bg-white shadow-sm' : 'hover:bg-gray-100',
                           isSelectedCollapsed && 'bg-gray-100' // Highlight selected even when collapsed
                        )}
                        title={item.label}
                    >
                        <Icon size={20} strokeWidth={isActive || isSelectedCollapsed ? 2.5 : 2} className={clsx(isActive ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx(
                            "text-[11px] font-medium mt-1",
                             isActive ? 'text-primary' : 'text-gray-700'
                            )}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* Expanded Panel Content */}
        <div
            className={clsx(
                "flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ease-in-out absolute top-0 left-24 right-0 bottom-0 h-full bg-background", // Start from left-24
                isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-100'
            )}
        >
             {renderPanelContent()}
        </div>

    </div>
  );
};

export default Sidebar;
