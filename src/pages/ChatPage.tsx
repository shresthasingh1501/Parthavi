// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, Loader2 } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar'; // Corrected Sidebar import
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils'; // Assuming utils.ts

export type ActivePanelType = 'discover' | 'threads' | 'profile' | null; // Export the type
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { text: string; isUser: boolean; timestamp: string };

const sidebarWidthMobile = '100vw';

const ChatPage = () => {
  const { session, user, userName, loading: userLoading } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => location.state?.threadId || null ); // Initialize from state once

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(!isMobile);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
  const [activePanel, setActivePanel] = useState<ActivePanelType>(isMobile ? null : 'discover');
  const [isResponding, setIsResponding] = useState(false); // Tracks AI response generation
  const [messages, setMessages] = useState<DisplayMessage[]>([]);
  const [placeholderGreeting, setPlaceholderGreeting] = useState<string | null>(null);
  const [inputMessage, setInputMessage] = useState('');
  const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
  const [chatLoading, setChatLoading] = useState(true); // Tracks thread/message loading
  const isInitialMount = useRef(true);

  // --- Authentication Check ---
  useEffect(() => {
    if (!userLoading && !session) { navigate('/', { replace: true }); }
  }, [session, userLoading, navigate]);

  // --- Define scrollToBottom ---
  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => { /* ... */ }, []);

  // --- Define handleSendMessage ---
  const handleSendMessage = useCallback(async (text: string) => {
    const currentThread = currentThreadId;
    if (!currentThread || isResponding || !session?.user) {
        console.warn("SendMessage blocked:", {currentThread, isResponding, sessionExists: !!session?.user});
        return;
    }
    const trimmedText = text.trim();
    if (!trimmedText) return;
    if (placeholderGreeting) setPlaceholderGreeting(null);

    setIsResponding(true); setInputMessage('');

    // Save User Message
    console.log(`Saving user message to thread ${currentThread} for user ${session.user.id}`);
    const userMessageData = { thread_id: currentThread, content: trimmedText, role: 'user' as const };
    const { data: savedUserMessage, error: userSaveError } = await supabase
      .from('messages').insert({ ...userMessageData, user_id: session.user.id }).select().single();

    if (userSaveError) { console.error("User save error:", userSaveError.message); setIsResponding(false); return; }
    console.log("User message saved:", savedUserMessage?.id);

    if (savedUserMessage) {
        const formattedUserMsg: DisplayMessage = { /* ... */ id: savedUserMessage.id, text: savedUserMessage.content, content: savedUserMessage.content, isUser: true, role: 'user', timestamp: new Date(savedUserMessage.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: savedUserMessage.created_at};
        setMessages(prev => [...prev, formattedUserMsg]);
        // Scroll only after state update seems complete
        requestAnimationFrame(() => scrollToBottom('smooth'));
    }

    // Call AI Backend (Placeholder)
    console.log("Calling AI backend for:", trimmedText);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Longer simulation
      const aiResponseText = `Okay, I processed "${trimmedText}". This is Parthavi's simulated response. [${Date.now()}]`; // Add timestamp for uniqueness
      // Save AI Response
      console.log(`Saving AI message to thread ${currentThread} for user ${session.user.id}`);
      const aiMessageData = { thread_id: currentThread, content: aiResponseText, role: 'assistant' as const };
      const { data: savedAiMessage, error: aiSaveError } = await supabase
        .from('messages').insert({ ...aiMessageData, user_id: session.user.id }).select().single();

      if (aiSaveError) { console.error("AI save error:", aiSaveError.message); }
      else if (savedAiMessage) {
          console.log("AI message saved:", savedAiMessage?.id);
          const formattedAiMsg: DisplayMessage = { /* ... */ id: savedAiMessage.id, text: savedAiMessage.content, content: savedAiMessage.content, isUser: false, role: 'assistant', timestamp: new Date(savedAiMessage.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: savedAiMessage.created_at};
          setMessages(prev => [...prev, formattedAiMsg]);
          requestAnimationFrame(() => scrollToBottom('smooth'));
      }
    } catch (aiError) { console.error("AI call error:", aiError); }
    finally { setIsResponding(false); }

  }, [currentThreadId, isResponding, session, placeholderGreeting, scrollToBottom]); // Removed messages.length


  // --- Thread Management & Initial Message Fetch ---
  useEffect(() => {
    if (!session?.user || userLoading) { /* ... logout cleanup ... */ return; }
    setChatLoading(true); isInitialMount.current = true; setPlaceholderGreeting(null);
    console.log("Effect: Fetching for Thread ID:", currentThreadId);
    let threadIdToLoad = currentThreadId;

    const loadOrCreateThread = async () => {
      try {
        if (!threadIdToLoad) {
          // ... (fetch latest or create logic - ensure title is generated on create) ...
            const { data: latestThread } = await supabase.from('threads').select('id, title').eq('user_id', session.user.id).order('updated_at', { ascending: false }).limit(1).maybeSingle();
            if (latestThread) { threadIdToLoad = latestThread.id; }
            else { const newTitle = generateRandomTitle(); const { data: newThread } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single(); if(newThread) threadIdToLoad = newThread.id; }
            if(threadIdToLoad && threadIdToLoad !== currentThreadId) { setCurrentThreadId(threadIdToLoad); /* navigate state update */ }
        }
        if (!threadIdToLoad) throw new Error("Failed to determine thread ID.");

        // *** Fetch messages ONLY if threadIdToLoad is valid ***
        console.log(`Fetching messages for determined thread: ${threadIdToLoad}`);
        const { data: existingMessages, error: messagesError } = await supabase
          .from('messages').select('*').eq('thread_id', threadIdToLoad)
          .order('created_at', { ascending: true });
        if (messagesError) throw messagesError;

        const formattedMessages: DisplayMessage[] = existingMessages.map(msg => ({ /* ... format ... */ id: msg.id, text: msg.content, content: msg.content, isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: msg.created_at }));
        setMessages(formattedMessages); // Update state

        // Handle placeholder / initial prompt
        const initialPrompt = location.state?.initialPrompt; // Check here
        if (formattedMessages.length === 0) {
            if (initialPrompt) { /* ... handle initial prompt ... */ }
            else { /* ... set placeholder greeting ... */ }
        } else if (initialPrompt) { /* ... clear initial prompt state ... */ }

      } catch (error) { console.error("Error loading/creating thread:", error); setMessages([]); setPlaceholderGreeting("Error loading chat."); } // Show error in placeholder
      finally { setChatLoading(false); }
    };
    loadOrCreateThread();
  // Removed handleSendMessage from dependencies - it doesn't change based on thread loading
  }, [session, userLoading, currentThreadId, location.state, userName, navigate]);

  // --- Effect to Scroll Down ---
  useEffect(() => {
    // Scroll only when not loading AND there's content (messages or placeholder)
    if (!chatLoading && (messages.length > 0 || placeholderGreeting)) {
        scrollToBottom(isInitialMount.current ? 'auto' : 'smooth');
        isInitialMount.current = false; // Mark initial scroll done once content appears
    } else if (!chatLoading && messages.length === 0 && !placeholderGreeting) {
        isInitialMount.current = true; // Reset if chat becomes truly empty
    }
  }, [messages, placeholderGreeting, chatLoading, scrollToBottom]);


  // --- Other Handlers ---
  const handleInputChange = useCallback((value: string) => { setInputMessage(value); }, []);
  const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
  const openMobileSidebar = useCallback(() => { /* ... */ }, [activePanel]);
  const handlePanelChange = (panel: ActivePanelType) => { /* ... */ }; // Keep the implementation
  const openSharePopup = () => setIsSharePopupOpen(true);
  const handleClickOutside = useCallback((event: MouseEvent) => { /* ... */ }, [closeMobileSidebar]);
  useEffect(() => { /* ... effect for click outside ... */ }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


  // --- Thread Selection/Creation Handlers ---
  const handleSelectThread = (threadId: string) => {
    if (threadId !== currentThreadId) {
      setMessages([]); setPlaceholderGreeting(null); setChatLoading(true); isInitialMount.current = true; // Reset state FIRST
      setCurrentThreadId(threadId); // THEN set new ID to trigger fetch effect
      navigate(location.pathname, { replace: true, state: { threadId: threadId, initialPrompt: undefined } });
    }
    if (isMobile) { closeMobileSidebar(); }
  };
  const handleCreateNewThread = async () => {
    if (!session?.user || chatLoading) return;
    setMessages([]); setPlaceholderGreeting(null); setChatLoading(true); isInitialMount.current = true; // Reset state FIRST
    try {
      const newTitle = generateRandomTitle();
      const { data: newThread, error } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single();
      if (error) throw error;
      setCurrentThreadId(newThread.id); // THEN set new ID to trigger fetch effect
      navigate(location.pathname, { replace: true, state: { threadId: newThread.id, initialPrompt: undefined } });
    } catch (error) { console.error("Error creating new thread:", error); setChatLoading(false); } // Ensure loading stops on error
    finally { if (isMobile) { closeMobileSidebar(); } }
  };

  if (userLoading && !session) { return <div className="flex items-center justify-center h-screen">Loading User...</div>; }
  // Only show placeholder if not loading, no messages, placeholder text exists, and not currently responding to input
  const showOnlyPlaceholder = !chatLoading && messages.length === 0 && !!placeholderGreeting && !isResponding;

  return (
    <div className="flex h-screen bg-background text-secondary overflow-hidden relative">
       <AnimatePresence>{/* ... backdrop ... */}</AnimatePresence>
        {(!isMobile || isMobileSidebarOpen) && (
            <motion.div /* ... sidebar motion div ... */ >
                 <Sidebar
                    isExpanded={isDesktopSidebarExpanded}
                    isMobileOpen={isMobileSidebarOpen}
                    activePanel={activePanel}
                    onPanelChange={handlePanelChange} // Ensure this is passed correctly
                    openSharePopup={openSharePopup}
                    onCloseMobileSidebar={closeMobileSidebar}
                    onSelectThread={handleSelectThread}
                    onNewThread={handleCreateNewThread}
                    currentThreadId={currentThreadId}
                />
            </motion.div>
        )}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {isMobile && <div /* ... mobile header ... */ ></div>}
          <div ref={chatContainerRef} className={clsx('flex-1 flex flex-col justify-end overflow-y-auto scroll-smooth', 'px-4 md:px-10 lg:px-20 pt-4 pb-4')} >
            <div className="max-w-3xl mx-auto w-full">
                 {/* Loading Indicator - Render ONLY when chatLoading is true */}
                 { chatLoading && (
                     <div className="flex justify-center items-center p-10 text-gray-500">
                        <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat...
                     </div>
                 )}

                {/* Placeholder Message - Render ONLY when appropriate */}
                { showOnlyPlaceholder && placeholderGreeting && (
                    <ChatMessage message={placeholderGreeting} isUser={false} key="placeholder-greeting" />
                )}

                {/* Actual Messages - Render ONLY when NOT chatLoading */}
                { !chatLoading && messages.map((message) => (
                    <ChatMessage key={message.id} message={message.text} isUser={message.isUser} />
                 )) }

                {/* Typing Indicator - Render ONLY when isResponding AND NOT chatLoading */}
                { isResponding && !chatLoading && (
                     <motion.div key="typing-indicator" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.3 }} className="flex justify-start pl-2 mb-4 md:mb-5" > <div className="bg-gray-100 rounded-lg px-4 py-2.5 text-secondary/70 shadow-sm max-w-[85%] sm:max-w-[75%]"> <p className="text-sm md:text-base italic">Parthavi is thinking...</p> </div> </motion.div>
                )}
            </div>
          </div>
          <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60">
             <div className="max-w-3xl mx-auto">
                <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading} /* Disable input while loading chat too */ />
             </div>
          </div>
      </main>
       <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
    </div>
  );
};

export default ChatPage;


