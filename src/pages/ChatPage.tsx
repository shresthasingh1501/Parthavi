// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';

export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const ChatPage = () => {
  const { userName } = useUser();
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
  const [isResponding, setIsResponding] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const isInitialMount = useRef(true);
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);


  // Set initial message
  useEffect(() => {
    const initialName = userName || 'there';
    // --- Updated Initial Message ---
    const initialText = `Hello ${initialName}! It's wonderful to start this conversation about your career journey. As your guidance partner, I can help with exploring different career paths, refining your job search strategy, preparing for interviews, building essential skills, or discussing any workplace situations you might be facing. How can I assist you today?`;
    // --- End Update ---
    setMessages([
        {
            id: 'initial-bot-message-start',
            text: initialText,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        }
    ]);
  }, [userName]); // Dependency remains userName

  // Scrolling Logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
     if (chatContainerRef.current) {
         setTimeout(() => {
             if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: behavior
                });
             }
         }, 50);
       }
  }, []);

  // Scroll when messages are added
  useEffect(() => {
    if (!isInitialMount.current) {
        scrollToBottom('smooth');
    } else {
        isInitialMount.current = false;
    }
  }, [messages.length, scrollToBottom]);

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

    // --- Keeping the sample AI response for now ---
    // In a real app, this would be replaced by an actual API call and response handling
    const aiResponseText = `Based on the screenshots you shared, the HerKey website primarily uses these colors:


Color Purpose	Hex Code	Description
Primary Background Color (Dark Mauve)	#8D4672	Deep mauve/purple shade
Secondary Background (Light Grey)	#F5F5F5	Very light grey for panels
Accent Color (Green Button)	#8BC34A	Fresh green for "Create", "Apply", "Update" buttons
Text Primary Color (Dark Grey)	#333333	For primary text
Light Text / Labels (Soft Grey)	#888888	For secondary text, like "followers"
Highlight Tags (Soft Pink)	#F3D9EB	Light pink for tags like "Newly Added"
Would you like me to also pull a complete extended palette including hover states and border colors? 🚀
(They seem to use a few slight variations too.)`;

    const aiMessage: Message = {
        id: Date.now().toString() + '-ai',
        text: aiResponseText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
    setMessages(prev => [...prev, aiMessage]);

    const timer = setTimeout(() => {
        setIsResponding(false);
    }, 50);
    // --- End Sample AI Response ---


  }, [isResponding]);

  // Memoized function to close the sidebar
  const closeSidebar = useCallback(() => {
      setIsSidebarExpanded(false);
      setActivePanel(null);
  }, [setIsSidebarExpanded, setActivePanel]);

  // Effect to handle clicks outside the sidebar
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        isSidebarExpanded &&
        sidebarRef.current &&
        !sidebarRef.current.contains(event.target as Node)
      ) {
        closeSidebar();
      }
    };

    if (isSidebarExpanded) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isSidebarExpanded, closeSidebar]);


  const handlePanelChange = (panel: ActivePanelType) => {
    if (isSidebarExpanded && activePanel === panel) {
      closeSidebar();
    } else {
      setIsSidebarExpanded(true);
      setActivePanel(panel);
    }
  };

  // --- Function to open the popup ---
  const openSharePopup = () => {
      setIsSharePopupOpen(true);
  };

  const isInitialState = messages.length <= 1;

  return (
    <div className="flex h-screen bg-background text-secondary overflow-hidden">
      <div ref={sidebarRef}>
        <Sidebar
          isExpanded={isSidebarExpanded}
          activePanel={activePanel}
          onPanelChange={handlePanelChange}
          openSharePopup={openSharePopup}
        />
      </div>

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Message container */}
        <div
            ref={chatContainerRef}
            className={clsx(
                'flex-1 overflow-y-auto px-4 md:px-10 lg:px-20 pt-10 scroll-smooth',
                isInitialState && 'flex flex-col justify-center pb-32'
            )}
        >
           <div className={clsx(
               "max-w-3xl mx-auto w-full",
               isInitialState && 'flex flex-col items-center'
            )}>
              <AnimatePresence initial={false}>
                 {messages.map((message) => (
                   <ChatMessage
                     key={message.id}
                     message={message.text}
                     isUser={message.isUser}
                   />
                 ))}
              </AnimatePresence>
            </div>
        </div>

        {/* Input container */}
        <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60">
           <div className="max-w-3xl mx-auto">
             <ChatInput
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
