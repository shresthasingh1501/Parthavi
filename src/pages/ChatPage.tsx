// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInput from '../components/chat/ChatInput';
// Ensure using the simplified ChatMessage component below
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import { useUser } from '../context/UserContext';
import { AnimatePresence, motion } from 'framer-motion'; // Keep motion for message animation
import { clsx } from 'clsx'; // For conditional classes

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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(true);
  const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
  const [isResponding, setIsResponding] = useState(false);

  // State: List of messages
  const [messages, setMessages] = useState<Message[]>([]);

  // Set initial message
  useEffect(() => {
    const initialName = userName || 'there';
    const initialText = `Ok ${initialName}. What did you want to talk about? Ask me for advice, for answers, or let’s talk about whatever’s on your mind.`;
    setMessages([
        {
            id: 'initial-bot-message-start',
            text: initialText,
            isUser: false,
            timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
        }
    ]);
  }, [userName]);

  // Scrolling Logic
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
     if (chatContainerRef.current) {
         // Delay slightly to ensure DOM update, especially after adding messages
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

  // Scroll when messages are added (but not on initial load)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (!isInitialMount.current) {
        // Use 'auto' for user message, 'smooth' for AI (can simplify to just 'smooth')
        scrollToBottom('smooth');
    } else {
        isInitialMount.current = false;
    }
  }, [messages.length, scrollToBottom]); // Depend on message count


  const handleSendMessage = useCallback((text: string) => {
    if (isResponding) return;

    const trimmedText = text.trim();
    if (!trimmedText) return;

    setIsResponding(true);

    // 1. Add User's Message
    const userMessage: Message = {
        id: Date.now().toString() + '-user',
        text: trimmedText,
        isUser: true,
        timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })
    };
    setMessages(prev => [...prev, userMessage]);

    // 2. Prepare AI Response (Static long message)
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

    // 3. Add AI's Message Immediately (using functional update)
    setMessages(prev => [...prev, aiMessage]);

    // 4. Re-enable input almost immediately
    const timer = setTimeout(() => {
        setIsResponding(false);
    }, 50);
    // No cleanup needed for such short timer

  }, [isResponding]); // Removed scrollToBottom dependency here, handled by useEffect


  const handlePanelChange = (panel: ActivePanelType) => {
    if (isSidebarExpanded && activePanel === panel) {
      setIsSidebarExpanded(false);
      setActivePanel(null);
    } else {
      setIsSidebarExpanded(true);
      setActivePanel(panel);
    }
  };

  // Determine if we are in the initial state (only 1 message)
  const isInitialState = messages.length <= 1;

  return (
    <div className="flex h-screen bg-background text-secondary overflow-hidden">
      <Sidebar
        isExpanded={isSidebarExpanded}
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">

        {/* Message container: Apply conditional classes for initial positioning */}
        <div
            ref={chatContainerRef}
            className={clsx(
                'flex-1 overflow-y-auto px-4 md:px-10 lg:px-20 pt-10 scroll-smooth',
                // Conditional classes for initial centering:
                isInitialState && 'flex flex-col justify-center pb-32' // Use desired padding, e.g., pb-32
            )}
        >
           {/* Inner wrapper for max-width */}
           <div className={clsx(
               "max-w-3xl mx-auto w-full",
               // Center content ONLY when in initial state
               isInitialState && 'flex flex-col items-center'
            )}>
              {/* Always render the list from messages state */}
              {/* Use AnimatePresence for individual message fade-in */}
              <AnimatePresence initial={false}>
                 {messages.map((message) => (
                   <ChatMessage
                     key={message.id} // Use unique ID for key
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
    </div>
  );
};

export default ChatPage;
