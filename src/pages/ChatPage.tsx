// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse } from "@google/genai";

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

// Types and Constants remain the same...
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { isUser: boolean; timestamp: string };
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'>;
type PlaceholderType = 'initial' | 'new_thread' | null;

const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";

// Helpers remain the same...
const saveMessageToDb = async (messageData: MessagePayload) => { /* ... */
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role);
    try {
        const { data, error } = await supabase.from('messages').insert(messageData).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`Background save FAILED for ${messageData.role}:`, error); return null; }
};
let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try { genAI = new GoogleGenAI({ apiKey: API_KEY }); console.log("Gemini Initialized."); }
    catch (e) { console.error("Gemini Init Failed:", e); genAI = null; }
} else { console.warn("VITE_GEMINI_API_KEY not set."); }
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => { /* ... */
    return messages.map((msg): Content => ({
        role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }],
    })).filter(content => content.parts[0].text?.trim());
};


const ChatPage = () => {
    // State and Refs remain the same...
    const { session, user, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(location.state?.threadId || null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    // Callbacks remain the same...
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => { /* ... */
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
            }
        }, 50); // Increased delay slightly
    }, []);
    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => { /* ... */
        if (!session?.user) { setCreateThreadError("User session not found."); return null; }
        console.log("Attempting to create new thread...");
        setChatLoading(true); setMessages([]); setCurrentThreadId(null);
        setPlaceholderType(null); setCreateThreadError(null); setApiError(null); // Reset placeholder here too
        try {
            const newTitle = generateRandomTitle();
            const { data: newThread, error } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single();
            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");
            console.log("New thread created:", newThread.id);
            setCurrentThreadId(newThread.id);
            setPlaceholderType('new_thread'); // Show placeholder for the new empty thread
            navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });
            if (shouldSetActive) { setActivePanel('discover'); }
            setChatLoading(false);
            return newThread.id;
        } catch (error: any) {
            console.error("Error creating new thread:", error);
            setCreateThreadError(error.message || "Failed to create new thread.");
            setChatLoading(false); setCurrentThreadId(null); setPlaceholderType(null); // Ensure placeholder is null on error
            return null;
        }
    }, [session, navigate, location.pathname]); // Use stable deps
    const handleSendMessage = useCallback(async (text: string) => { /* ... */
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) return;
        const trimmedText = text.trim(); if (!trimmedText) return;

        setPlaceholderType(null); // <-- *** CRITICAL FIX: Clear placeholder when sending message ***
        setCreateThreadError(null); setApiError(null);
        const userId = session.user.id;
        setIsResponding(true); setInputMessage('');

        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: "", created_at: new Date().toISOString() };
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);
        setMessages(prev => [...prev, optimisticUserMsg]);
        scrollToBottom('smooth');

        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticAiMsg]);
        scrollToBottom('smooth');

        try {
            const requestPayload = { model: MODEL_NAME, contents: historyForApi, config: { responseMimeType: 'text/plain' } };
            if (!genAI) throw new Error("Gemini AI Client lost.");
            const result = await genAI.models.generateContentStream(requestPayload);

            let accumulatedResponse = "";
            let streamSource: AsyncIterable<GenerateContentResponse> | null = null;

            if (result && typeof result[Symbol.asyncIterator] === 'function') streamSource = result;
            else if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') streamSource = result.stream;
            else throw new Error(`Unexpected API response structure: ${JSON.stringify(result).substring(0,100)}...`);

            if (streamSource) {
                for await (const chunk of streamSource) {
                    const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                        accumulatedResponse += chunkText;
                        setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg));
                    }
                }
            }
            scrollToBottom('smooth'); // Scroll after stream finishes

            if (accumulatedResponse) {
                const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedResponse, role: 'assistant', user_id: userId };
                saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving AI message:", err));
            } else {
                console.warn("AI generated empty response.");
                setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: "[No text content received]" } : msg));
            }
        } catch (aiError: any) {
            console.error("Gemini API call error:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setApiError(errorMessage);
            setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg));
            scrollToBottom('smooth'); // Scroll even on error
        } finally { setIsResponding(false); }
    }, [currentThreadId, isResponding, session, messages, /* placeholderType removed */ scrollToBottom]); // Removed placeholderType dep
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => { /* ... */
        if (isMobile) {
            if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar();
            else { setActivePanel(panel); setIsMobileSidebarOpen(true); }
        } else {
            if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar();
            else expandDesktopSidebar(panel);
        }
    }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => { /* ... */
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
            if (isMobile && isMobileSidebarOpen) closeMobileSidebar();
        }
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);
     const handleSelectThread = useCallback((threadId: string) => { /* ... */
        if (threadId !== currentThreadId) {
            console.log("Selecting thread:", threadId);
            navigate(location.pathname, { replace: true, state: { threadId: threadId } });
             if (isMobile) closeMobileSidebar();
        } else {
             if (isMobile) closeMobileSidebar();
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
     const handlePromptClick = useCallback((prompt: string) => { /* ... */
        if (!currentThreadId) {
            handleCreateNewThread(false).then((newId) => {
                if (newId) {
                    setInputMessage(prompt);
                    // Trigger send automatically after creating thread and setting prompt
                    handleSendMessage(prompt);
                }
            });
        } else {
            setInputMessage(prompt);
             // Trigger send immediately when clicking prompt on existing thread
            handleSendMessage(prompt);
        }
    }, [currentThreadId, handleCreateNewThread, handleSendMessage]); // Added handleSendMessage dependency
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);

    // --- Effects ---
    useEffect(() => { if (!userLoading && !session) navigate('/', { replace: true }); }, [session, userLoading, navigate]);

    useEffect(() => {
        // Effect for Initial Thread Loading / Creation logic...
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) { setChatLoading(false); return; }
        const threadIdFromState = location.state?.threadId;
        console.log("Load Effect: User=", currentUserId, "Loading=", userLoading, "State Thread=", threadIdFromState); // Log state

        const initializeChat = async () => {
             setChatLoading(true); setMessages([]); setApiError(null);
             setCreateThreadError(null); setPlaceholderType(null); // Start with null placeholder

            if (threadIdFromState) {
                console.log("Load Effect: Loading thread from state:", threadIdFromState);
                setCurrentThreadId(threadIdFromState);
                 try {
                    const { data: existingMessages, error: messagesError } = await supabase.from('messages').select('*').eq('thread_id', threadIdFromState).order('created_at', { ascending: true });
                    if (messagesError) throw messagesError;
                    const formatted = existingMessages.map(msg => ({ id: msg.id, content: msg.content ?? '', isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: "", created_at: msg.created_at }));
                    setMessages(formatted);
                    // *** CRITICAL FIX: Set placeholder to null if messages loaded ***
                    setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                    console.log("Load Effect: Messages loaded, count=", formatted.length, "Placeholder=", formatted.length === 0 ? 'new_thread' : null); // Log result
                    isInitialMount.current = false;
                    setChatLoading(false);
                    scrollToBottom('auto');
                } catch (error: any) {
                    console.error("Load Effect: Error loading messages:", error);
                    setMessages([]); setCreateThreadError(`Failed to load chat: ${error.message}`); setChatLoading(false);
                    setPlaceholderType(null); // Ensure placeholder is null on error
                }
            } else {
                console.log("Load Effect: No thread in state, creating new one.");
                // handleCreateNewThread sets placeholderType to 'new_thread' on success
                await handleCreateNewThread(false);
                // It also sets chatLoading to false internally
            }
        };
        initializeChat();
        // Use JSON.stringify for object/array dependencies if needed, but string ID is fine
    }, [session?.user?.id, userLoading, location.state?.threadId]); // Removed handleCreateNewThread from deps

    useEffect(() => { if (!isInitialMount.current) scrollToBottom('smooth'); }, [messages, scrollToBottom]); // Scroll effect remains

    useEffect(() => { // Outside click listener effect remains
        if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);

    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background">Loading User...</div>;

    // Recalculate flags based on current state RIGHT BEFORE render
    const isLoading = chatLoading || (isResponding && messages.length === 0); // Show loader if loading thread OR responding initially
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;

    console.log("Render Check: isLoading", isLoading, "showAnyPlaceholder", showAnyPlaceholder, "showAnyError", showAnyError, "showMessagesList", showMessagesList, "messages.length", messages.length, "placeholderType", placeholderType);

    return (
        // Root div: MUST BE flex and h-screen
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
             {/* Sidebar Overlay */}
             <AnimatePresence>{isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true"/> )}</AnimatePresence>
             {/* Sidebar Container */}
             <motion.div ref={sidebarRef} className={clsx( "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80", "transition-transform duration-300 ease-in-out", isMobile ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full') )}>
                  <Sidebar isExpanded={!isMobile && isDesktopSidebarExpanded} isMobileOpen={isMobile && isMobileSidebarOpen} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
             </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && ( <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-gray-600 hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">Parthavi</h1> <div className="w-8 h-8"></div> </div> )}

                {/* Messages Container - SCROLL AREA */}
                 <div ref={chatContainerRef} className={clsx('flex-1 overflow-y-auto scroll-smooth min-h-0', 'px-4 md:px-10 lg:px-20 pt-4 pb-4')} >
                    {/* Inner div for max-width and content alignment */}
                    {/* Apply justify-end ONLY when showing messages */}
                    <div className={clsx("max-w-3xl mx-auto w-full h-full flex flex-col", showMessagesList ? 'justify-end' : 'justify-center items-center')} >
                        {/* Loader */}
                        {isLoading && <div className="flex justify-center items-center p-10 text-gray-500"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading... </div>}
                        {/* Placeholders */}
                        {showAnyPlaceholder && placeholderType === 'initial' && <InitialPlaceholder onPromptClick={handlePromptClick} />}
                        {showAnyPlaceholder && placeholderType === 'new_thread' && <NewThreadPlaceholder onPromptClick={handlePromptClick} />}
                        {/* Error Display */}
                        {showAnyError && <div className='flex flex-col items-center text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md'><AlertCircle className="w-8 h-8 mb-3 text-red-400" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div>}
                        {/* Messages List */}
                        {showMessagesList && <div className="w-full">{messages.map((m) => <ChatMessage key={m.id} message={m.content} isUser={m.isUser} />)}</div>}
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-3xl mx-auto">
                        <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading || (!genAI && !API_KEY)} />
                         {!genAI && !API_KEY && ( <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p> )}
                    </div>
                </div>
            </main>

            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
