// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle } from 'lucide-react'; // Removed Search as it's not used here
import { useMediaQuery } from 'react-responsive';
// Correct imports for this version
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse, SystemInstruction } from "@google/genai";

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage'; // Ensure this is imported
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext'; // Ensure useUser is imported
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils';
import InitialPlaceholder from '../components/chat/InitialPlaceholder';
import NewThreadPlaceholder from '../components/chat/NewThreadPlaceholder';

// Type definitions (Simpler for this version)
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & {
    isUser: boolean;
    timestamp: string;
    isPending?: boolean; // Keep for the "thinking" indicator
    isError?: boolean;
    // Removed tool-related flags
};
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'> & { metadata?: any }; // Keep metadata simple
type PlaceholderType = 'initial' | 'new_thread' | null;

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash"; // Keep consistent model name

// --- System Instruction (Remains the same) ---
const SYSTEM_INSTRUCTION_TEXT = `
**Persona & Role:**
You are Parthavi, an advanced AI career advisor chatbot. Your core mission is to empower Indian women by providing exceptional, personalized, and culturally sensitive guidance for their professional journeys. You act as a knowledgeable, supportive, and encouraging mentor figure.

**Tone & Style:**
Maintain a delicate balance: be professional and insightful, yet simultaneously warm, friendly, approachable, and empathetic. Your tone should be consistently positive and empowering. Communicate clearly and concisely, breaking down complex information into digestible, actionable steps. Use standard U.S. English spelling and grammar. Employ relevant emojis sparingly (e.g., ✨, 👍, 🤔, 🤝, 🎯, 💡, ✅) to add a touch of human warmth and relatability, mimicking a helpful human advisor in a chat context, but never overdo it or become unprofessional. Avoid jargon where possible, or explain it clearly if necessary. Never adopt a lecturing or condescending tone.

**Core Capabilities & Interaction:**
1.  **Active Listening & Clarification:** Pay close attention to user input. Ask clarifying questions proactively whenever a query is ambiguous, lacks context, or requires more specific detail to provide meaningful advice. Examples: "Could you tell me a bit more about the industry you're interested in?", "What specific aspects of salary negotiation feel most challenging for you?", "To give you the best advice on that workplace issue, could you share a little more detail about the situation (without naming names)?"
2.  **Actionable Advice:** Focus on providing practical steps, strategies, resources, and frameworks that the user can implement. Frame advice constructively.
3.  **Conciseness:** Respect the user's time. While being thorough, avoid unnecessary verbosity. Use bullet points or numbered lists for clarity when presenting multiple options or steps.
4.  **Contextual Awareness:** Remember the flow of the current conversation to provide relevant follow-up and avoid repeating information unnecessarily.
5.  **Cultural Sensitivity (India Focus):** Be mindful of potential cultural nuances relevant to women in the Indian workforce (e.g., navigating family expectations alongside career ambitions, specific industry landscapes, common workplace dynamics) but **critically avoid making generalizations or stereotypes.** Base any culturally relevant points on widely accepted professional knowledge, not assumptions.

**Content Domain & Boundaries (Strict Guardrails):**
1.  **Career Focus ONLY:** Your knowledge and conversation **must remain strictly confined** to career development, job searching, resume/CV building, interview preparation, skill enhancement (professional skills), salary negotiation, workplace challenges (e.g., communication, conflict resolution, bias), networking, mentorship, career changes, entrepreneurship (related to career paths), professional goal setting, and work-life balance strategies *as they pertain to professional life*.
2.  **Strict Topic Refusal:** **Politely but firmly decline** any requests or attempts to discuss topics outside this defined career domain. This includes, but is not limited to: personal relationships (romantic, familial, friendships - unless *directly* and significantly impacting a specific workplace dynamic being discussed), health/medical advice (beyond generic stress management tips for work), financial investment advice, politics, religion, entertainment, gossip, illegal activities, or any other non-career-related subject. Use clear refusal phrases like: "My expertise is centered on career guidance, so I can't assist with [unrelated topic]. Can we focus back on your professional goals?" or "That topic falls outside my scope as a career advisor. How can I help with your career journey today?" Do not get drawn into off-topic discussions.
3.  **Absolute Gender Neutrality & Bias Rejection:** This is paramount. You **must operate with zero gender bias**. Your programming strictly prohibits generating responses that reinforce gender stereotypes or discriminatory views. You **must refuse** to answer questions or engage in discussions premised on gender bias. If a user query contains inherent gender bias or asks for advice based on stereotypes (e.g., "Should women avoid certain fields?"), politely decline the biased premise: "I cannot provide advice based on gender stereotypes. My guidance focuses on individual skills, interests, and objective career factors. How can I help you explore career options based on those?" or "My purpose is to provide fair and unbiased career advice. I cannot address questions rooted in gender bias." Do not engage the bias directly; simply refuse the biased framing and redirect to an objective, skills-based approach if possible within the career domain.

**Overall Goal:** Be the most helpful, reliable, empowering, and *safe* AI career advisor possible for your specific user group, always operating within your defined ethical boundaries and professional scope.
`;

const systemInstructionObject: SystemInstruction = { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] };

// Helper: Save message to DB
const saveMessageToDb = async (messageData: MessagePayload) => {
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role);
    try {
        const dataToInsert = { ...messageData, metadata: messageData.metadata || null };
        const { data, error } = await supabase.from('messages').insert(dataToInsert).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`Background save FAILED for ${messageData.role}:`, error); return null; }
};

// Helper: Initialize Gemini Client
let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try { genAI = new GoogleGenAI({ apiKey: API_KEY }); console.log("Gemini Initialized."); }
    catch (e) { console.error("Gemini Init Failed:", e); genAI = null; }
} else { console.warn("VITE_GEMINI_API_KEY not set."); }

// Helper: Format history for API (Simpler version without tool handling)
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    return messages
      .filter(msg => !msg.isError && !msg.isPending) // Filter out error/pending messages
      .map((msg): Content => ({
        role: msg.role as Role, // 'user' or 'assistant' mapped to 'user' or 'model'
        parts: [{ text: msg.content }],
    })).filter(content => content.parts[0].text?.trim()); // Ensure no empty parts
};


// --- Component ---
const ChatPage = () => {
    // --- Hooks ---
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    // --- State ---
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(location.state?.threadId || null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

    // --- Refs ---
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    // --- Callbacks ---
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
            }
        }, 60);
    }, []);

    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => {
        // Using optional chaining for safety
        if (!session?.user?.id) { setCreateThreadError("User session not found."); return null; }
        console.log("Attempting to create new thread...");
        setChatLoading(true); setMessages([]); setCurrentThreadId(null);
        setPlaceholderType(null); setCreateThreadError(null); setApiError(null);
        try {
            const newTitle = generateRandomTitle();
            const { data: newThread, error } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single();
            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");
            console.log("New thread created:", newThread.id);
            setCurrentThreadId(newThread.id);
            setPlaceholderType('new_thread');
            navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });
            if (shouldSetActive) { setActivePanel('discover'); }
            setChatLoading(false);
            return newThread.id;
        } catch (error: any) {
            console.error("Error creating new thread:", error);
            setCreateThreadError(error.message || "Failed to create new thread.");
            setChatLoading(false); setCurrentThreadId(null); setPlaceholderType(null);
            return null;
        }
    }, [session?.user?.id, navigate, location.pathname]); // Added session.user.id

    // --- handleSendMessage (Reverted to Wait-Then-Reveal, No Function Calls) ---
    const handleSendMessage = useCallback(async (text: string) => {
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        // Using optional chaining for safety
        if (!currentThread || isResponding || !session?.user?.id) return;
        const trimmedText = text.trim(); if (!trimmedText) return;

        setPlaceholderType(null);
        setCreateThreadError(null); setApiError(null);
        const userId = session.user.id;
        setIsResponding(true); setInputMessage('');

        // 1. Prepare & Add User Message
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: "", created_at: new Date().toISOString() };
        const nextMessages = [...messages, optimisticUserMsg]; // Prepare next state array
        const historyForApi = formatChatHistoryForGemini(nextMessages); // Format history *before* setting state
        setMessages(nextMessages); // Update UI
        scrollToBottom('smooth');

        // 2. Save User Message (Fire-and-forget)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        // 3. Add Pending AI Message Placeholder
        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isPending: true }; // Mark as pending
        setMessages(prev => [...prev, optimisticAiMsg]); // Add pending message
        // No scroll here yet

        try {
            // 4. Prepare API Request (including system instruction)
            const requestPayload = {
                // model: MODEL_NAME, // Often specified at client/model init
                contents: historyForApi,
                systemInstruction: systemInstructionObject,
                 // No 'tools' needed for this version
                 config: { responseMimeType: 'text/plain' },
            };

            if (!genAI) throw new Error("Gemini AI Client lost.");
            // Use the initialized genAI client instance directly
            const model = genAI.getGenerativeModel({ model: MODEL_NAME }); // Get model reference
            const result = await model.generateContentStream(requestPayload); // Call stream method


            // 5. Accumulate Full Response from Stream
            let accumulatedResponse = "";
            for await (const chunk of result.stream) {
                const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                    accumulatedResponse += chunkText;
                }
            }

            // 6. Update State ONCE with Full Response
            if (accumulatedResponse) {
                setMessages(prev => prev.map(msg =>
                    msg.id === tempAiMsgId
                        ? { ...msg, content: accumulatedResponse, isPending: false } // Set full content, remove pending
                        : msg
                ));
                // Save the complete AI message to DB
                const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedResponse, role: 'assistant', user_id: userId };
                saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving AI message:", err));
            } else {
                console.warn("AI generated empty response.");
                setMessages(prev => prev.map(msg =>
                    msg.id === tempAiMsgId ? { ...msg, content: "[No text content received]", isPending: false, isError: true } : msg // Mark as error
                ));
            }
            // Scroll *after* final content update
            scrollToBottom('smooth');

        } catch (aiError: any) {
            console.error("Gemini API call error:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setApiError(errorMessage);
            // Update placeholder message to show the error
            setMessages(prev => prev.map(msg =>
                msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}`, isPending: false, isError: true } : msg
            ));
            scrollToBottom('smooth');
        } finally {
            setIsResponding(false); // Ensure input is unlocked
        }
    }, [currentThreadId, isResponding, session?.user?.id, messages, scrollToBottom]); // Use session.user.id

    // --- Other Callbacks (No changes needed from previous correct version) ---
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => { if (isMobile) { if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar(); else { setActivePanel(panel); setIsMobileSidebarOpen(true); } } else { if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar(); else expandDesktopSidebar(panel); } }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => { if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) { if (isMobile && isMobileSidebarOpen) closeMobileSidebar(); } }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);
     const handleSelectThread = useCallback((threadId: string) => { if (threadId !== currentThreadId) { console.log("Selecting thread:", threadId); setApiError(null); setCreateThreadError(null); navigate(location.pathname, { replace: true, state: { threadId: threadId } }); if (isMobile) closeMobileSidebar(); } else { if (isMobile) closeMobileSidebar(); } }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
     const handlePromptClick = useCallback((prompt: string) => { if (!currentThreadId) { handleCreateNewThread(false).then((newId) => { if (newId) { requestAnimationFrame(() => handleSendMessage(prompt)); } }); } else { handleSendMessage(prompt); } }, [currentThreadId, handleCreateNewThread, handleSendMessage]);
     const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
     const openSharePopup = () => setIsSharePopupOpen(true);


    // --- Effects (No changes needed from previous correct version) ---
    useEffect(() => { if (!userLoading && !session) navigate('/', { replace: true }); }, [session, userLoading, navigate]);

    useEffect(() => {
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) { setChatLoading(false); return; }
        const threadIdFromState = location.state?.threadId;
        console.log("Load Effect Triggered: User=", !!currentUserId, "UserLoading=", userLoading, "State Thread=", threadIdFromState, "Current Thread=", currentThreadId);
        if (threadIdFromState === currentThreadId && !isInitialMount.current && !chatLoading) { console.log("Load Effect: Thread ID unchanged, skipping reload."); return; }
        const initializeChat = async () => {
            setChatLoading(true); setMessages([]); setApiError(null); setCreateThreadError(null); setPlaceholderType(null);
            console.log("Load Effect: Initializing Chat...");
            if (threadIdFromState) {
                console.log("Load Effect: Loading thread from state:", threadIdFromState);
                if (threadIdFromState !== currentThreadId) { setCurrentThreadId(threadIdFromState); }
                try {
                    // Select only necessary columns, simplify metadata handling
                    const { data: existingMessages, error: messagesError } = await supabase.from('messages').select('id, role, created_at, content, metadata').eq('thread_id', threadIdFromState).order('created_at', { ascending: true });
                    if (messagesError) throw messagesError;
                    const formatted = existingMessages.map(msg => ({ id: msg.id, content: msg.content ?? '', isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: "", created_at: msg.created_at, isPending: false, isError: (msg.metadata as any)?.isError ?? false })); // Simplified DisplayMessage creation
                    setMessages(formatted);
                    setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                    console.log("Load Effect: Messages loaded, count=", formatted.length);
                    setChatLoading(false);
                    requestAnimationFrame(() => { scrollToBottom('auto'); });
                } catch (error: any) { console.error("Load Effect: Error loading messages:", error); setMessages([]); setCurrentThreadId(null); navigate(location.pathname, { replace: true, state: {} }); setCreateThreadError(`Failed to load chat: ${error.message}`); setChatLoading(false); setPlaceholderType(null); }
            } else { console.log("Load Effect: No thread in state, creating new one."); await handleCreateNewThread(false); }
             isInitialMount.current = false;
        };
        initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id, userLoading, location.state?.threadId]); // Removed handleCreateNewThread from deps

    useEffect(() => { if (!chatLoading && messages.length > 0) { const scrollBehavior = isInitialMount.current ? 'auto' : 'smooth'; scrollToBottom(scrollBehavior); } }, [messages, chatLoading, scrollToBottom]); // Depend on loading state too

    useEffect(() => { if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside); else document.removeEventListener('mousedown', handleClickOutside); return () => document.removeEventListener('mousedown', handleClickOutside); }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background text-primary">Loading User...</div>; // Use primary text color

    const isLoading = chatLoading;
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;
    const aiDisabled = !API_KEY;

    console.log("Render Check: isLoading", isLoading, "showAnyPlaceholder", showAnyPlaceholder, "showAnyError", showAnyError, "showMessagesList", showMessagesList, "messages.length", messages.length, "placeholderType", placeholderType);

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
            <AnimatePresence>{isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true"/> )}</AnimatePresence>
            <motion.div ref={sidebarRef} className={clsx( "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80", "transition-transform duration-300 ease-in-out", isMobile ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full') )}>
                <Sidebar isExpanded={!isMobile && isDesktopSidebarExpanded} isMobileOpen={isMobile && isMobileSidebarOpen} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
            </motion.div>

            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {isMobile && ( <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-gray-600 hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">Parthavi</h1> <div className="w-8 h-8"></div> </div> )}
                <div ref={chatContainerRef} className={clsx('flex-1 overflow-y-auto scroll-smooth min-h-0', 'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4')} >
                    <div className={clsx("max-w-4xl mx-auto w-full flex flex-col min-h-full", showMessagesList ? 'justify-end' : 'justify-center items-center')} >
                        {isLoading && <div className="flex justify-center items-center p-10 text-gray-500 flex-1"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading... </div>}
                        {showAnyPlaceholder && placeholderType === 'initial' && <div className="flex-1 flex items-center justify-center w-full"><InitialPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyPlaceholder && placeholderType === 'new_thread' && <div className="flex-1 flex items-center justify-center w-full"><NewThreadPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyError && <div className="flex-1 flex items-center justify-center w-full"><div className='flex flex-col items-center text-center text-red-600 p-4 bg-red-50 rounded-lg max-w-md border border-red-300'><AlertCircle className="w-8 h-8 mb-3 text-red-500" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div></div>}
                        {/* Render messages, passing necessary props */}
                        {showMessagesList && <div className="w-full space-y-4 md:space-y-5">{messages.map((m) => <ChatMessage key={m.id} message={m.content} isUser={m.isUser} senderName={m.isUser ? (userName || 'You') : 'Parthavi'} isPending={m.isPending} isError={m.isError} />)}</div>}
                    </div>
                </div>
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading || aiDisabled} />
                         {aiDisabled && ( <p className="text-xs text-orange-600 mt-2 text-center px-4"> AI functionality is disabled (Missing Gemini API Key). </p> )}
                    </div>
                </div>
            </main>
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
