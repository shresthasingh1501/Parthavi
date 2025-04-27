// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse, SystemInstruction } from "@google/genai";

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils';
import NewThreadPlaceholder from '../components/chat/NewThreadPlaceholder'; // Corrected Import Name

// Type definitions
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & { isUser: boolean; timestamp: string };
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'>;
type PlaceholderType = 'initial' | 'new_thread' | null;

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";

// --- System Instruction ---
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

let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try { genAI = new GoogleGenAI({ apiKey: API_KEY }); console.log("Gemini Initialized."); }
    catch (e) { console.error("Gemini Init Failed:", e); genAI = null; }
} else { console.warn("VITE_GEMINI_API_KEY not set."); }

const saveMessageToDb = async (messageData: MessagePayload) => {
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role);
    try {
        const { data, error } = await supabase.from('messages').insert(messageData).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`Background save FAILED for ${messageData.role}:`, error); return null; }
};

const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    // Filter out any temporary messages or messages with no content before sending to API
    return messages
        .filter(msg => msg.id && typeof msg.id === 'string' && !msg.id.startsWith('temp-') && msg.content?.trim())
        .map((msg): Content => ({
            role: msg.role === 'user' ? 'user' : 'model', parts: [{ text: msg.content }],
        }));
};


const ChatPage = () => {
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();

    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    // State for chat management
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true); // Overall loading state for the chat view
    const [apiError, setApiError] = useState<string | null>(null); // Error from AI API calls
    const [threadError, setThreadError] = useState<string | null>(null); // Error from thread creation/loading
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>('initial'); // 'initial', 'new_thread', null

    // State for sidebar/UI management
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover'); // Default to Discover panel
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

    // Refs
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
     const isInitialRenderComplete = useRef(false);


    // --- Core Functions ---

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // Use a small delay to allow DOM updates
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({
                    top: chatContainerRef.current.scrollHeight,
                    behavior
                });
            }
        }, 50); // Reduced delay slightly
    }, []);

    const loadExistingThread = useCallback(async (threadId: string, userId: string) => {
        console.log("Loading existing thread:", threadId);
        setChatLoading(true);
        setMessages([]); // Clear messages before loading
        setApiError(null);
        setThreadError(null);
        setPlaceholderType(null); // Assume content will load

        try {
            const { data: existingMessages, error: messagesError } = await supabase
                .from('messages')
                .select('*')
                .eq('thread_id', threadId)
                .eq('user_id', userId) // Added security check
                .order('created_at', { ascending: true });

            if (messagesError) throw messagesError;

            const formatted = (existingMessages || []).map(msg => ({
                id: msg.id,
                content: msg.content ?? '',
                isUser: msg.role === 'user',
                role: msg.role as 'user' | 'assistant', // Cast role
                timestamp: new Date(msg.created_at).toISOString(), // Use ISO string for consistency
                created_at: msg.created_at // Keep original DB timestamp
            }));

            console.log("Messages loaded for thread", threadId, ":", formatted.length);
            setCurrentThreadId(threadId);
            setMessages(formatted);

            // If no messages in the loaded thread, show the 'new_thread' placeholder
            if (formatted.length === 0) {
                setPlaceholderType('new_thread');
                console.log("Loaded thread is empty, showing new_thread placeholder.");
            } else {
                setPlaceholderType(null); // Hide placeholder if messages loaded
            }

        } catch (error: any) {
            console.error("Error loading messages for thread:", threadId, error);
            setMessages([]); // Ensure messages are cleared on error
            setThreadError(error.message || "Failed to load chat history.");
            setCurrentThreadId(null); // Clear current thread on error
            setPlaceholderType(null); // Hide placeholder on error
        } finally {
             setChatLoading(false); // Loading finished
             // Scroll on load completion, after state updates have potential to render
             requestAnimationFrame(() => {
                 scrollToBottom('auto'); // Use 'auto' for initial load to jump without animation
             });
        }
    }, [scrollToBottom]); // Only depends on scrollToBottom

    const handleCreateNewThread = useCallback(async (): Promise<string | null> => {
        if (!session?.user) {
            console.warn("Cannot create thread, user session missing.");
            setThreadError("User session not found. Please sign in again.");
            return null;
        }
        console.log("Attempting to create new thread...");
        setChatLoading(true); // Show loading while creating
        setMessages([]); // Clear messages
        setCurrentThreadId(null); // Clear current thread
        setApiError(null);
        setThreadError(null);
        setPlaceholderType(null); // Hide initial placeholder during creation

        try {
            const newTitle = generateRandomTitle(); // Or use a default title
            const { data: newThread, error } = await supabase
                .from('threads')
                .insert({ user_id: session.user.id, title: newTitle })
                .select('id')
                .single();

            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");

            console.log("New thread created:", newThread.id);

            // Update state with the new thread ID and show the new_thread placeholder
            setCurrentThreadId(newThread.id);
            setMessages([]); // Ensure messages are empty for a new thread
            setPlaceholderType('new_thread'); // Show the placeholder for a fresh chat

            // Navigate replaces the current history entry, adding the new threadId to state
            // This allows refreshing the page and keeping the thread context
            navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });

            return newThread.id; // Return the new ID
        } catch (error: any) {
            console.error("Error creating new thread:", error);
            setThreadError(error.message || "Failed to create new conversation.");
            setCurrentThreadId(null); // Ensure no thread is active on error
            setMessages([]);
            setPlaceholderType(null); // Hide placeholder on error
            return null;
        } finally {
            setChatLoading(false); // Creation process finished
        }
    }, [session, navigate, location.pathname]); // Depends on session, navigate, location.pathname

     const handleSendMessage = useCallback(async (text: string, targetThreadId?: string) => {
        if (!genAI) { setApiError("AI Client not configured (Missing API Key)."); return; }

        // Use the threadId passed as argument or the currentThreadId
        const threadIdToSend = targetThreadId || currentThreadId;

        if (!threadIdToSend || isResponding || !session?.user) {
             if (!threadIdToSend) console.error("Cannot send message, no thread ID available.");
             if (isResponding) console.warn("Cannot send message, AI is currently responding.");
             if (!session?.user) console.warn("Cannot send message, user session missing.");
            return;
        }

        const trimmedText = text.trim();
        if (!trimmedText) return;

        setPlaceholderType(null); // Hide any placeholder once typing/sending starts
        setApiError(null); // Clear previous API errors
        // Don't clear threadError here, as it might be related to thread creation/loading

        const userId = session.user.id;
        setIsResponding(true);
        setInputMessage(''); // Clear input immediately

        // --- Add optimistic user message ---
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: new Date().toISOString(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticUserMsg]);
        scrollToBottom('smooth');

        // --- Save user message to DB (background) ---
        const userMessagePayload: MessagePayload = { thread_id: threadIdToSend, content: trimmedText, role: 'user', user_id: userId };
        // Save user message and update its ID when done
         const savedUserMsgId = await saveMessageToDb(userMessagePayload);
         if(savedUserMsgId) {
             setMessages(prev => prev.map(msg =>
                 msg.id === tempUserMsgId ? { ...msg, id: savedUserMsgId as string } : msg
             ));
         } else {
             console.warn("Failed to save user message, leaving temporary ID.");
         }

        // --- Add placeholder AI message (initially empty content) ---
        const tempAiMsgId = `temp-ai-${Date.now() + 1}`; // Ensure different temp ID
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: new Date().toISOString(), created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticAiMsg]);
        // Scroll to show the new message placeholder
        scrollToBottom('smooth');

        // --- Prepare history for API, excluding temporary messages ---
        const historyForApi = formatChatHistoryForGemini([...messages, { ...optimisticUserMsg, id: savedUserMsgId || tempUserMsgId }]); // Use saved ID if available

        try {
            const requestPayload = {
                model: MODEL_NAME,
                contents: historyForApi,
                config: {
                    responseMimeType: 'text/plain',
                    systemInstruction: systemInstructionObject,
                },
            };

            if (!genAI) throw new Error("Gemini AI Client not initialized.");
            const result = await genAI.models.generateContentStream(requestPayload);

            let accumulatedResponse = "";
            const streamSource = result?.stream; // Access the stream property

            if (!streamSource || typeof streamSource[Symbol.asyncIterator] !== 'function') {
                 throw new Error(`Unexpected API response structure or stream not found: ${JSON.stringify(result).substring(0,100)}...`);
            }

            // --- Accumulate full response before updating state ---
            for await (const chunk of streamSource) {
                const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                if (chunkText) {
                    accumulatedResponse += chunkText;
                }
            }

            // --- Update AI message state ONCE after stream finishes ---
            const finalContent = accumulatedResponse || "[No text content received]";
            setMessages(prev => prev.map(msg =>
                msg.id === tempAiMsgId
                    ? { ...msg, content: finalContent } // Set the full content
                    : msg
            ));
            // Save the complete AI message to DB
            const aiMessagePayload: MessagePayload = { thread_id: threadIdToSend, content: finalContent, role: 'assistant', user_id: userId };
            await saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving AI message:", err));

            // Scroll after the final content is set
            scrollToBottom('smooth');


        } catch (aiError: any) {
            console.error("Gemini API call error:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setApiError(errorMessage); // Set API error state
            // Update the placeholder message with error
            setMessages(prev => prev.map(msg =>
                msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg
            ));
            scrollToBottom('smooth'); // Scroll to reveal the error message
        } finally {
            setIsResponding(false); // Stop responding indicator
        }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom]);


    // --- Effects ---

    // Effect 1: Handle user authentication state changes
    useEffect(() => {
        // This effect runs whenever session or userLoading changes.
        // Its primary job is to redirect if the user signs out or isn't logged in after loading.
        if (!userLoading) {
            if (!session) {
                console.log("Auth effect: User loading complete, no session found, navigating to /");
                 // Only navigate if not already on the sign-in page
                 if (location.pathname !== '/') {
                    navigate('/', { replace: true });
                 }
            } else {
                console.log("Auth effect: User loading complete, session found for", session.user.id);
                // User is signed in, the next effect will handle thread loading/creation.
                // No action needed here other than logging.
            }
        } else {
             console.log("Auth effect: User is still loading...");
        }
    }, [session, userLoading, navigate, location.pathname]); // Depends on session, userLoading, navigate, location.pathname

    // Effect 2: Handle initial thread loading or creation based on URL state
    useEffect(() => {
        const currentUserId = session?.user?.id;
        const threadIdFromState = location.state?.threadId;

        // Only proceed if user context is not loading and we have a user AND ChatPage is actually mounted and ready
        // Add a check to prevent this effect from running before the first render is complete
        // This helps prevent issues with state updates before the component tree is stable
        if (userLoading || !currentUserId) {
            console.log("Load/Create Effect: User loading or no user, waiting or handled by Auth Effect.");
             // If user becomes null after loading, ensure chat state is reset
            if (!currentUserId && !userLoading) {
                 setCurrentThreadId(null);
                 setMessages([]);
                 setChatLoading(false); // Stop loading as no user means no chat to load
                 setApiError(null);
                 setThreadError(null);
                 setPlaceholderType(null); // No placeholder if no user
            }
            return;
        }

         // Prevent re-running load/create logic if dependencies change but the core chat state is already initialized for the current thread
         // This also prevents unnecessary re-creation of threads if state changes unrelated to threadId/user
         // Allow re-initialization if threadIdFromState changes, even if currentThreadId is also set
         const shouldLoadThread = threadIdFromState && threadIdFromState !== currentThreadId;
         const shouldCreateThread = !threadIdFromState && currentThreadId === null; // Only create if no ID in state AND no current ID

         if (!shouldLoadThread && !shouldCreateThread && messages.length > 0 && currentThreadId) {
             console.log("Load/Create Effect: Current thread state matches and has messages, skipping initialization.");
             setChatLoading(false); // Ensure loading is off if state matches
             // Ensure placeholder is null if we have messages
             if (placeholderType !== null) setPlaceholderType(null);
             return;
         }


        console.log("Load/Create Effect: User found, initializing chat logic.", { currentUserId, threadIdFromState, currentThreadId, shouldLoadThread, shouldCreateThread });

        const initializeChat = async () => {
            console.log("Load/Create Effect: initializeChat starting...");
            // Reset state for new load/creation attempt
            setChatLoading(true);
            setMessages([]);
            setApiError(null);
            setThreadError(null);
            setPlaceholderType(null); // Will be set correctly below

            if (threadIdFromState) {
                console.log("Load/Create Effect: Attempting to load thread from state:", threadIdFromState);
                await loadExistingThread(threadIdFromState, currentUserId);
            } else {
                console.log("Load/Create Effect: No thread in state, creating new one.");
                await handleCreateNewThread(); // Call the updated function
                // handleCreateNewThread now handles setting state, navigation, and placeholder
            }
             console.log("Load/Create Effect: initializeChat finished.");
             // setChatLoading(false) is handled within loadExistingThread and handleCreateNewThread
        };

         // Trigger initialization only if we need to load or create a thread
         // And only if the user is loaded and present
        if (shouldLoadThread || shouldCreateThread) {
            initializeChat();
        } else if (!chatLoading) {
             // If we didn't need to load/create, but we aren't loading, ensure placeholder is set if messages are empty
             if (messages.length === 0 && placeholderType === null) {
                  console.log("Load/Create Effect: No load/create needed, messages are empty, setting new_thread placeholder.");
                  setPlaceholderType('new_thread');
             }
             // If we have messages and no placeholder, ensure placeholder is null
             if (messages.length > 0 && placeholderType !== null) {
                  console.log("Load/Create Effect: No load/create needed, messages exist, setting placeholder to null.");
                 setPlaceholderType(null);
             }
        }


         // Flag that the initial render/load is complete after the first run
         // This is slightly complex with navigation, might need refinement.
         // For now, let's assume the initial state setup happens here.
         // isInitialRenderComplete.current = true; // Moved this to a separate effect that checks for user/thread being ready

    }, [session?.user?.id, userLoading, location.state?.threadId, currentThreadId, messages.length, placeholderType, loadExistingThread, handleCreateNewThread]); // Dependencies for loading/creation effect

    // Effect 3: Scroll to bottom when messages update OR when placeholder appears/changes state
    useEffect(() => {
         console.log("Scroll Effect triggered. Messages count:", messages.length, "Placeholder:", placeholderType);
        // Only scroll if the initial render/load is complete AND (messages have changed OR placeholder state has changed)
        // Check if component is mounted and user is loaded before scrolling
        if (!userLoading && session?.user) {
            if (messages.length > 0) {
                 console.log("Scrolling to bottom (messages).");
                 scrollToBottom('smooth');
            } else if (placeholderType !== null) {
                 // If messages are empty and a placeholder is active, scroll to ensure the placeholder is visible
                 console.log("Scrolling to bottom (placeholder).");
                 scrollToBottom('auto'); // Use 'auto' to jump quickly to the placeholder
            } else {
                 console.log("Scroll Effect: Messages empty, no placeholder, not scrolling.");
            }
        } else {
             console.log("Scroll Effect: User not loaded or not signed in, skipping scroll.");
        }
    }, [messages, placeholderType, scrollToBottom, userLoading, session]); // Depend on messages, placeholderType, scroll function, and user state

    // Effect 4: Flag initial render completion after user and initial thread state is resolved
    useEffect(() => {
        // This effect runs once user loading is complete and session/currentThreadId are set (or determined to be null)
        // It signifies that the ChatPage has finished its primary setup based on auth and URL state.
        if (!userLoading) {
             console.log("Initial Render Complete Effect: User loading finished.", { user: session?.user?.id, currentThreadId });
             isInitialRenderComplete.current = true;
             // Potential place to set placeholderType('initial') if no threadId was in state and no new one was created?
             // Or rely on Effect 2's logic to set placeholderType('new_thread') when create happens
             if (!session?.user) {
                  // If user is not logged in after loading, ensure placeholder is null
                  setPlaceholderType(null);
             } else if (messages.length === 0 && currentThreadId === null && !threadError) {
                 // If user is logged in, but no thread exists (and no error), set placeholder to initial?
                 // No, handleCreateNewThread should set 'new_thread'. Let's keep it simple.
                 // The logic in Effect 2 should ensure placeholderType is either 'new_thread' or null correctly.
             }
        } else {
            console.log("Initial Render Complete Effect: User still loading...");
        }
    }, [userLoading, session, currentThreadId, messages.length, threadError]); // Depends on user state and initial chat state

    // Effect 5: Handle clicks outside mobile sidebar
    useEffect(() => {
        const handleGlobalClick = (event: MouseEvent) => {
             // Check if sidebar ref exists and the click is outside of it
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                if (isMobile && isMobileSidebarOpen) {
                    closeMobileSidebar();
                }
            }
        };

        if (isMobile && isMobileSidebarOpen) {
            // Add mousedown listener for better responsiveness
            document.addEventListener('mousedown', handleGlobalClick);
        } else {
            document.removeEventListener('mousedown', handleGlobalClick);
        }

        // Cleanup
        return () => {
            document.removeEventListener('mousedown', handleGlobalClick);
        };
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);


    // --- Handlers for UI Interactions ---

    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => {
        // Only open if user is loaded (sidebar content depends on user)
        if (!userLoading && session?.user) {
             if (!activePanel) setActivePanel('discover'); // Default panel if none active
             setIsMobileSidebarOpen(true);
        } else {
            console.warn("Attempted to open mobile sidebar while user is loading or not signed in.");
        }
    }, [activePanel, userLoading, session]); // Depend on user/session loading

    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => {
         // Only expand if user is loaded
        if (!userLoading && session?.user) {
            setActivePanel(panel || 'discover'); // Default to Discover
            setIsDesktopSidebarExpanded(true);
        } else {
            console.warn("Attempted to expand desktop sidebar while user is loading or not signed in.");
        }
    }, [userLoading, session]);


    const handlePanelChange = useCallback((panel: ActivePanelType) => {
         // Only allow panel change if user is loaded
        if (userLoading || !session?.user) {
             console.warn("Attempted panel change while user is loading or not signed in.");
             return; // Do nothing if user isn't ready
        }

        if (isMobile) {
            // On mobile, clicking an active panel closes, clicking inactive opens/switches
            if (isMobileSidebarOpen && activePanel === panel) {
                closeMobileSidebar();
            } else {
                setActivePanel(panel);
                setIsMobileSidebarOpen(true); // Ensure sidebar opens when changing panel
            }
        } else {
            // On desktop, clicking an active panel collapses the panel view
            if (isDesktopSidebarExpanded && activePanel === panel) {
                collapseDesktopSidebar();
            } else {
                setActivePanel(panel); // Set panel first
                expandDesktopSidebar(panel); // Then expand
            }
        }
    }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar, userLoading, session]);


     const handleSelectThread = useCallback((threadId: string) => {
        // Only select thread if not already selected and user is loaded
        if (threadId !== currentThreadId && !userLoading && session?.user) {
            console.log("Selecting thread:", threadId);
            // Update URL state, which will trigger the load/create effect
            navigate(location.pathname, { replace: true, state: { threadId: threadId } });
             if (isMobile) closeMobileSidebar(); // Close sidebar on mobile
        } else if (isMobile) {
             // If mobile and already on the thread or user loading, just close sidebar
             closeMobileSidebar();
        } else {
             // Desktop, no change, maybe do nothing or visually indicate already selected
             console.log("Attempted to select already active thread or user loading.");
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname, userLoading, session]); // Added userLoading, session


     const handlePromptClick = useCallback((prompt: string) => {
         // This handler is primarily for the NewThreadPlaceholder
         // It should always initiate a new thread creation if one doesn't exist,
         // or send the message in the *current* (likely new and empty) thread.
         console.log(`Prompt clicked: "${prompt}". Current thread ID: ${currentThreadId}`);

         if (!session?.user || userLoading) {
              console.warn("Attempted prompt click while user is loading or not signed in.");
             // Maybe show a message to the user? Or the button should be disabled.
              return;
         }

         // If there's no current thread ID, create one first, then send the message
        if (!currentThreadId) {
             console.log("No current thread ID, creating new thread before sending prompt.");
             // Call handleCreateNewThread and chain the send message call
             handleCreateNewThread()
                 .then(newThreadId => {
                     if (newThreadId) {
                         console.log("New thread created after prompt click, sending message...");
                         // Pass the new thread ID explicitly to handleSendMessage
                         handleSendMessage(prompt, newThreadId);
                     } else {
                         console.error("Failed to create new thread after prompt click.");
                         // handleCreateNewThread should set threadError state
                     }
                 })
                 .catch(err => {
                     console.error("Error during handleCreateNewThread or handleSendMessage chain:", err);
                      setThreadError("Failed to start chat with prompt."); // Generic error
                 });
        } else {
             // If a thread ID already exists (even if it's a new empty one), just send the message in it
             console.log("Current thread ID exists, sending message directly.");
             handleSendMessage(prompt);
        }

         if (isMobile) closeMobileSidebar(); // Close sidebar on mobile after clicking a prompt


    }, [currentThreadId, handleCreateNewThread, handleSendMessage, isMobile, closeMobileSidebar, session, userLoading]); // Added session, userLoading


    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);


    // --- Render Logic ---

    // Show a global loading screen if user context is still loading
    if (userLoading) {
        console.log("Rendering: User Loading");
        return (
            <div className="flex items-center justify-center h-screen bg-background text-secondary">
                <Loader2 className="w-6 h-6 animate-spin mr-3" />
                Loading User...
            </div>
        );
    }

     // User context finished loading, but no session found - UserContext should handle redirect
     if (!session || !user) {
         console.log("Rendering: User Loading Complete, No Session. UserContext should redirect.");
         // We render null or a minimal state here as UserContext is responsible for navigation
         return null; // Or a simple spinner/message that disappears when redirect happens
     }


    // Determine content to show in the main chat area
    const showChatContent = !chatLoading && messages.length > 0;
    const showPlaceholderContent = !chatLoading && messages.length === 0 && !threadError && !apiError && placeholderType !== null;
    const showAnyError = !chatLoading && (!!threadError || !!apiError);
    const errorText = threadError || apiError || "An unexpected error occurred."; // Prioritize thread errors

     console.log("Rendering: Chat View State Check", {
        userLoaded: !userLoading,
        hasSession: !!session,
        chatLoading: chatLoading,
        messagesCount: messages.length,
        threadError: !!threadError,
        apiError: !!apiError,
        placeholderType: placeholderType,
        showChatContent,
        showPlaceholderContent,
        showAnyError
    });

    // Conditionally set exit animation for the mobile overlay based on environment
    const overlayExitAnimation = process.env.NODE_ENV === 'development' ? {} : { opacity: 0 }; // Empty object disables exit animation


    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
             {/* Mobile Sidebar Overlay */}
             <AnimatePresence>
                 {isMobile && isMobileSidebarOpen && (
                     <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         // --- MODIFIED: Conditionally disable exit in development ---
                         exit={overlayExitAnimation}
                         // --- END MODIFIED ---
                         transition={{ duration: 0.2 }}
                         className="fixed inset-0 bg-black/30 z-30 md:hidden"
                         onClick={closeMobileSidebar}
                         aria-hidden="true"
                     />
                 )}
            </AnimatePresence>

            {/* Sidebar */}
             <motion.div
                 ref={sidebarRef}
                 className={clsx(
                     "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80",
                     "transition-transform duration-300 ease-in-out",
                     isMobile
                         ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16')
                         : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP),
                     isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full')
                 )}
             >
                  <Sidebar
                    isExpanded={!isMobile && isDesktopSidebarExpanded}
                    isMobileOpen={isMobile && isMobileSidebarOpen}
                    activePanel={activePanel}
                    onPanelChange={handlePanelChange}
                    openSharePopup={openSharePopup}
                    onCloseMobileSidebar={closeMobileSidebar}
                    onSelectThread={handleSelectThread}
                    onNewThread={handleCreateNewThread} // Pass the create function
                    currentThreadId={currentThreadId}
                 />
             </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && (
                     <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14 bg-background z-10"> {/* Added bg and z-index */}
                         <button
                            onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar}
                            className="p-2 text-gray-600 hover:text-primary"
                            aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}
                         >
                            {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />}
                         </button>
                         {/* Display Thread Title or App Name */}
                         <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">
                            {/* You might want to display the current thread's title here */}
                            Parthavi
                         </h1>
                         {/* Placeholder for alignment */}
                         <div className="w-8 h-8"></div>
                     </div>
                )}

                 {/* Chat Messages / Placeholder / Error Area */}
                 <div
                    ref={chatContainerRef}
                    className={clsx(
                       'flex-1 overflow-y-auto scroll-smooth min-h-0 w-full',
                       'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4',
                       // Center content if showing placeholder or error
                       (showPlaceholderContent || showAnyError) ? 'flex justify-center items-center' : 'flex flex-col items-center'
                    )}
                 >
                    <div className={clsx(
                         "max-w-4xl mx-auto w-full flex flex-col",
                         // Keep messages aligned to bottom if content overflows, center otherwise
                         showChatContent ? 'min-h-0 justify-end' : 'min-h-full justify-center items-center text-center'
                         )}
                    >
                        {/* Loading State */}
                        {chatLoading && (
                             <div className="flex justify-center items-center p-10 text-gray-500 flex-grow"> {/* Use flex-grow to center in available space */}
                                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chat...
                            </div>
                        )}

                        {/* Placeholder State (Initial or New Thread) */}
                        {showPlaceholderContent && (
                            <div className="flex-grow flex items-center justify-center w-full"> {/* Use flex-grow */}
                                {placeholderType === 'new_thread' && <NewThreadPlaceholder onPromptClick={handlePromptClick} />}
                                {/* Note: Both initial and new_thread states currently use the same placeholder component */}
                                {/* The 'initial' placeholder type is primarily for logic, visually it's the same as 'new_thread' */}
                            </div>
                        )}

                        {/* Error State */}
                        {showAnyError && (
                             <div className="flex-grow flex items-center justify-center w-full"> {/* Use flex-grow */}
                                <div className='flex flex-col items-center text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md'>
                                    <AlertCircle className="w-8 h-8 mb-3 text-red-400" />
                                    <p className="font-medium mb-1">Oops! Something went wrong.</p>
                                    <p className="text-sm">{errorText}</p>
                                    <p className="text-xs mt-2 text-gray-600">Please try again. If the problem persists, contact support.</p>
                                </div>
                            </div>
                        )}

                        {/* Messages List */}
                        {showChatContent && (
                           <div className="w-full space-y-4 md:space-y-5">
                                {messages.map((m) => (
                                    <ChatMessage
                                        key={m.id} // Key is crucial
                                        message={m.content}
                                        isUser={m.isUser}
                                        senderName={m.isUser ? (userName || 'You') : 'Parthavi'}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Input Area */}
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0 z-10"> {/* Added z-index */}
                    <div className="max-w-4xl mx-auto">
                        {/* Only show input if chat is not loading AND there's no error AND user is loaded */}
                        {!chatLoading && !showAnyError && !userLoading && session?.user && (
                            <ChatInput
                                value={inputMessage}
                                onChange={handleInputChange}
                                onSendMessage={handleSendMessage}
                                isResponding={isResponding}
                            />
                        )}
                         {(!genAI && !API_KEY && !chatLoading && !showAnyError) && (
                             <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p>
                         )}
                         {(showAnyError && !chatLoading) && (
                              <p className="text-xs text-gray-500 mt-2 text-center px-4">
                                  Please resolve the error above to continue chatting.
                              </p>
                         )}
                         {(chatLoading) && (
                             <div className="text-xs text-gray-500 mt-2 text-center px-4"> Loading chat... </div>
                         )}
                         {(!userLoading && !session?.user) && (
                             <div className="text-xs text-gray-500 mt-2 text-center px-4"> Please sign in to chat. </div>
                         )}
                    </div>
                </div>
            </main>

            {/* Share Popup */}
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
