import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2 } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils';
import InitialPlaceholder from '../components/chat/InitialPlaceholder';
import NewThreadPlaceholder from '../components/chat/NewThreadPlaceholder';


export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { text: string; isUser: boolean; timestamp: string };
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at' | 'user_id'> & { user_id: string };
type PlaceholderType = 'initial' | 'new_thread' | null;

const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';

// --- Background Save Helper (keep as is) ---
const saveMessageToDb = async (messageData: MessagePayload) => { /* ... */
    console.log('Background save initiated for:', messageData.role);
    try {
        const { data, error } = await supabase.from('messages').insert(messageData).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) {
        console.error(`Background save FAILED for ${messageData.role}:`, error);
        return null;
    }
};

const ChatPage = () => {
    // --- State and Refs (keep as is) ---
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => location.state?.threadId || null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isResponding, setIsResponding] = useState(false);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
    const isInitialMount = useRef(true);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);
    const isSidebarVisible = isMobile ? isMobileSidebarOpen : isDesktopSidebarExpanded;

    // --- useEffects for Auth, Scrolling (keep as is) ---
    useEffect(() => { if (!userLoading && !session) { navigate('/', { replace: true }); } }, [session, userLoading, navigate]);
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => { /* ... */ setTimeout(() => { if (chatContainerRef.current) { chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: behavior }); } }, 50); }, []);
    useEffect(() => { if (!isInitialMount.current) { scrollToBottom('smooth'); } }, [messages, scrollToBottom]);

    // --- handleSendMessage (keep as is) ---
    const handleSendMessage = useCallback(async (text: string) => { /* ... */
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) return;
        const trimmedText = text.trim();
        if (!trimmedText) return;
        if (placeholderType) setPlaceholderType(null);
        setCreateThreadError(null);
        const userId = session.user.id;
        setIsResponding(true); setInputMessage('');
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, text: trimmedText, content: trimmedText, isUser: true, role: 'user', timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticUserMsg]);
        scrollToBottom('smooth');
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message in background:", err));
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            const aiResponseText = `AI response to "${trimmedText}". [${Date.now()}]`;
            const tempAiMsgId = `temp-ai-${Date.now()}`;
            const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, text: aiResponseText, content: aiResponseText, isUser: false, role: 'assistant', timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: new Date().toISOString() };
            setMessages(prev => [...prev, optimisticAiMsg]);
            scrollToBottom('smooth');
            const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: aiResponseText, role: 'assistant', user_id: userId };
            saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving AI message in background:", err));
        } catch (aiError) {
            console.error("AI call error:", aiError);
            const errorMsg: DisplayMessage = { id: `error-${Date.now()}`, text: "Sorry, I couldn't get a response. Please try again.", content: "", isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString() };
            setMessages(prev => [...prev, errorMsg]);
            scrollToBottom('smooth');
        } finally { setIsResponding(false); }
     }, [currentThreadId, isResponding, session, placeholderType, scrollToBottom]);

    // --- Initial Thread Load / Placeholder Logic (keep as is) ---
    useEffect(() => { /* ... */
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) { setMessages([]); setCurrentThreadId(null); setPlaceholderType(null); setChatLoading(false); return; }
        if (!currentThreadId) {
             const checkOrCreateFirstThread = async () => {
                setChatLoading(true); setMessages([]); setPlaceholderType(null);
                 try {
                     const { data: latestThread, error: findError } = await supabase.from('threads').select('id').eq('user_id', currentUserId).order('updated_at', { ascending: false }).limit(1).maybeSingle();
                     if (findError) throw findError;
                     if (latestThread) { setCurrentThreadId(latestThread.id); }
                     else { setPlaceholderType('initial'); setChatLoading(false); }
                 } catch (error) { console.error("Error checking/creating first thread:", error); setPlaceholderType(null); setCreateThreadError("Could not initialize chat."); setChatLoading(false); }
             };
             checkOrCreateFirstThread(); return;
        }
        setChatLoading(true); isInitialMount.current = true; setPlaceholderType(null); setMessages([]); setCreateThreadError(null);
        const loadMessages = async () => {
            try {
                const { data: existingMessages, error: messagesError } = await supabase.from('messages').select('*').eq('thread_id', currentThreadId).order('created_at', { ascending: true });
                if (messagesError) throw messagesError;
                const formattedMessages: DisplayMessage[] = existingMessages.map(msg => ({ id: msg.id, text: msg.content, content: msg.content, isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: msg.created_at }));
                setMessages(formattedMessages);
                if (formattedMessages.length === 0) { if (placeholderType !== 'new_thread') { setPlaceholderType('initial'); } }
                else { setPlaceholderType(null); }
            } catch (error) { console.error("Error loading messages:", error); setMessages([]); setPlaceholderType(null); setCreateThreadError("Sorry, couldn't load the chat messages.");
            } finally { setChatLoading(false); scrollToBottom('auto'); isInitialMount.current = false; }
        };
        loadMessages();
    }, [session?.user?.id, currentThreadId, userLoading]);

    // --- Sidebar and Other Handlers (keep as is) ---
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => { if (isMobile) { if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar(); else { setActivePanel(panel); setIsMobileSidebarOpen(true); } } else { if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar(); else expandDesktopSidebar(panel); } }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => { if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) { if (isMobile && isMobileSidebarOpen) closeMobileSidebar(); else if (!isMobile && isDesktopSidebarExpanded) collapseDesktopSidebar(); } }, [isMobile, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar]);
    useEffect(() => { const shouldListen = (isMobile && isMobileSidebarOpen) || (!isMobile && isDesktopSidebarExpanded); if (shouldListen) document.addEventListener('mousedown', handleClickOutside); else document.removeEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isMobile, isMobileSidebarOpen, isDesktopSidebarExpanded, handleClickOutside]);
    const handleSelectThread = useCallback((threadId: string) => { if (threadId !== currentThreadId) { setCurrentThreadId(threadId); setPlaceholderType(null); setCreateThreadError(null); navigate(location.pathname, { replace: true, state: { threadId: threadId } }); } if (isMobile) closeMobileSidebar(); }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
    const handleCreateNewThread = useCallback(async () => { /* ... */ if (!session?.user || isResponding) return; setCreateThreadError(null); setMessages([]); setCurrentThreadId(null); setPlaceholderType('new_thread'); try { const newTitle = generateRandomTitle(); const { data: newThread, error } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single(); if (error) throw error; if (!newThread) throw new Error("New thread data missing."); setCurrentThreadId(newThread.id); navigate(location.pathname, { replace: true, state: { threadId: newThread.id } }); setActivePanel('discover'); } catch (error) { console.error("Error creating new thread:", error); setCreateThreadError(error instanceof Error ? error.message : "Failed to create thread."); setPlaceholderType(null); setCurrentThreadId(null); } finally { if (isMobile) closeMobileSidebar(); else if (!isMobile) expandDesktopSidebar('discover'); } }, [session, isResponding, navigate, location.pathname, isMobile, closeMobileSidebar, expandDesktopSidebar]);
    const handlePromptClick = useCallback((prompt: string) => { setInputMessage(prompt); }, []);
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);

    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen">Loading User...</div>;

    const showPlaceholder = !chatLoading && messages.length === 0 && (placeholderType !== null || !!createThreadError);
    const placeholderText = createThreadError || ""; // Error text handled within placeholder conditional render

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden relative">
            {/* Sidebar and Overlay */}
            <AnimatePresence> {isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true" /> )} </AnimatePresence>
            <motion.div ref={sidebarRef} className={clsx("absolute md:relative h-full flex-shrink-0 z-40 md:z-auto transition-transform duration-300 ease-in-out", "bg-background border-r border-gray-200/80", isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), )} transition={{ type: "tween", duration: 0.2 }} >
                 <Sidebar isExpanded={isDesktopSidebarExpanded && !isMobile} isMobileOpen={isMobileSidebarOpen && isMobile} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
            </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && ( <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200/60 flex-shrink-0"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-gray-600 hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="text-base font-semibold text-secondary">Parthavi</h1> <div className="w-8"></div> </div> )}

                {/* Messages Container - MODIFIED FOR CENTERING */}
                <div
                    ref={chatContainerRef}
                    className={clsx(
                        'flex-1 flex flex-col overflow-y-auto scroll-smooth',
                        // Apply centering ONLY when placeholder is shown
                        showPlaceholder ? 'justify-center items-center' : 'justify-end',
                        'px-4 md:px-10 lg:px-20 pt-4 pb-4'
                    )}
                >
                    {/* Inner container for max-width */}
                    <div className={clsx(
                        "max-w-3xl mx-auto w-full",
                        // If placeholder is shown, allow this inner div to potentially grow if needed
                        // but the parent's items-center should handle vertical centering.
                        // No specific height/flex needed here usually.
                        )}
                    >
                        {/* Loader */}
                        {chatLoading && ( <div className="flex justify-center items-center p-10 text-gray-500"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat... </div> )}

                        {/* Placeholders (Rendered based on type) */}
                        {!chatLoading && placeholderType === 'initial' && <InitialPlaceholder onPromptClick={handlePromptClick} />}
                        {!chatLoading && placeholderType === 'new_thread' && <NewThreadPlaceholder onPromptClick={handlePromptClick} />}

                        {/* Error Display (Centered when placeholderType is null) */}
                         {!chatLoading && createThreadError && placeholderType === null && (
                             <div className='flex items-center justify-center text-center text-red-500 p-4'>{createThreadError}</div>
                         )}

                        {/* Messages List (Rendered only when no placeholder/error) */}
                        {!chatLoading && placeholderType === null && !createThreadError && messages.map((message) => ( <ChatMessage key={message.id} message={message.text} isUser={message.isUser} /> ))}
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60">
                    <div className="max-w-3xl mx-auto">
                        <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading} />
                    </div>
                </div>
            </main>

            {/* Share Popup */}
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
