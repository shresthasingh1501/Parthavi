// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse } from "@google/genai";

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage'; // Ensure ChatMessage is imported
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
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { isUser: boolean; timestamp: string };
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'>;
type PlaceholderType = 'initial' | 'new_thread' | null;

const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";

const saveMessageToDb = async (messageData: MessagePayload) => {
    if (!messageData.user_id) {
        console.error("Background save FAILED: user_id is missing.");
        return null;
    }
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

let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try {
        genAI = new GoogleGenAI({ apiKey: API_KEY });
        console.log("Gemini AI Client Initialized using @google/genai.");
    } catch (e) {
        console.error("Failed to initialize Gemini AI Client:", e);
        genAI = null;
    }
} else {
    console.warn("VITE_GEMINI_API_KEY is not set. AI features will be disabled.");
}

const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    return messages.map((msg): Content => ({
        role: msg.role === 'user' ? 'user' : 'model',
        parts: [{ text: msg.content }],
    })).filter(content => content.parts[0].text?.trim());
};

const ChatPage = () => {
    const { session, user, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation(); // Get location object

    // --- State ---
    // Initialize thread ID *only* if passed via state, otherwise null (forces creation)
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(location.state?.threadId || null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true); // Start true until thread is loaded/created
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null); // Adjusted initial state
    // Sidebar State
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

    // Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true); // To prevent scroll on initial load

    // --- Callbacks ---
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // Delay slightly to allow DOM update after message add
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior: behavior
                });
            }
        }, 50);
    }, []);

    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => {
        if (!session?.user) {
            console.error("Cannot create thread: No user session.");
            setCreateThreadError("User session not found.");
            return null;
        }
        console.log("Attempting to create new thread...");
        setChatLoading(true); // Show loading while creating
        setMessages([]); // Clear messages for new thread
        setCurrentThreadId(null); // Ensure current thread ID is cleared
        setPlaceholderType(null); // Clear placeholder
        setCreateThreadError(null);
        setApiError(null);
        try {
            const newTitle = generateRandomTitle();
            const { data: newThread, error } = await supabase
                .from('threads')
                .insert({ user_id: session.user.id, title: newTitle })
                .select('id')
                .single();

            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");

            console.log("New thread created successfully:", newThread.id);
            setCurrentThreadId(newThread.id);
            setPlaceholderType('new_thread'); // Show placeholder for the new empty thread

            // Update URL state without forcing navigation if already on /chat
            if (location.pathname === '/chat') {
                 navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });
            } else {
                 navigate('/chat', { replace: true, state: { threadId: newThread.id } });
            }


            if (shouldSetActive) {
                 setActivePanel('discover'); // Optionally reset panel
                 if (isMobile) closeMobileSidebar();
                 else expandDesktopSidebar('discover');
            }
            setChatLoading(false);
            return newThread.id; // Return the new ID

        } catch (error: any) {
            console.error("Error creating new thread:", error);
            setCreateThreadError(error.message || "Failed to create new thread.");
            setChatLoading(false);
            setCurrentThreadId(null); // Ensure ID is null on error
            setPlaceholderType(null); // Don't show placeholder on error
            return null; // Return null on error
        }
    }, [session, navigate, location.pathname, isMobile]); // Removed sidebar control functions from deps

    // --- Main Send Message Logic ---
    const handleSendMessage = useCallback(async (text: string) => {
        // ... (Keep the initial checks for genAI, currentThread, isResponding, etc.)
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId; // Use state variable
        if (!currentThread || isResponding || !session?.user) return;
        const trimmedText = text.trim();
        if (!trimmedText) return;

        if (placeholderType) setPlaceholderType(null);
        setCreateThreadError(null);
        setApiError(null);
        const userId = session.user.id;
        setIsResponding(true);
        setInputMessage('');

        // 1. Optimistic User Message
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: new Date().toISOString() };
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);
        setMessages(prev => [...prev, optimisticUserMsg]);
        scrollToBottom('smooth');

        // 2. Save User Message
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        // 3. Optimistic AI Message
        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticAiMsg]);
        scrollToBottom('smooth'); // Scroll for the empty AI bubble

        // 4. Call Gemini API
        try {
            const requestPayload = { model: MODEL_NAME, contents: historyForApi, config: { responseMimeType: 'text/plain' } };
            if (!genAI) throw new Error("Gemini AI Client lost.");

            console.log("Sending API request...");
            const result = await genAI.models.generateContentStream(requestPayload);
            console.log("API response received.");

            let accumulatedResponse = "";
            let streamSource = null;

            if (result && typeof result[Symbol.asyncIterator] === 'function') {
                streamSource = result as AsyncIterable<GenerateContentResponse>;
            } else if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') {
                streamSource = result.stream;
            } else {
                 throw new Error(`Unexpected API response structure: ${JSON.stringify(result).substring(0,100)}...`);
            }

            if (streamSource) {
                 console.log("Processing stream...");
                 for await (const chunk of streamSource) {
                    // Using the confirmed path from logs
                    const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                    // console.log("Raw chunk:", chunk); // Optional: keep for deep debug
                    // console.log("Extracted text:", chunkText); // Optional: keep for deep debug

                    if (chunkText) {
                        accumulatedResponse += chunkText;
                        // Update message state - this triggers re-render of ChatMessage
                        setMessages(prev => prev.map(msg =>
                            msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg
                        ));
                    }
                 }
                 console.log("Finished processing stream.");
            }
             // Scroll after stream processing is fully done
             scrollToBottom('smooth');


            // 5. Save Complete AI Response
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
            setMessages(prev => prev.map(msg =>
                 msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg
             ));
             scrollToBottom('smooth');
        } finally {
            setIsResponding(false);
        }
    }, [currentThreadId, isResponding, session, messages, placeholderType, scrollToBottom]); // Keep dependencies


    // --- Effects ---

    // Effect for Auth check
    useEffect(() => {
        if (!userLoading && !session) {
            console.log("No session, navigating to /");
            navigate('/', { replace: true });
        }
    }, [session, userLoading, navigate]);

    // Effect for Initial Thread Loading / Creation
    useEffect(() => {
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) {
            // Still loading user or no user, do nothing yet
            setChatLoading(false); // Ensure loading stops if user is definitely not logged in
            return;
        }

        const threadIdFromState = location.state?.threadId;

        if (threadIdFromState && threadIdFromState === currentThreadId) {
             // Already on the correct thread specified by state, likely HMR, do nothing
             console.log("Already on the target thread:", threadIdFromState);
             setChatLoading(false); // Ensure loading is false
             if (messages.length === 0 && !apiError && !createThreadError) {
                 setPlaceholderType('new_thread'); // Show placeholder if empty
             }
             return;
        }


        const initializeChat = async () => {
             setChatLoading(true); // Start loading indicator
             setMessages([]);
             setApiError(null);
             setCreateThreadError(null);
             setPlaceholderType(null);

            if (threadIdFromState) {
                // Case 1: Navigated with a specific thread ID
                console.log("Loading specified thread from state:", threadIdFromState);
                setCurrentThreadId(threadIdFromState); // Update state

                 try {
                    const { data: existingMessages, error: messagesError } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('thread_id', threadIdFromState)
                        .order('created_at', { ascending: true });

                    if (messagesError) throw messagesError;

                    const formatted = existingMessages.map(msg => ({ id: msg.id, content: msg.content ?? '', isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: new Date(msg.created_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }), created_at: msg.created_at }));
                    setMessages(formatted);
                    if (formatted.length === 0) {
                        setPlaceholderType('new_thread'); // Show placeholder if thread is empty
                    } else {
                        setPlaceholderType(null); // Has messages
                         isInitialMount.current = false; // Allow scroll after initial load
                    }
                    setChatLoading(false);
                    scrollToBottom('auto'); // Scroll down on load

                } catch (error: any) {
                    console.error("Error loading messages for specified thread:", error);
                    setMessages([]);
                    setCreateThreadError(`Failed to load chat: ${error.message}`);
                    setChatLoading(false);
                }

            } else {
                // Case 2: No specific thread ID in state - CREATE NEW THREAD
                console.log("No thread specified in state, creating a new one.");
                await handleCreateNewThread(false); // Create new thread, don't trigger sidebar change
                // handleCreateNewThread sets loading state internally
            }
        };

        initializeChat();

    // Include location.state?.threadId as dependency to re-run if user selects a different thread
    }, [session?.user?.id, userLoading, location.state?.threadId, handleCreateNewThread]); // Make sure handleCreateNewThread is stable or included


    // Effect for Scrolling (Runs AFTER messages update)
    useEffect(() => {
        // Only scroll smoothly if it's not the initial load/mount
        if (!isInitialMount.current) {
            scrollToBottom('smooth');
        }
    }, [messages, scrollToBottom]); // Run when messages array changes

    // Sidebar and Other Handlers (Keep as is, but ensure stability)
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => { if (isMobile) { if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar(); else { setActivePanel(panel); setIsMobileSidebarOpen(true); } } else { if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar(); else expandDesktopSidebar(panel); } }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => { if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) { if (isMobile && isMobileSidebarOpen) closeMobileSidebar(); } }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);
    useEffect(() => { if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside); else document.removeEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isMobile, isMobileSidebarOpen, handleClickOutside]);
    // handleSelectThread now just sets state, effect handles loading
    const handleSelectThread = useCallback((threadId: string) => {
        if (threadId !== currentThreadId) {
             console.log("Selecting thread:", threadId);
            // Update URL state to trigger the loading useEffect
             navigate(location.pathname, { replace: true, state: { threadId: threadId } });
             // Close sidebar immediately
             if (isMobile) closeMobileSidebar();
        } else {
             // If clicking the current thread, just close mobile sidebar if open
             if (isMobile) closeMobileSidebar();
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
    const handlePromptClick = useCallback((prompt: string) => {
        // If no thread exists yet, create one first
        if (!currentThreadId) {
            handleCreateNewThread(false).then((newId) => {
                if (newId) {
                    setInputMessage(prompt);
                     // Optional: Trigger send immediately? Or just fill input?
                    // handleSendMessage(prompt);
                }
            });
        } else {
            setInputMessage(prompt);
            // Optional: focus input?
        }
    }, [currentThreadId, handleCreateNewThread]); // Removed handleSendMessage dependency
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);


    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background">Loading User...</div>;

    const showPlaceholder = !chatLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showError = !chatLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden"> {/* Ensure outer div allows flex */}
             {/* Sidebar and Overlay */}
             <AnimatePresence> {isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true" /> )} </AnimatePresence>
             <motion.div ref={sidebarRef} className={clsx("relative h-full flex-shrink-0 z-40 md:z-auto transition-transform duration-300 ease-in-out", "bg-background border-r border-gray-200/80", isMobile ? (isMobileSidebarOpen ? 'translate-x-0' : '-translate-x-full') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), )} transition={{ type: "tween", duration: 0.2 }} >
                  <Sidebar isExpanded={isDesktopSidebarExpanded && !isMobile} isMobileOpen={isMobileSidebarOpen && isMobile} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
             </motion.div>

            {/* Main Chat Area - CRITICAL FOR SCROLL */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative"> {/* Use flex-col and overflow-hidden */}
                {/* Mobile Header */}
                {isMobile && ( <div className="flex items-center justify-between px-4 py-2 border-b border-gray-200/60 flex-shrink-0"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-gray-600 hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="text-base font-semibold text-secondary">Parthavi</h1> <div className="w-8"></div> </div> )}

                {/* Messages Container - Scrollable Area */}
                 <div
                    ref={chatContainerRef}
                    // IMPORTANT: flex-1 allows it to grow, overflow-y-auto enables scrollbar, min-h-0 helps flex calculation
                    className={clsx(
                        'flex-1 overflow-y-auto scroll-smooth min-h-0', // <-- Ensure these are present
                        'px-4 md:px-10 lg:px-20 pt-4 pb-4'
                    )}
                >
                    {/* Inner container for max-width and padding/alignment */}
                    <div className={clsx(
                        "max-w-3xl mx-auto w-full h-full flex flex-col", // Use h-full and flex-col
                         showPlaceholder || showError ? 'justify-center items-center' : 'justify-end', // Align content appropriately
                        )}
                    >
                        {/* Loader */}
                        {chatLoading && ( <div className="flex justify-center items-center p-10 text-gray-500"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat... </div> )}
                        {/* Placeholders */}
                        {!chatLoading && !showError && placeholderType === 'initial' && <InitialPlaceholder onPromptClick={handlePromptClick} />}
                        {!chatLoading && !showError && placeholderType === 'new_thread' && <NewThreadPlaceholder onPromptClick={handlePromptClick} />}
                        {/* Error Display */}
                         {!chatLoading && showError && ( <div className='flex flex-col items-center justify-center text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md'> <AlertCircle className="w-8 h-8 mb-3 text-red-400" /> <p className="font-medium mb-1">Oops! Something went wrong.</p> <p className="text-sm">{errorText}</p> {!API_KEY && genAI === null && ( <p className="text-xs mt-3 text-gray-500">Note: AI Client is not configured. Please ensure the VITE_GEMINI_API_KEY is set correctly.</p> )} </div> )}
                        {/* Messages List */}
                        {!chatLoading && !showPlaceholder && !showError && (
                            // This div ensures messages stack from bottom when justify-end is active
                            <div className="w-full">
                                {messages.map((message) => (
                                    <ChatMessage key={message.id} message={message.content} isUser={message.isUser} />
                                ))}
                            </div>
                         )}
                    </div>
                </div>

                {/* Input Area - flex-shrink-0 prevents it from shrinking */}
                <div className="px-4 md:px-10 lg:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-3xl mx-auto">
                        <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading || (!genAI && !API_KEY)} />
                         {!genAI && !API_KEY && ( <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p> )}
                    </div>
                </div>
            </main>

            {/* Share Popup */}
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
