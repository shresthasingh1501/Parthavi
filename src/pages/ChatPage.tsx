// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { useLocation, useNavigate } from 'react-router-dom';
import { MessageSquare, Menu as MenuIcon } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';

export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

// Define mobile sidebar width consistently - Set to 100vw
const sidebarWidthMobile = '100vw'; // <-- Changed to cover full screen

const ChatPage = () => {
  const { userName } = useUser();
  const navigate = useNavigate();
  const location = useLocation();

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Use useMediaQuery for reliable mobile detection
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  // Desktop State: isExpanded controls the width of the sidebar when on desktop
  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
  // Mobile State: isMobileSidebarOpen controls whether the mobile sidebar overlay is visible
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const isInitialMount = useRef(true);
  const [inputMessage, setInputMessage] = useState('');
  const processedInitialPromptRef = useRef(false);

  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

  // --- Handle Sidebar State based on Mobile/Desktop on Mount/Resize ---
  useEffect(() => {
      if (isMobile) {
          setIsDesktopSidebarExpanded(false);
          setIsMobileSidebarOpen(false);
          setActivePanel(null);
      } else {
          setIsDesktopSidebarExpanded(true);
          setIsMobileSidebarOpen(false);
          setActivePanel('discover');
      }
  }, [isMobile]);


  // Effect to handle the initial prompt passed via navigation state
  useEffect(() => {
    const initialPrompt = location.state?.initialPrompt as string | undefined;

    if (initialPrompt && !processedInitialPromptRef.current) {
        processedInitialPromptRef.current = true;

        console.log(`Setting initial prompt in input: "${initialPrompt}"`);
        setInputMessage(initialPrompt.trim());

        const timer = setTimeout(() => {
             navigate(location.pathname, { replace: true, state: {} });
        }, 0);

        return () => clearTimeout(timer);
    }

     if (!initialPrompt && !processedInitialPromptRef.current) {
        processedInitialPromptRef.current = true;

        const initialName = userName || 'there';
        const initialText = `Hello ${initialName}! It's wonderful to start this conversation about your career journey. As your guidance partner, I can help with exploring different career paths, refining your job search strategy, preparing for interviews, building essential skills, or discussing any workplace situations you might be facing. How can I assist you today?`;

        const timer = setTimeout(() => {
             setMessages([
                {
                    id: 'initial-bot-message-standard',
                    text: initialText,
                    isUser: false,
                    timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
                }
            ]);
        }, 200);

        return () => clearTimeout(timer);
     }

  }, [location.state, navigate, userName, isMobile]);


  const handleSendMessage = useCallback((text: string) => {
    if (isResponding) return;
    const trimmedText = text.trim();
    if (!trimmedText) return;

    setIsResponding(true);

    const userMessage: Message = {
        id: Date.now().toString() + '-user',
        text: trimmedText,
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    setInputMessage('');

    const aiResponseText = `Okay, I can help with "${trimmedText}". [Simulated AI response]`;

     const timer = setTimeout(() => {
        const aiMessage: Message = {
            id: Date.now().toString() + '-ai',
            text: aiResponseText,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        };
        setMessages(prev => [...prev, aiMessage]);
        setIsResponding(false);
     }, 1000);

     return () => clearTimeout(timer);
  }, [isResponding]);


  const handleInputChange = useCallback((value: string) => {
    setInputMessage(value);
  }, [setInputMessage]);


  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
     if (chatContainerRef.current) {
         requestAnimationFrame(() => {
             if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: behavior
                });
             }
         });
       }
  }, []);

  useEffect(() => {
    if (!isInitialMount.current) {
        scrollToBottom('smooth');
    } else {
        scrollToBottom('auto');
        isInitialMount.current = false;
    }
  }, [messages.length, scrollToBottom]);


   const closeMobileSidebar = useCallback(() => {
      setIsMobileSidebarOpen(false);
   }, []);


   const handleClickOutside = useCallback((event: MouseEvent) => {
      // Only close if clicking outside the sidebar AND not on the hamburger button
      if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
          const hamburgerButton = document.getElementById('hamburger-menu-button');
           if (hamburgerButton && !hamburgerButton.contains(event.target as Node)) {
               console.log("Click outside sidebar, closing mobile sidebar.");
               closeMobileSidebar();
           }
      }
   }, [sidebarRef, closeMobileSidebar]);

  useEffect(() => {
    // Add listener only on mobile when sidebar is open
    if (isMobile && isMobileSidebarOpen) {
        document.addEventListener('mousedown', handleClickOutside);
    } else {
         // Clean up listener if no longer mobile or sidebar is closed
         document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      // Always clean up listener on unmount
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


   const openMobileSidebar = useCallback(() => {
      setIsMobileSidebarOpen(true);
      // Set default panel if none is active
      if (activePanel === null) {
         setActivePanel('discover');
      }
   }, [activePanel]);


  const handlePanelChange = (panel: ActivePanelType) => {
    if (isMobile) {
        setActivePanel(panel);
        setIsMobileSidebarOpen(true); // Open sidebar when a panel is explicitly selected
    } else {
        if (activePanel === panel) {
            setIsDesktopSidebarExpanded(prev => !prev);
        } else {
            setActivePanel(panel);
            setIsDesktopSidebarExpanded(true);
        }
    }
  };


  const openSharePopup = () => {
      setIsSharePopupOpen(true);
  };

  const isInitialState = messages.length === 0 && inputMessage === '';


  return (
    <div className="flex h-screen bg-background text-secondary overflow-hidden relative">

       {/* Mobile Sidebar Overlay Backdrop */}
        <AnimatePresence>
           {isMobile && isMobileSidebarOpen && (
             <motion.div
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               exit={{ opacity: 0 }}
               transition={{ duration: 0.3 }}
               className="fixed inset-0 bg-black/40 z-30"
               onClick={closeMobileSidebar}
             />
           )}
        </AnimatePresence>

       {/* Sidebar Component Container - Positioned based on screen size and state */}
        {/* Render container if not mobile OR mobile and open */}
        {/* The motion.div handles the slide/width animation */}
        {(!isMobile || isMobileSidebarOpen) && (
            <motion.div
                 key="sidebar-container" // Use a specific key for the container motion div
                 ref={sidebarRef} // Attach ref here
                 initial={isMobile ? { x: '-100%' } : { width: '96px' }} // Start off-screen on mobile, collapsed on desktop
                 animate={{
                    x: isMobile ? (isMobileSidebarOpen ? '0%' : '-100%') : '0%', // Slide on mobile
                    width: isMobile ? sidebarWidthMobile : (isDesktopSidebarExpanded ? '480px' : '96px'), // Animate width on desktop
                 }}
                 transition={{ duration: 0.3, ease: "easeOut" }}
                 className={clsx(
                    "h-screen flex-shrink-0",
                     // Desktop: Static positioning in flex layout
                    !isMobile && 'relative',
                     // Mobile: Fixed overlay positioning, always full height, starts off-screen left
                    isMobile && 'fixed top-0 left-0 z-40 shadow-xl',
                )}
                 // Use the calculated width here for the animation target and initial position
                 style={{ width: sidebarWidthMobile }} // <-- Set the width style here
            >
              {/* Render the Sidebar component itself */}
              <Sidebar
                isExpanded={isDesktopSidebarExpanded} // Pass desktop state
                isMobileOpen={isMobileSidebarOpen} // Pass mobile state
                activePanel={activePanel}
                onPanelChange={handlePanelChange} // Use ChatPage's handler
                openSharePopup={openSharePopup} // Pass share popup handler
                onCloseMobileSidebar={closeMobileSidebar} // Pass mobile close handler
              />
            </motion.div>
        )}


      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
         {/* Mobile Header with Hamburger Icon */}
         {isMobile && (
            <div className="absolute top-0 left-0 right-0 bg-background/95 backdrop-blur-sm p-4 flex items-center justify-between border-b border-gray-200/60 z-20">
                <button
                    id="hamburger-menu-button"
                    onClick={openMobileSidebar}
                    className="p-2 rounded-md hover:bg-gray-100"
                    aria-label="Open menu"
                >
                    <MenuIcon size={24} className="text-secondary" />
                </button>
                <span className="text-lg font-semibold font-serif text-secondary">Chat</span>
                <div className="w-8"></div> {/* Placeholder for right-side alignment */}
            </div>
         )}

        {/* Message container - Adjusted padding for mobile header */}
        <div
            ref={chatContainerRef}
            className={clsx(
                'flex-1 overflow-y-auto px-4 md:px-10 lg:px-20 pt-10 scroll-smooth',
                 isMobile ? 'pt-20' : 'pt-10', // Add more top padding on mobile to clear header
                isInitialState && 'flex flex-col justify-center pb-32'
            )}
        >
           <div className={clsx(
               "max-w-3xl mx-auto w-full",
               isInitialState && 'flex flex-col items-center'
            )}>
              {isInitialState && (
                 <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2, duration: 0.5 }}
                    className="text-center mb-8"
                 >
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                      <MessageSquare className="w-8 h-8 text-primary" />
                    </div>
                    <h1 className="text-3xl md:text-4xl font-serif text-secondary mb-4">
                       Your Career Partner
                    </h1>
                    <p className="text-lg text-secondary/80 max-w-md mx-auto">
                        I'm Parthavi, your AI guide for career growth. Ask me anything about finding jobs, improving skills, or navigating workplace challenges.
                    </p>
                 </motion.div>
              )}

              {messages.map((message) => (
                <ChatMessage
                  key={message.id}
                  message={message.text}
                  isUser={message.isUser}
                />
              ))}
            </div>
        </div>

        {/* Input container */}
        <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60">
           <div className="max-w-3xl mx-auto">
             <ChatInput
                value={inputMessage}
                onChange={handleInputChange}
                onSendMessage={handleSendMessage}
                isResponding={isResponding}
             />
           </div>
         </div>
      </main>

        <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
    </div>
  );
};

export default ChatPage;
