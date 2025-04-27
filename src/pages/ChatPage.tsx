// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse, SystemInstruction, GenerateContentRequest } from "@google/genai"; // Ensure GenerateContentRequest is imported

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils';
// Removed InitialPlaceholder import as it seems unused/replaced by NewThreadPlaceholder
import NewThreadPlaceholder from '../components/chat/NewThreadPlaceholder';

// Type definitions
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
// Simplified DisplayMessage - role comes from DB, isUser derived
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { isUser: boolean };
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'>;
type PlaceholderType = 'new_thread' | null; // Removed 'initial'

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Use a potentially more robust/updated model if available

// --- System Instruction (Keep as is) ---
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

const systemInstructionObject: SystemInstruction = { role: "system", parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] }; // Role added for clarity

const saveMessageToDb = async (messageData: MessagePayload): Promise<string | null> => {
    if (!messageData.user_id) { console.error("ChatPage: Save Error - user_id missing."); return null; }
    if (!messageData.thread_id) { console.error("ChatPage: Save Error - thread_id missing."); return null; }
    if (!messageData.content?.trim()) { console.warn(`ChatPage: Attempted to save empty ${messageData.role} message.`); return null; }

    console.log(`ChatPage: Saving ${messageData.role} message to DB for thread ${messageData.thread_id}`);
    try {
        const { data, error } = await supabase.from('messages').insert(messageData).select('id').single();
        if (error) throw error;
        console.log(`ChatPage: Save SUCCESS for ${messageData.role}, DB ID: ${data?.id}`);
        return data?.id;
    } catch (error) {
        console.error(`ChatPage: Save FAILED for ${messageData.role}:`, error);
        // Maybe notify the user or retry? For now, just log.
        return null;
    }
};

let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try { genAI = new GoogleGenAI(API_KEY); console.log("ChatPage: Gemini Client Initialized."); } // Corrected constructor call
    catch (e) { console.error("ChatPage: Gemini Client Init Failed:", e); genAI = null; }
} else { console.warn("ChatPage: VITE_GEMINI_API_KEY not set."); }

const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    // Filter out temporary messages and format for API
    return messages
        .filter(msg => !msg.id.startsWith('temp-')) // Exclude temp messages
        .map((msg): Content => ({
            // API expects 'model' for assistant role
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content ?? '' }], // Ensure text is always a string
        }))
        // Filter out any messages that might have empty content after processing
        .filter(content => content.parts[0].text?.trim());
};

const ChatPage = () => {
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false); // AI is generating response
    const [isLoadingChat, setIsLoadingChat] = useState(true); // Initial load/thread creation
    const [error, setError] = useState<string | null>(null); // General error display
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);

    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover'); // Default to discover
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    // Use a ref to track if it's the very first load or a subsequent thread switch
    const isInitialPageLoad = useRef(true);

    // --- Callbacks ---

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // Delay slightly to allow DOM updates
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
            }
        }, 100); // Increased delay slightly
    }, []);

    const handleCreateNewThread = useCallback(async (prompt?: string): Promise<string | null> => {
        if (!session?.user?.id) {
            setError("Cannot create thread: User not signed in.");
            return null;
        }
        console.log("ChatPage: Creating new thread...");
        setIsLoadingChat(true); // Show loading indicator for thread creation
        setMessages([]);
        setCurrentThreadId(null); // Clear current thread ID immediately
        setPlaceholderType(null);
        setError(null);

        try {
            const newTitle = generateRandomTitle();
            // **IMPORTANT**: Ensure RLS policy allows insert on `threads` for authenticated users:
            // `CREATE POLICY "Allow authenticated users to insert threads" ON threads FOR INSERT WITH CHECK (auth.uid() = user_id);`
            const { data: newThread, error } = await supabase
                .from('threads')
                .insert({ user_id: session.user.id, title: newTitle })
                .select('id')
                .single();

            if (error) throw error;
            if (!newThread?.id) throw new Error("New thread ID missing after insert.");

            const newThreadId = newThread.id;
            console.log("ChatPage: New thread created successfully:", newThreadId);
            setCurrentThreadId(newThreadId); // Set the new thread ID
            setMessages([]); // Ensure messages are empty for the new thread
            setPlaceholderType('new_thread'); // Show the placeholder for the new thread
             // Update URL state without causing a full page reload
             navigate(location.pathname, { replace: true, state: { ...location.state, threadId: newThreadId } });
             setIsLoadingChat(false); // Stop loading indicator

             // If an initial prompt was passed (e.g., from Discover panel), send it now
             if (prompt) {
                 console.log("ChatPage: Sending initial prompt to new thread:", prompt);
                 await handleSendMessage(prompt, newThreadId); // Pass newThreadId explicitly
             }
             return newThreadId; // Return the new ID

        } catch (err: any) {
            console.error("ChatPage: Error creating new thread:", err);
            setError(`Failed to create new chat: ${err.message}. Please ensure RLS policies allow inserts.`);
            setMessages([]); // Clear messages on error
            setCurrentThreadId(null); // Clear thread ID on error
            setPlaceholderType(null);
            setIsLoadingChat(false); // Stop loading indicator
            return null;
        }
    }, [session?.user?.id, navigate, location.pathname, location.state]); // Added handleSendMessage dependency later


    const handleSendMessage = useCallback(async (text: string, threadIdOverride?: string) => {
        const currentThread = threadIdOverride ?? currentThreadId; // Use override if provided (for new threads)
        const userId = session?.user?.id;

        if (!genAI && API_KEY) { setError("AI Client not available. Please check API Key setup."); return; }
        if (!API_KEY) { setError("AI functionality disabled. API Key not configured."); return; }
        if (!currentThread) { setError("Cannot send message: No active chat thread."); return; }
        if (!userId) { setError("Cannot send message: User not identified."); return; }
        if (isResponding) { console.warn("ChatPage: Message sending blocked, already responding."); return; }

        const trimmedText = text.trim();
        if (!trimmedText) return; // Don't send empty messages

        console.log(`ChatPage: Sending message "${trimmedText.substring(0, 20)}..." to thread ${currentThread}`);
        setPlaceholderType(null); // Hide placeholder when a message is sent
        setError(null); // Clear previous errors
        setIsResponding(true); // Start AI responding indicator
        setInputMessage(''); // Clear input field immediately

        // Optimistic UI update for User message
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = {
            id: tempUserMsgId,
            content: trimmedText,
            isUser: true,
            role: 'user',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticUserMsg]);
        // Use requestAnimationFrame to ensure DOM update before scrolling
        requestAnimationFrame(() => scrollToBottom('smooth'));


        // Prepare history *before* adding the temp AI message
        const historyForApi = formatChatHistoryForGemini(messages); // Get history BEFORE optimistic user message
        const currentMessageContent: Content = { role: 'user', parts: [{ text: trimmedText }] };

        // Save User message to DB (fire and forget, handle errors internally)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload); // Don't await, let it run in background

        // Optimistic UI update for AI message (placeholder)
        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = {
            id: tempAiMsgId,
            content: '', // Start with empty content (placeholder)
            isUser: false,
            role: 'assistant',
            created_at: new Date().toISOString(),
        };
        setMessages(prev => [...prev, optimisticAiMsg]);
         // Don't scroll immediately for AI message, wait for content

        // --- Gemini API Call ---
        try {
             if (!genAI) throw new Error("Gemini AI Client lost."); // Re-check just before call

             const requestPayload: GenerateContentRequest = {
                // Combine historical messages with the current one
                contents: [...historyForApi, currentMessageContent],
                // Apply system instruction if needed (check model compatibility)
                systemInstruction: systemInstructionObject, // Assuming model supports it
                 generationConfig: { // Optional: Add safety settings, temperature etc.
                    // temperature: 0.7,
                     // maxOutputTokens: 1000,
                 },
                 // safetySettings: [...] // Define safety settings if needed
             };

            console.log("ChatPage: Sending request to Gemini:", { model: MODEL_NAME, contentCount: requestPayload.contents.length });
            const model = genAI.getGenerativeModel({ model: MODEL_NAME }); // Get model instance
            const result = await model.generateContentStream(requestPayload); // Use model instance

            let accumulatedResponse = "";
            let finalResponse = ""; // Store the fully concatenated response

             // Stream processing
            for await (const chunk of result.stream) {
                try {
                    const chunkText = chunk.text(); // Use the built-in text() method
                    if (chunkText) {
                        accumulatedResponse += chunkText;
                        // Update the temporary AI message content *during* streaming
                        setMessages(prev => prev.map(msg =>
                            msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg
                        ));
                         // Scroll smoothly as content arrives
                         scrollToBottom('smooth');
                    }
                } catch (streamError) {
                     console.error("ChatPage: Error processing stream chunk:", streamError, chunk);
                     // Potentially update UI to show partial response + error?
                     setError("Error receiving response stream.");
                     // Stop processing the stream on error
                     break;
                 }
            }
            finalResponse = accumulatedResponse; // Store the complete text

            console.log("ChatPage: Gemini stream finished. Final length:", finalResponse.length);

            if (finalResponse.trim()) {
                // Save the *final* AI message to DB
                const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: finalResponse, role: 'assistant', user_id: userId };
                const dbId = await saveMessageToDb(aiMessagePayload);

                // Update the message with final content and potential DB ID (for key stability if needed later)
                 setMessages(prev => prev.map(msg =>
                    msg.id === tempAiMsgId
                        ? { ...msg, id: dbId ?? tempAiMsgId, content: finalResponse } // Replace temp ID if DB save succeeded
                        : msg
                ));
            } else {
                console.warn("ChatPage: AI generated empty or whitespace response.");
                // Remove the empty AI placeholder or update it
                 setMessages(prev => prev.filter(msg => msg.id !== tempAiMsgId));
                 // Or update it:
                 // setMessages(prev => prev.map(msg =>
                 //    msg.id === tempAiMsgId ? { ...msg, content: "[AI response was empty]" } : msg
                 // ));
            }
              // Final scroll after all updates
             requestAnimationFrame(() => scrollToBottom('smooth'));

        } catch (aiError: any) {
            console.error("ChatPage: Gemini API call failed:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setError(`AI Error: ${errorMessage}`);
            // Update the placeholder message with the error
            setMessages(prev => prev.map(msg =>
                msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg
            ));
             requestAnimationFrame(() => scrollToBottom('smooth'));
        } finally {
            setIsResponding(false); // Stop responding indicator
        }
    }, [currentThreadId, session?.user?.id, isResponding, messages, scrollToBottom]); // Removed genAI from deps

    // Need to add handleCreateNewThread and handleSendMessage to the useCallback dependency array where they are used
    // For handlePromptClick, which calls both:
     const handlePromptClick = useCallback(async (prompt: string) => {
        if (!currentThreadId) {
            // Create new thread *and* send the prompt
            await handleCreateNewThread(prompt);
        } else {
            // Send prompt to existing thread
            await handleSendMessage(prompt);
        }
    }, [currentThreadId, handleCreateNewThread, handleSendMessage]); // Add dependencies

    // --- Sidebar and Other Callbacks ---
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);

    const handlePanelChange = useCallback((panel: ActivePanelType) => {
        if (!panel) return; // Don't do anything if panel is null
        if (isMobile) {
            // If already open and clicking the same icon, close it. Otherwise, set panel and ensure open.
            if (isMobileSidebarOpen && activePanel === panel) {
                closeMobileSidebar();
            } else {
                setActivePanel(panel);
                setIsMobileSidebarOpen(true);
            }
        } else {
            // If already expanded and clicking same icon, collapse. Otherwise, expand/switch.
            if (isDesktopSidebarExpanded && activePanel === panel) {
                collapseDesktopSidebar();
            } else {
                expandDesktopSidebar(panel);
            }
        }
    }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);

    const handleClickOutside = useCallback((event: MouseEvent) => {
        // Close mobile sidebar if clicking outside it
        if (isMobile && isMobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
            closeMobileSidebar();
        }
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);

    const handleSelectThread = useCallback((threadId: string) => {
        if (threadId !== currentThreadId) {
            console.log("ChatPage: Selecting thread:", threadId);
            // Update state and URL history
            navigate(location.pathname, { replace: true, state: { ...location.state, threadId: threadId } });
            // State update (currentThreadId, messages, etc.) will be handled by the main useEffect watching location.state
             if (isMobile) closeMobileSidebar();
        } else {
            console.log("ChatPage: Clicked already active thread.");
             if (isMobile) closeMobileSidebar(); // Still close sidebar on mobile
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname, location.state]);

    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);
    const closeSharePopup = () => setIsSharePopupOpen(false);


    // --- Effects ---

    // Redirect if not logged in
    useEffect(() => {
        if (!userLoading && !session) {
            console.log("ChatPage: No session, redirecting to sign-in.");
            navigate('/', { replace: true });
        }
    }, [session, userLoading, navigate]);

    // Main effect for loading chat history or creating new thread based on user and URL state
    useEffect(() => {
        const currentUserId = session?.user?.id;
        const threadIdFromState = location.state?.threadId as string | undefined;

        console.log(`ChatPage: Load Effect Triggered. UserLoading: ${userLoading}, UserID: ${currentUserId}, StateThreadID: ${threadIdFromState}`);

        if (userLoading) {
            console.log("ChatPage: Waiting for user context to load...");
            setIsLoadingChat(true); // Ensure loading state is true while user context loads
            return;
        }

        if (!currentUserId) {
            console.log("ChatPage: No user ID found, cannot load chat.");
             setIsLoadingChat(false); // Stop loading if no user
             setMessages([]);
             setCurrentThreadId(null);
             setError("Please sign in to start chatting.");
            return; // Don't proceed without a user
        }

        setError(null); // Clear previous errors on load/reload

        // Determine if we are switching threads or loading initially
        const isSwitchingThread = currentThreadId !== threadIdFromState;

        // --- Load specific thread ---
        if (threadIdFromState) {
             // Only reload if the thread ID actually changes or it's the initial load
             if (isSwitchingThread || isInitialPageLoad.current) {
                console.log("ChatPage: Loading thread:", threadIdFromState);
                setIsLoadingChat(true);
                setMessages([]); // Clear previous messages
                setPlaceholderType(null);
                setCurrentThreadId(threadIdFromState); // Set the active thread ID

                supabase.from('messages')
                    .select('id, created_at, role, content') // Select necessary fields
                    .eq('thread_id', threadIdFromState)
                    .eq('user_id', currentUserId) // **Ensure user owns the messages**
                    .order('created_at', { ascending: true })
                    .then(({ data: existingMessages, error: messagesError }) => {
                        if (messagesError) {
                            console.error("ChatPage: Error loading messages:", messagesError);
                            setError(`Failed to load chat history: ${messagesError.message}. Check RLS.`);
                            setMessages([]);
                        } else {
                            const formatted = (existingMessages || []).map(msg => ({
                                id: msg.id,
                                content: msg.content ?? '',
                                isUser: msg.role === 'user',
                                role: msg.role as 'user' | 'assistant', // Assert type
                                created_at: msg.created_at,
                            }));
                            setMessages(formatted);
                            // Show placeholder only if the loaded thread is empty
                            setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                            console.log("ChatPage: Messages loaded successfully, count:", formatted.length);
                             // Scroll to bottom after initial load/switch
                            requestAnimationFrame(() => scrollToBottom('auto'));
                        }
                         setIsLoadingChat(false); // Stop loading
                         isInitialPageLoad.current = false; // Mark initial load as complete
                    });
            } else {
                 console.log("ChatPage: Thread ID in state matches current, no reload needed.");
                 // Ensure loading is false if we skip the fetch
                 if (isLoadingChat) setIsLoadingChat(false);
                 isInitialPageLoad.current = false; // Mark initial load as complete even if skipped
            }
        }
        // --- Create new thread if none exists ---
        else {
             if (isInitialPageLoad.current || !currentThreadId) { // Create only on initial load or if currentThreadId got cleared
                 console.log("ChatPage: No thread ID in state, creating new thread.");
                 // handleCreateNewThread already sets isLoadingChat appropriately
                 handleCreateNewThread(); // Don't pass prompt here, let placeholder handle it
                 isInitialPageLoad.current = false; // Mark initial load as complete
             } else {
                  console.log("ChatPage: No thread ID in state, but already have a current thread - likely state inconsistency?");
                  // Avoid creating another thread if we already have one active but state is missing ID
                   if (isLoadingChat) setIsLoadingChat(false); // Ensure loading is false
                  isInitialPageLoad.current = false;
             }
        }

    // Key dependencies: user session, location state, and the creation function
    }, [session?.user?.id, userLoading, location.state?.threadId, handleCreateNewThread, navigate, currentThreadId, isLoadingChat]); // Added currentThreadId, isLoadingChat

    // Effect for scrolling when new messages are added (but not on initial load)
     useEffect(() => {
         if (!isInitialPageLoad.current && messages.length > 0 && !isLoadingChat) {
             // Only scroll smoothly if it's not the initial load/switch
             scrollToBottom('smooth');
         }
     }, [messages, isLoadingChat, scrollToBottom]); // Depend on messages and loading state


    // Effect for handling clicks outside the mobile sidebar
    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);

    // --- Render Logic ---

    // Show global loading state if user context is loading
    if (userLoading && !session) {
        return (
            <div className="flex items-center justify-center h-screen bg-background text-secondary">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Initializing...
            </div>
        );
    }

    // Determine content visibility
    const showPlaceholder = !isLoadingChat && messages.length === 0 && placeholderType === 'new_thread' && !error;
    const showMessagesList = !isLoadingChat && messages.length > 0 && !error;
    const showError = !isLoadingChat && !!error;

     // Disable input when loading chat history, creating thread, or AI is responding
     const isInputDisabled = isLoadingChat || isResponding || !genAI || !!error;

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
             {/* Mobile Sidebar Overlay */}
             <AnimatePresence>
                 {isMobile && isMobileSidebarOpen && (
                     <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/40 z-30 md:hidden"
                        onClick={closeMobileSidebar}
                        aria-hidden="true"
                    />
                 )}
             </AnimatePresence>

             {/* Sidebar Container */}
             <motion.div
                ref={sidebarRef}
                className={clsx(
                    "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80 transition-transform duration-300 ease-in-out",
                    // Width classes based on state
                    isMobile ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16') // Mobile: Open width or icon width
                             : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), // Desktop: Expanded or icon width
                    // Mobile transform for sliding in/out
                    isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full')
                )}
                // Animate width changes on desktop smoothly (optional, can use CSS transitions too)
                // layout="position" // Framer motion layout animation for smoother transitions if needed
             >
                  <Sidebar
                    isExpanded={!isMobile && isDesktopSidebarExpanded}
                    isMobileOpen={isMobile && isMobileSidebarOpen}
                    activePanel={activePanel}
                    onPanelChange={handlePanelChange}
                    openSharePopup={openSharePopup}
                    onCloseMobileSidebar={closeMobileSidebar}
                    onSelectThread={handleSelectThread}
                    onNewThread={handleCreateNewThread} // Pass the creation function
                    currentThreadId={currentThreadId}
                 />
             </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && (
                    <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14 bg-background z-10">
                        <button
                            onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar}
                            className="p-2 text-gray-600 hover:text-primary"
                            aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
                        >
                            {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />}
                        </button>
                        <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">
                           Parthavi Chat
                        </h1>
                        {/* Placeholder to balance the header */}
                        <div className="w-8 h-8"></div>
                    </div>
                )}

                 {/* Chat Messages Container */}
                 <div
                    ref={chatContainerRef}
                    className={clsx(
                        'flex-1 overflow-y-auto scroll-smooth min-h-0', // Ensure min-h-0 for flex child scroll
                        'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4' // Responsive padding
                     )}
                 >
                    {/* Inner container for centering/max-width and vertical alignment */}
                    <div className={clsx(
                        "max-w-4xl mx-auto w-full flex flex-col min-h-full",
                        // Justify center if showing placeholder/error/loading, otherwise justify end
                        (isLoadingChat || showPlaceholder || showError) ? 'justify-center items-center' : 'justify-end'
                     )}
                    >
                        {isLoadingChat && (
                            <div className="flex justify-center items-center p-10 text-gray-500 flex-1">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat...
                            </div>
                        )}

                        {showPlaceholder && (
                             <div className="flex-1 flex items-center justify-center w-full pb-20"> {/* Add padding bottom */}
                                <NewThreadPlaceholder onPromptClick={handlePromptClick} />
                            </div>
                        )}

                        {showError && (
                             <div className="flex-1 flex flex-col items-center justify-center w-full text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md border border-red-200">
                                <AlertCircle className="w-8 h-8 mb-3 text-red-400" />
                                <p className="font-semibold mb-1">Oops! Something went wrong.</p>
                                <p className="text-sm">{error}</p>
                                <button
                                     onClick={() => window.location.reload()} // Simple reload for now
                                     className="mt-4 text-xs text-blue-600 hover:underline"
                                 >
                                     Try reloading the page?
                                 </button>
                             </div>
                         )}

                        {showMessagesList && (
                            <div className="w-full space-y-1.5 md:space-y-2"> {/* Reduced spacing */}
                                {messages.map((m) => (
                                    <ChatMessage
                                        key={m.id} // Use DB id or temp id
                                        message={m.content}
                                        isUser={m.isUser}
                                        senderName={m.isUser ? (userName || 'You') : 'Parthavi'}
                                    />
                                ))}
                                {/* Optional: Add typing indicator here based on isResponding */}
                                 {/* {isResponding && messages[messages.length - 1]?.role === 'user' && (
                                     <ChatMessage message="" isUser={false} senderName="Parthavi" /> // Renders "Thinking..."
                                 )} */}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <ChatInput
                            value={inputMessage}
                            onChange={handleInputChange}
                            onSendMessage={() => handleSendMessage(inputMessage)} // Pass current input value
                            isResponding={isInputDisabled} // Input is disabled if loading or responding or error
                        />
                         {!genAI && !API_KEY && (
                             <p className="text-xs text-red-500 mt-2 text-center px-4">
                                AI functionality is disabled. Missing API Key.
                            </p>
                         )}
                    </div>
                </div>
            </main>

            {/* Share Popup */}
            <SharePopup isOpen={isSharePopupOpen} onClose={closeSharePopup} />
        </div>
    );
};

export default ChatPage;

// Add handleSendMessage to handleCreateNewThread's dependency array
// Wrap the definition of handleCreateNewThread with useCallback
// and include handleSendMessage in its dependency array.
ChatPage.prototype.handleCreateNewThread = useCallback(ChatPage.prototype.handleCreateNewThread, [ChatPage.prototype.handleSendMessage]);
