// src/components/chat/Sidebar.tsx
import React from 'react';
import { clsx } from 'clsx';
import {
  Sparkles,
  MessageSquare,
  User,
  ChevronLeft,
  ChevronRight // Import ChevronRight for expand toggle (optional)
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
  onCloseMobileSidebar: () => void; // Handles explicit mobile close
  // Props specifically for ThreadsPanelSidebar
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<void>;
  currentThreadId: string | null;
}

const Sidebar: React.FC<SidebarProps> = ({
    isExpanded,
    isMobileOpen,
    activePanel,
    onPanelChange,
    openSharePopup,
    onCloseMobileSidebar,
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

  // Determine if the panel content area should be rendered and animated
  const showPanelContent = isMobile ? isMobileOpen : isExpanded;

  const renderPanelContent = () => {
    if (!showPanelContent || !activePanel) { // Only render if expanded/open AND a panel is active
        return null;
    }

    switch (activePanel) {
      case 'discover':
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
        return null; // Should not happen if activePanel is managed correctly
    }
  };

  return (
     <div
      className={clsx(
        // Height, flex, border consistent
        "h-screen flex flex-shrink-0 border-r border-gray-200/80",
        // Width is now controlled by the parent motion.div in ChatPage.tsx
      )}
    >
        {/* Icon Buttons Column */}
        <div className="w-16 md:w-24 h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 z-10 bg-gray-50/30">
            {/* Mobile Close Button (using the actual close handler) */}
            {isMobile && isMobileOpen && (
                 <button
                     onClick={onCloseMobileSidebar} // Use the specific close handler
                     className="p-2 mb-4 text-gray-600 hover:text-primary"
                     aria-label="Close menu"
                 >
                    <ChevronLeft size={20} strokeWidth={2.5}/>
                 </button>
            )}
             {/* Placeholder for alignment when mobile is closed */}
            {isMobile && !isMobileOpen && <div className="w-12 h-12 mb-4 md:mb-1"></div>}

             {/* Desktop Toggle Button (Optional - if you want an explicit expand/collapse button) */}
             {/* {!isMobile && (
                 <button
                     onClick={() => onPanelChange(activePanel)} // Reuse panel change logic for toggle
                     className="p-2 mb-4 text-gray-600 hover:text-primary"
                     aria-label={isExpanded ? "Collapse sidebar" : "Expand sidebar"}
                 >
                     {isExpanded ? <ChevronLeft size={20} /> : <ChevronRight size={20} />}
                 </button>
             )} */}


            {/* Menu Items */}
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 // An icon is considered "active" if its panel is the one currently selected *AND* the panel area is visible
                 const isActive = activePanel === item.name && showPanelContent;
                 // An icon is considered "selected" if its panel is the one chosen, even if the panel area is collapsed/closed
                 const isSelected = activePanel === item.name;

                return (
                    <button
                        key={item.name}
                        // Use onPanelChange for toggling/switching
                        onClick={() => onPanelChange(item.name)}
                        className={clsx(
                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                           // Style based on selection/activity
                           isActive ? 'bg-white shadow-sm' : (isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'), // Highlight if selected, more if active
                        )}
                        title={item.label}
                    >
                        {/* Icon styling emphasizes selection */}
                        <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} className={clsx(isSelected ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx(
                            "text-[10px] md:text-[11px] font-medium mt-1",
                             isSelected ? 'text-primary' : 'text-gray-700' // Text color matches selection
                            )}>
                            {item.label}
                        </span>
                    </button>
                );
            })}
        </div>

        {/* Expanded Panel Content Area */}
        {/* Use motion for smooth fade-in/out of the content */}
        <motion.div
            className="flex-1 flex flex-col overflow-hidden" // Takes remaining space within parent container
            initial={{ opacity: 0 }}
            // Animate opacity based on whether the panel content should be shown
            animate={{ opacity: showPanelContent ? 1 : 0 }}
            transition={{ duration: 0.2, delay: showPanelContent ? 0.1 : 0 }}
        >
             {renderPanelContent()}
        </motion.div>

    </div>
  );
};

export default Sidebar;
