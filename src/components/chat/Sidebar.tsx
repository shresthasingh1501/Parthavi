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
import { ActivePanelType } from '../../pages/ChatPage';
import { useMediaQuery } from 'react-responsive';
import { motion, AnimatePresence } from 'framer-motion';

interface SidebarProps {
  isExpanded: boolean;
  isMobileOpen: boolean;
  activePanel: ActivePanelType;
  onPanelChange: (panel: ActivePanelType) => void;
  openSharePopup: () => void;
  onCloseMobileSidebar: () => void;
}

// Define mobile sidebar width - Set to 100vw
const sidebarWidthMobile = '100vw'; // <-- Changed to cover full screen

const Sidebar: React.FC<SidebarProps> = ({
    isExpanded,
    isMobileOpen,
    activePanel,
    onPanelChange,
    openSharePopup,
    onCloseMobileSidebar
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const menuItems: { name: ActivePanelType; icon: React.ElementType; label: string }[] = [
    { name: 'discover', icon: Sparkles, label: 'Discover' },
    { name: 'threads', icon: MessageSquare, label: 'Threads' },
    { name: 'profile', icon: User, label: 'Profile' }
  ];

  const renderPanelContent = () => {
    const isSidebarActuallyOpen = (!isMobile && isExpanded) || (isMobile && isMobileOpen);

    if (!isSidebarActuallyOpen || activePanel === null) {
        return null;
    }

    switch (activePanel) {
      case 'discover':
        return <DiscoverPanel onCloseMobileSidebar={onCloseMobileSidebar} />;
      case 'threads':
        return <ThreadsPanelSidebar onCloseMobileSidebar={onCloseMobileSidebar} />;
      case 'profile':
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
       // The parent (ChatPage) sets the overall width using motion style animation
    >
        {/* Icon Buttons Column - Always visible (on screen or off-screen with parent) */}
        {/* Adjusted mobile padding/width slightly for icons */}
        <div className="w-16 md:w-24 h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 z-10 bg-gray-50/30">
            {/* Mobile Close Button */}
            {/* Show close button ONLY on mobile when the sidebar is open */}
            {isMobile && isMobileOpen && (
                 <button
                    onClick={onCloseMobileSidebar}
                    className="p-2 rounded-lg text-gray-600 hover:bg-gray-100 transition-colors mb-4 md:mb-1 w-12 h-12 flex items-center justify-center"
                    aria-label="Close sidebar"
                 >
                    <ChevronLeft size={20} strokeWidth={2.5}/>
                 </button>
            )}
             {/* Add empty space if close button is not shown on mobile to keep menu items aligned */}
             {/* Only add space on mobile if the sidebar is NOT open */}
             {isMobile && !isMobileOpen && (
                 <div className="w-12 h-12 mb-4 md:mb-1"></div>
             )}


            {/* Menu Items */}
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 const isActive = activePanel === item.name && ((!isMobile && isExpanded) || (isMobile && isMobileOpen));
                 const isSelectedCollapsedDesktop = !isMobile && activePanel === item.name && !isExpanded;

                return (
                    <button
                        key={item.name}
                        onClick={() => onPanelChange(item.name)}
                        className={clsx(
                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                           isActive ? 'bg-white shadow-sm' : 'hover:bg-gray-100',
                           isSelectedCollapsedDesktop && 'bg-gray-100'
                        )}
                        title={item.label}
                    >
                        <Icon size={20} strokeWidth={isActive || isSelectedCollapsedDesktop ? 2.5 : 2} className={clsx(isActive ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx(
                            "text-[10px] md:text-[11px] font-medium mt-1",
                             isActive ? 'text-primary' : 'text-gray-700'
                            )}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* Expanded Panel Content Area */}
        <motion.div
            className={clsx(
                "flex-1 flex flex-col overflow-hidden transition-opacity duration-200 ease-in-out",
                !isMobile && (isExpanded ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none delay-100'),
                 // Mobile: Content is always visible relative to the icon column when mobile sidebar is open
                 // Opacity transition handles the fade-in/out of the content itself relative to the main chat
                 isMobile && isMobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
            )}
        >
             {renderPanelContent()}
        </motion.div>

    </div>
  );
};

export default Sidebar;
