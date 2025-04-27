// src/components/chat/Sidebar.tsx
import React from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  MessageSquare,
  User,
  ChevronLeft
} from 'lucide-react';
import DiscoverPanel from '../sidebar_panels/DiscoverPanel';
import ThreadsPanelSidebar from '../sidebar_panels/ThreadsPanelSidebar';
import ProfilePanel from '../sidebar_panels/ProfilePanel';
import { ActivePanelType } from '../../pages/ChatPage'; // Assuming type is exported from ChatPage
import { useMediaQuery } from 'react-responsive';
import { motion } from 'framer-motion';

interface SidebarProps {
  isExpanded: boolean;
  isMobileOpen: boolean;
  activePanel: ActivePanelType;
  onPanelChange: (panel: ActivePanelType) => void; // For changing the active panel view
  openSharePopup: () => void;
  onCloseMobileSidebar: () => void;
  // Props specifically for ThreadsPanelSidebar
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<void>;
  currentThreadId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    isExpanded,
    isMobileOpen,
    activePanel,
    onPanelChange, // Use this for the icon buttons
    openSharePopup,
    onCloseMobileSidebar,
    // Destructure thread-related props
    onSelectThread,
    onNewThread,
    currentThreadId,
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const menuItems: { name: ActivePanelType; icon: React.ElementType; label: string }[] = [
    { name: 'discover', icon: Sparkles, label: 'Discover' },
    { name: 'threads', icon: MessageSquare, label: 'Threads' },
    { name: 'profile', icon: User, label: 'Profile' }
  ];

  const renderPanelContent = () => {
    // Determine if the panel area should be visible
    const isPanelAreaVisible = (!isMobile && isExpanded) || (isMobile && isMobileOpen);

    if (!isPanelAreaVisible || activePanel === null) {
        return null; // Don't render panel content if sidebar collapsed/closed or no active panel
    }

    switch (activePanel) {
      case 'discover':
        // Discover panel doesn't need thread props
        return <DiscoverPanel onCloseMobileSidebar={onCloseMobileSidebar} />;
      case 'threads':
        // *** PASS THREAD PROPS DOWN TO ThreadsPanelSidebar ***
        return (
            <ThreadsPanelSidebar
                onCloseMobileSidebar={onCloseMobileSidebar}
                onSelectThread={onSelectThread}
                onNewThread={onNewThread}
                currentThreadId={currentThreadId}
            />
        );
      case 'profile':
        // Profile panel doesn't need thread props directly, but needs share popup
        return <ProfilePanel openSharePopup={openSharePopup} onCloseMobileSidebar={onCloseMobileSidebar} />;
      default:
        return null;
    }
  };

  return (
     <div
      className={clsx(
        "bg-background h-screen flex border-r border-gray-200 flex-shrink-0",
      )}
    >
        {/* Icon Buttons Column */}
        <div className="w-16 md:w-24 h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 z-10 bg-gray-50/30">
            {/* Mobile Close Button */}
            {isMobile && isMobileOpen && (
                 <button onClick={onCloseMobileSidebar} /* ... */ >
                    <ChevronLeft size={20} strokeWidth={2.5}/>
                 </button>
            )}
             {isMobile && !isMobileOpen && <div className="w-12 h-12 mb-4 md:mb-1"></div>}

            {/* Menu Items */}
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 // Determine active state based on whether panel area is visible
                 const isPanelAreaVisible = (!isMobile && isExpanded) || (isMobile && isMobileOpen);
                 const isActive = activePanel === item.name && isPanelAreaVisible;
                 // Highlight icon even if panel area isn't visible but it's the selected panel
                 const isSelected = activePanel === item.name;

                return (
                    <button
                        key={item.name}
                        // Use onPanelChange passed from ChatPage here
                        onClick={() => onPanelChange(item.name)}
                        className={clsx(
                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                           // Style based on selection/activity
                           isActive ? 'bg-white shadow-sm' : (isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'),
                        )}
                        title={item.label}
                    >
                        <Icon size={20} strokeWidth={isActive || isSelected ? 2.5 : 2} className={clsx(isActive || isSelected ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx(
                            "text-[10px] md:text-[11px] font-medium mt-1",
                             isActive || isSelected ? 'text-primary' : 'text-gray-700'
                            )}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* Expanded Panel Content Area */}
        {/* Use motion for opacity based on panel visibility */}
        <motion.div
            className="flex-1 flex flex-col overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: ((!isMobile && isExpanded) || (isMobile && isMobileOpen)) ? 1 : 0 }}
            transition={{ duration: 0.2, delay: ((!isMobile && isExpanded) || (isMobile && isMobileOpen)) ? 0.1 : 0 }} // Delay fade-in slightly
        >
             {renderPanelContent()}
        </motion.div>

    </div>
  );
};

export default Sidebar;
