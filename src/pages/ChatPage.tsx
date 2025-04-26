import React, { useState, useEffect, useRef, useCallback } from 'react';
import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
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
  const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanelType>(null);
  const [isResponding, setIsResponding] = useState(false);

  const initialMessageText = `Hey ${userName || 'there'} 👋 What can I help you with today? 😎`;

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'initial-bot-message',
      text: initialMessageText,
      isUser: false,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
     if (chatContainerRef.current) {
         chatContainerRef.current.scrollTo({
            top: chatContainerRef.current.scrollHeight,
            behavior: behavior
         });
       }
  }, []);

  const handleSendMessage = useCallback((text: string) => {
    if (isResponding) return;

    setIsResponding(true);

    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, newMessage]);
    requestAnimationFrame(() => scrollToBottom('auto'));


    const responseDelay = 800 + Math.random() * 500;
    setTimeout(() => {
      const responses = [
         `Okay, let's talk about "${text.substring(0, 20)}". What specific aspects are you curious about? 🤔`,
         `Interesting topic: "${text.substring(0, 20)}"! Could you elaborate a bit on what you'd like to know?`,
         `Got it. Regarding "${text.substring(0, 20)}", I can help with career advice, job search info, and skill development. What's on your mind?`,
         `Sure thing! Let's dive into "${text.substring(0, 20)}". What are your main questions? 💡`
      ];
      const aiResponseText = responses[Math.floor(Math.random() * responses.length)];

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: aiResponseText,
        isUser: false,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiResponse]);
      requestAnimationFrame(() => scrollToBottom('smooth'));
    }, responseDelay);

  }, [isResponding, userName, scrollToBottom]);


  useEffect(() => {
     const timer = setTimeout(() => scrollToBottom('auto'), 100);
     return () => clearTimeout(timer);
  }, [scrollToBottom]);


  const handlePanelChange = (panel: ActivePanelType) => {
    if (isSidebarExpanded && activePanel === panel) {
      setIsSidebarExpanded(false);
      setActivePanel(null);
    } else {
      setIsSidebarExpanded(true);
      setActivePanel(panel);
    }
  };

   const handleAnimationComplete = useCallback(() => {
      setIsResponding(false);
   }, []);


  return (
    <div className="flex h-screen bg-background text-secondary overflow-hidden">
      <Sidebar
        isExpanded={isSidebarExpanded}
        activePanel={activePanel}
        onPanelChange={handlePanelChange}
      />

      <main className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Ensure overflow-y-auto and flex-1 are set for scrolling */}
        <div ref={chatContainerRef} className="flex-1 overflow-y-auto px-4 md:px-10 lg:px-20 pt-10 pb-5 scroll-smooth">
           <div className="max-w-3xl mx-auto"> {/* Content centered */}
              <AnimatePresence initial={false}>
                 {messages.map((message, index) => (
                   <ChatMessage
                     key={message.id}
                     message={message.text}
                     isUser={message.isUser}
                     isLastMessage={index === messages.length - 1}
                     onAnimationComplete={(!message.isUser && index === messages.length - 1) ? handleAnimationComplete : undefined}
                   />
                 ))}
              </AnimatePresence>
            </div>
        </div>

        <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background">
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
