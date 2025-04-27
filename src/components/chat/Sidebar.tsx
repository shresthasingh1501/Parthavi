// src/components/chat/Sidebar.tsx
import React from 'react';
import { clsx } from 'clsx';
import {
  Sparkles, MessageSquare, User, ChevronLeft
} from 'lucide-react';
import DiscoverPanel from '../sidebar_panels/DiscoverPanel';
import ThreadsPanelSidebar from '../sidebar_panels/ThreadsPanelSidebar';
import ProfilePanel from '../sidebar_panels/ProfilePanel';
import { ActivePanelType } from '../../pages/ChatPage'; // Assuming type is exported from ChatPage
import { useMediaQuery } from 'react-responsive';
import { motion } from 'framer-motion';

interface SidebarProps {
  isExpanded: boolean; // Is the panel area visible (Desktop)?
  isMobileOpen: boolean; // Is the whole sidebar visible (Mobile)?
  activePanel: ActivePanelType; // Which panel content is selected?
  onPanelChange: (panel: ActivePanelType) => void; // Handles icon clicks (toggle/switch)
  openSharePopup: () => void;
  onCloseMobileSidebar: () => void; // Specific handler to close mobile sidebar
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<void>; // Changed return type
  currentThreadId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    isExpanded,
    isMobileOpen,
    activePanel,
    onPanelChange,
    openSharePopup,
    onCloseMobileSidebar, // Use this specific prop
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

  // Determine if the panel content area should be rendered (separate from icon column)
  // On Mobile: Render only if mobile sidebar is open AND a panel is selected
  // On Desktop: Render only if desktop sidebar is expanded AND a panel is selected
  const showPanelContent = (isMobile ? isMobileOpen : isExpanded) && activePanel !== null;

  const renderPanelContent = () => {
    // Guard clause: Don't render if panel shouldn't be shown
    if (!showPanelContent) return null;

    switch (activePanel) {
      case 'discover':
        // Pass the specific close handler to panels that need it
        return <DiscoverPanel onCloseMobileSidebar={onCloseMobileSidebar} />;
      case 'threads':
        return (
            <ThreadsPanelSidebar
                onCloseMobileSidebar={onCloseMobileSidebar}
                onSelectThread={onSelectThread}
                onNewThread={onNewThread}
                currentThreadId={currentThreadId}
            />
        );
      case 'profile':
        return <ProfilePanel openSharePopup={openSharePopup} onCloseMobileSidebar={onCloseMobileSidebar} />;
      default:
        return null;
    }
  };

  return (
     <div
      className={clsx(
        // Height, flex, border consistent
        "h-full flex flex-shrink-0 border-r border-gray-200/80 overflow-hidden", // Added overflow-hidden
        // Width is controlled by the parent motion.div in ChatPage.tsx
      )}
    >
        {/* --- Icon Buttons Column --- */}
        {/* Fixed width, always visible */}
        <div className="w-16 md:w-24 h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 z-10 bg-gray-50/30">
            {/* Mobile Close Button (Only shown when mobile sidebar is open) */}
            {isMobile && isMobileOpen && (
                 <button
                     onClick={onCloseMobileSidebar} // Use the explicit close handler
                     className="p-2 mb-4 text-gray-600 hover:text-primary"
                     aria-label="Close menu"
                 >
                    <ChevronLeft size={20} strokeWidth={2.5}/>
                 </button>
            )}
            {/* Placeholder for alignment when mobile close button isn't shown */}
            {(!isMobile || !isMobileOpen) && <div className="h-[52px] mb-0 md:mb-1"></div>}


            {/* Menu Items */}
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 // An icon is considered "active" if its panel is the one currently selected AND the panel area is visible
                 const isActive = activePanel === item.name && showPanelContent;
                 // An icon is considered "selected" if its panel is the one chosen, even if the panel area is collapsed/closed
                 const isSelected = activePanel === item.name;

                return (
                    <button
                        key={item.name}
                        onClick={() => onPanelChange(item.name)} // Use onPanelChange for toggling/switching
                        className={clsx(
                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                           isActive ? 'bg-white shadow-sm' : (isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'),
                        )}
                        title={item.label}
                    >
                        <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} className={clsx(isSelected ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx(
                            "text-[10px] md:text-[11px] font-medium mt-1",
                             isSelected ? 'text-primary' : 'text-gray-700'
                            )}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* --- Expanded Panel Content Area --- */}
        {/* This div takes the remaining space when shown */}
        {/* Use AnimatePresence for smooth entry/exit based on showPanelContent */}
        <AnimatePresence initial={false}>
            {showPanelContent && (
                <motion.div
                    key={activePanel} // Animate based on which panel is active
                    className="flex-1 flex flex-col overflow-hidden bg-background" // Takes remaining space, ensures bg
                    initial={{ opacity: 0, x: -20 }} // Start slightly off-screen left and faded
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }} // Faster exit
                    transition={{ duration: 0.25, ease: "easeInOut" }}
                >
                    {renderPanelContent()}
                </motion.div>
            )}
        </AnimatePresence>
    </div>
  );
};

export default Sidebar;
