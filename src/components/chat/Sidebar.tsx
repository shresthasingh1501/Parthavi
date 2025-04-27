// src/components/chat/Sidebar.tsx
import React from 'react';
import { clsx } from 'clsx';
// --- Corrected Framer Motion Import ---
import { AnimatePresence, motion } from 'framer-motion';
// --- End Corrected Import ---
import {
  Sparkles, MessageSquare, User, ChevronLeft
} from 'lucide-react';
import DiscoverPanel from '../sidebar_panels/DiscoverPanel';
import ThreadsPanelSidebar from '../sidebar_panels/ThreadsPanelSidebar';
import ProfilePanel from '../sidebar_panels/ProfilePanel';
import { ActivePanelType } from '../../pages/ChatPage';
import { useMediaQuery } from 'react-responsive';


interface SidebarProps {
  isExpanded: boolean;
  isMobileOpen: boolean;
  activePanel: ActivePanelType;
  onPanelChange: (panel: ActivePanelType) => void;
  openSharePopup: () => void;
  onCloseMobileSidebar: () => void;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<string | null>; // Adjusted return type to match ChatPage
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

  const showPanelContent = (isMobile ? isMobileOpen : isExpanded) && activePanel !== null;

  const renderPanelContent = () => {
    if (!showPanelContent) return null;
    switch (activePanel) {
      case 'discover': return <DiscoverPanel onCloseMobileSidebar={onCloseMobileSidebar} />;
      case 'threads': return <ThreadsPanelSidebar onCloseMobileSidebar={onCloseMobileSidebar} onSelectThread={onSelectThread} onNewThread={onNewThread} currentThreadId={currentThreadId} />;
      case 'profile': return <ProfilePanel openSharePopup={openSharePopup} onCloseMobileSidebar={onCloseMobileSidebar} />;
      default: return null;
    }
  };

  return (
     <div className={clsx("h-full flex flex-shrink-0 border-r border-gray-200/80 overflow-hidden")}>
        {/* --- Icon Buttons Column --- */}
        <div className="w-16 md:w-24 h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 z-10 bg-gray-50/30">
            {isMobile && isMobileOpen && (
                 <button onClick={onCloseMobileSidebar} className="p-2 mb-4 text-gray-600 hover:text-primary" aria-label="Close menu"> <ChevronLeft size={20} strokeWidth={2.5}/> </button>
            )}
            {(!isMobile || !isMobileOpen) && <div className="h-[52px] mb-0 md:mb-1"></div>} {/* Placeholder */}
            {menuItems.map((item) => {
                 const Icon = item.icon;
                 const isActive = activePanel === item.name && showPanelContent;
                 const isSelected = activePanel === item.name;
                return (
                    <button key={item.name} onClick={() => onPanelChange(item.name)} className={clsx("flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]", isActive ? 'bg-white shadow-sm' : (isSelected ? 'bg-gray-100' : 'hover:bg-gray-100'))} title={item.label}>
                        <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} className={clsx(isSelected ? 'text-primary' : 'text-gray-600')} />
                        <span className={clsx("text-[10px] md:text-[11px] font-medium mt-1", isSelected ? 'text-primary' : 'text-gray-700')}> {item.label} </span>
                    </button>
                );
            })}
        </div>
        {/* --- Expanded Panel Content Area --- */}
        {/* Use AnimatePresence FROM FRAMER MOTION HERE */}
        <AnimatePresence initial={false}>
            {showPanelContent && (
                <motion.div
                    key={activePanel}
                    className="flex-1 flex flex-col overflow-hidden bg-background"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20, transition: { duration: 0.15 } }}
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
