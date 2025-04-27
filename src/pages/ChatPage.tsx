// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle, Sparkles, User } from 'lucide-react'; // Added icons needed for collapsed sidebar
import { useMediaQuery } from 'react-responsive';
import { GoogleGenerativeAI } from "@google/generative-ai"; // Correct Import Name
import { GenerativeContentBlob } from "@google/generative-ai/dist/types/content"; // Import types
import { Content, Part, Role, GenerateContentResponse, SystemInstruction } from "@google/generative-ai"; // Import types

import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Sidebar from '../components/chat/Sidebar';
import SharePopup from '../components/SharePopup';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { Database } from '../types/supabase';
import { generateRandomTitle } from '../utils';
import InitialPlaceholder from '../components/chat/InitialPlaceholder';
// Assuming InitialPlaceholder is also the component for an empty thread placeholder
// If you have a separate one, import it here and use that name
const EmptyThreadPlaceholderComponent = InitialPlaceholder;


// Type definitions
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
// Use a union type for role to match DB and Gemini
type MessageRole = 'user' | 'assistant' | 'system' | 'function' | 'tool';
type DisplayMessage = Omit<DbMessage, 'user_id' | 'updated_at' | 'thread_id'> & { isUser: boolean; role: MessageRole }; // Keep user_id, updated_at, thread_id out of display type
type MessagePayload = Omit<DbMessage, 'id' | 'created_at'>; // Payload for DB insert
type PlaceholderType = 'initial' | 'new_thread' | null;

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const MODEL_NAME = "gemini-1.5-flash-latest"; // Using a stable and fast model


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


// Helper to save message and update thread timestamp
const saveMessageToDb = async (messageData: MessagePayload) => {
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    if (!messageData.thread_id) { console.error("Save Error: thread_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role, 'to thread:', messageData.thread_id);

    try {
        const now = new Date().toISOString();
        const payloadWithTimestamps = {
            ...messageData,
            created_at: now,
            updated_at: now // Set updated_at on message creation
        };

        const { data, error } = await supabase.from('messages').insert(payloadWithTimestamps).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);

        // --- Update the thread's updated_at timestamp ---
         try {
            const { error: threadUpdateError } = await supabase
               .from('threads')
               .update({ updated_at: now }) // Update thread timestamp to now
               .eq('id', messageData.thread_id)
               .select();

            if (threadUpdateError) {
                 console.error("Error updating thread timestamp after message save:", threadUpdateError);
            } else {
                console.log(`Successfully updated thread ${messageData.thread_id} timestamp.`);
            }
         } catch (updateErr) {
             console.error("Exception during thread timestamp update:", updateErr);
         }
        // --- End thread timestamp update ---

        return data?.id;
    } catch (error: any) {
        console.error(`Background save FAILED for ${messageData.role}:`, error);
         if (error && typeof error === 'object' && 'message' in error) {
            console.error("Supabase Error Details:", error.message);
         }
        return null;
    }
};

let genAI: GoogleGenerativeAI | null = null; // Correct type
if (API_KEY) {
    try { genAI = new GoogleGenerativeAI(API_KEY); console.log("Gemini Initialized."); }
    catch (e) { console.error("Gemini Init Failed:", e); genAI = null; }
} else { console.warn("VITE_GEMINI_API_KEY not set."); }

// Filter out system messages and format for Gemini API
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    return messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Only include user/assistant roles
        .map((msg): Content => ({
            role: msg.role === 'user' ? 'user' : 'model', // Map assistant to model for Gemini
            parts: [{ text: msg.content }],
        }))
        .filter(content => content.parts[0].text?.trim()); // Filter out messages with empty content
};


const ChatPage = () => {
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    // Initialize currentThreadId from location state or null
    // Use a state initializer function to read from state only once on mount
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(() => {
        const threadIdFromState = location.state?.threadId;
        console.log("Initial currentThreadId state:", threadIdFromState);
        return threadIdFromState || null;
    });


    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true); // Initial loading state is true
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null); // Placeholder state
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover'); // Default active panel
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);

    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLInputElement>(null); // Use HTMLInputElement or similar for ref type

    // Ref to ensure initial prompt is sent only once per component mount cycle *after* thread is ready
    const initialPromptSent = useRef(false);

    // Ref to track if the very first render after load/sign-in lifecycle is complete
    // Used to prevent auto-scrolling or prompt sending before content is ready
    const hasInitialized = useRef(false);


    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
         console.log("scrollToBottom called with behavior:", behavior);
        // Use requestAnimationFrame to wait for DOM updates
        requestAnimationFrame(() => {
             // Add a small timeout to allow for layout calculations
             setTimeout(() => {
                 if (chatContainerRef.current) {
                    console.log("Scrolling to:", chatContainerRef.current.scrollHeight);
                    chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
                 } else {
                     console.log("scrollToBottom: chatContainerRef.current is null.");
                 }
             }, 50); // Adjust timeout as needed
        });
    }, []);


    // --- Handle Create New Thread ---
    const handleCreateNewThread = useCallback(async (): Promise<string | null> => {
        if (!session?.user) {
             console.warn("handleCreateNewThread: No user session.");
             setCreateThreadError("User session not found. Please sign in.");
             return null;
         }
        console.log("Attempting to create new thread...");

        // Set loading and clear relevant states immediately for perceived responsiveness
        setChatLoading(true);
        setMessages([]); // Clear messages state for the new thread
        setCurrentThreadId(null); // Clear current thread ID while creating
        setPlaceholderType(null); // Clear placeholder temporarily
        setCreateThreadError(null);
        setApiError(null);


        try {
            const newTitle = generateRandomTitle();
            const now = new Date().toISOString();
            const { data: newThread, error } = await supabase.from('threads').insert({
                user_id: session.user.id,
                title: newTitle,
                created_at: now, // Set created_at
                updated_at: now // Set initial updated_at
            }).select('id').single();

            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");

            console.log("New thread created successfully:", newThread.id);

            // Update state reflecting the new empty thread
            setCurrentThreadId(newThread.id); // Set the new thread ID
            setPlaceholderType('new_thread'); // Show the empty thread placeholder
            setMessages([]); // Ensure messages are empty

            // Update URL state if not already set to this thread ID
            // Use replace to avoid accumulating history entries for new threads
             console.log("Updating URL state with new thread ID:", newThread.id);
             navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });


            setChatLoading(false); // Stop loading once thread is created
            initialPromptSent.current = false; // Reset prompt flag for the new thread
            return newThread.id; // Return the new thread ID

        } catch (error: any) {
            console.error("Error creating new thread:", error);
            const errorMessage = error.message || "Failed to create new chat.";
            setCreateThreadError(errorMessage); // Set specific create error
            setChatLoading(false); // Stop loading on error
            setCurrentThreadId(null); // Ensure thread ID is null on error
            setPlaceholderType(null); // Ensure no placeholder is shown on error state
            initialPromptSent.current = false; // Ensure flag is reset on error too
            return null; // Return null on failure
        }
    }, [session, navigate, location.pathname]); // Added location dependencies


    // --- Handle Send Message ---
    const handleSendMessage = useCallback(async (text: string) => {
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) {
             console.warn("handleSendMessage called when chat is not ready.", { currentThread, isResponding, user: session?.user });
             if (!session?.user) setCreateThreadError("User not signed in."); // Use createThreadError for user issues? Or add a new userError state?
             return;
        }
        const trimmedText = text.trim();
        if (!trimmedText) {
             console.warn("Attempted to send empty message.");
            return;
        }

        console.log("Sending message:", trimmedText, "to thread:", currentThread);

        // Clear any previous errors or placeholders once a message is sent
        setPlaceholderType(null);
        setCreateThreadError(null);
        setApiError(null);

        const userId = session.user.id;
        setIsResponding(true); // Indicate AI is thinking
        setInputMessage(''); // Clear input immediately

        // 1. Optimistic User Message
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = {
             id: tempUserMsgId,
             content: trimmedText,
             isUser: true,
             role: 'user', // Role for display
             timestamp: new Date().toLocaleString(), // Add temp timestamp
             created_at: new Date().toISOString() // Add temp created_at
        };

        // 2. Optimistic AI Placeholder Message (empty initially)
        const tempAiMsgId = `temp-ai-${Date.now() + 1}`; // Ensure ID is different
        const optimisticAiMsg: DisplayMessage = {
             id: tempAiMsgId,
             content: '', // Empty content initially
             isUser: false,
             role: 'assistant', // Role for display
             timestamp: new Date().toLocaleString(), // Add temp timestamp
             created_at: new Date().toISOString() // Add temp created_at
        };


        // Prepare history for API *including* the new user message
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);
         console.log("History sent to Gemini API:", historyForApi);

        // Update messages state with both optimistic messages
        setMessages(prev => [...prev, optimisticUserMsg, optimisticAiMsg]);

        // Scroll after adding optimistic messages
        scrollToBottom('smooth');


        // 3. Save User Message to DB (async, fire-and-forget for UI)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
         // We don't await this save, but log potential errors
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message to DB:", err));


        // 4. Call Gemini API
        try {
             if (!genAI) throw new Error("Gemini AI Client not initialized.");

            const chatSession = genAI.getGenerativeModel({ model: MODEL_NAME, systemInstruction: systemInstructionObject }).startChat({
                 history: historyForApi // Pass history to startChat
            });

            const result = await chatSession.generateContentStream({
                contents: [{ role: 'user', parts: [{ text: trimmedText }] }] // Send only the *last* user message in the generate call if history is passed to startChat
                // Alternatively, send the *full* history here and don't use startChat history if you prefer.
                // Passing history to startChat is generally recommended for managing stateful conversations.
            });

            let accumulatedResponse = ""; // Accumulate text here
            // Update the optimistic AI message in the state as chunks arrive
            for await (const chunk of result.stream) {
                 const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                 if (chunkText) {
                    accumulatedResponse += chunkText;
                    // Update the LAST message (which should be the optimistic AI one)
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg
                    ));
                    // Scroll frequently during streaming (auto for less jumpy)
                    scrollToBottom('auto');
                 }
             }

            // 5. Save AI Message to DB (after receiving full response)
            if (accumulatedResponse.trim()) {
                console.log("Full AI response received, saving to DB.");
                const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedResponse, role: 'assistant', user_id: userId };
                // We don't await this save either
                saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving AI message to DB:", err));
            } else {
                 console.warn("Gemini API returned empty text response.");
                 // Update the placeholder message to indicate no response if needed
                 setMessages(prev => prev.map(msg =>
                    msg.id === tempAiMsgId ? { ...msg, content: "[No response generated]" } : msg
                 ));
            }
            // Final scroll after stream ends
            scrollToBottom('smooth');


        } catch (aiError: any) {
            console.error("Gemini API call error:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setApiError(`AI Error: ${errorMessage}`); // Set API error state
            // Update the optimistic AI message with an error indicator
             setMessages(prev => prev.map(msg =>
                 msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg
             ));
             scrollToBottom('smooth'); // Scroll to show the error message
        } finally {
            setIsResponding(false); // Always stop responding indicator
            // No need to setInputMessage('') here as it's done at the start
        }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom, genAI, systemInstructionObject]); // Added genAI and systemInstructionObject to dependencies


    // --- Main Effect for Loading Threads/Messages and Initialization ---
    useEffect(() => {
        const currentUserId = session?.user?.id;
        const threadIdFromState = location.state?.threadId;

        console.log("ChatPage Load Effect START: User Loading:", userLoading, "Session:", !!session, "User ID:", currentUserId, "Thread ID from state:", threadIdFromState, "hasInitialized.current:", hasInitialized.current);

        // If user context is still loading, wait.
        if (userLoading) {
             console.log("ChatPage Load Effect: User context loading, waiting...");
             setChatLoading(true); // Indicate loading state
             setMessages([]); // Clear messages while loading
             setPlaceholderType(null); // Clear placeholder
             setApiError(null);
             setCreateThreadError(null);
             // hasInitialized remains false
            return; // Wait for user context
        }

        // If userLoading is false but no user, redirect.
        if (!currentUserId) {
             console.log("ChatPage Load Effect: No user ID after loading, redirecting to sign-in.");
             navigate('/', { replace: true }); // Redirect if no user
             setChatLoading(false); // Stop loading state as we are redirecting
             hasInitialized.current = false; // Ensure this remains false if we navigate away
             return; // Exit effect
        }

        // If user is loaded and present, proceed with initialization logic
        const initializeChat = async () => {
             console.log("initializeChat START: User ID:", currentUserId, "Thread ID from state:", threadIdFromState);

            // Always start by clearing old state and showing loading
            setChatLoading(true);
            setMessages([]);
            setApiError(null);
            setCreateThreadError(null);
            setPlaceholderType(null); // Clear any previous placeholder


            if (threadIdFromState) {
                console.log("initializeChat: Attempting to load messages for existing thread:", threadIdFromState);
                setCurrentThreadId(threadIdFromState); // Set current thread ID immediately

                 try {
                    // Fetch messages for the specific thread ID
                    console.log(`Fetching messages for thread: ${threadIdFromState}`);
                    const { data: existingMessages, error: messagesError } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('thread_id', threadIdFromState)
                         // Filter by user_id even with RLS off for data integrity
                         .eq('user_id', currentUserId)
                        .order('created_at', { ascending: true });

                    console.log("initializeChat: Supabase messages fetch result:", { data: existingMessages, error: messagesError });


                    if (messagesError) {
                         console.error("initializeChat: Supabase messages fetch ERROR:", messagesError);
                        throw messagesError; // Throw to catch block
                    }

                    const formattedMessages: DisplayMessage[] = (existingMessages || []).map(msg => ({
                         id: msg.id,
                         content: msg.content ?? '',
                         isUser: msg.role === 'user',
                         role: msg.role as MessageRole, // Cast to MessageRole
                         timestamp: new Date(msg.created_at).toLocaleString(),
                         created_at: msg.created_at
                    }));

                    console.log(`initializeChat: Loaded ${formattedMessages.length} messages.`);
                    setMessages(formattedMessages); // Set the messages


                    // Determine placeholder after checking messages
                    if (formattedMessages.length === 0) {
                        console.log("initializeChat: No messages found for this thread, showing 'new_thread' placeholder.");
                         setPlaceholderType('new_thread'); // If thread exists but is empty
                    } else {
                        console.log("initializeChat: Messages loaded, no placeholder needed.");
                        setPlaceholderType(null); // If messages were loaded
                    }


                 } catch (error: any) {
                     console.error("initializeChat: CATCH BLOCK - Error loading messages:", error);
                     setMessages([]); // Ensure messages state is cleared on error
                     const errorMessage = error.message || "Failed to load chat history.";
                     setCreateThreadError(`Load Error: ${errorMessage}`); // Use createThreadError for load failures
                     setPlaceholderType(null); // Ensure no placeholder on error state
                     setCurrentThreadId(null); // Clear thread ID if loading failed significantly
                 } finally {
                     console.log("initializeChat: Fetch/Load process finished.");
                     setChatLoading(false); // Stop loading
                     hasInitialized.current = true; // Mark initialization complete
                     // Scroll only if messages were loaded successfully
                     if (messages.length > 0) {
                          requestAnimationFrame(() => scrollToBottom('auto')); // Initial scroll
                     }
                 }

            } else {
                // No threadId in state on load - this is the initial landing or direct /chat navigation
                console.log("initializeChat: No thread ID in state, assuming new session or navigation. Showing initial placeholder.");
                // Set initial placeholder and loading false immediately.
                setPlaceholderType('initial'); // Show the initial welcome placeholder
                setChatLoading(false); // Stop loading state
                setCurrentThreadId(null); // Ensure no thread is active yet

                hasInitialized.current = true; // Mark initialization complete
                initialPromptSent.current = false; // Ensure flag is reset
            }
        };

        // Execute initialization only once after user context is ready
        // This check prevents re-running initializeChat on every location state change
        // unless the threadId itself changes OR the user changes.
         const isFirstInitAttempt = !hasInitialized.current;
         const userIdChanged = currentUserId !== (session?.user?.id); // Check if user ID actually changed
         const threadIdChanged = threadIdFromState !== currentThreadId; // Check if thread ID in state differs from current state

         if (isFirstInitAttempt || userIdChanged || threadIdChanged) {
             console.log("Running initializeChat:", {isFirstInitAttempt, userIdChanged, threadIdChanged, currentThreadId, threadIdFromState});
             initializeChat();
         } else {
             console.log("Skipping initializeChat: User/Thread ID not changed and already initialized.");
         }


        // Cleanup function - primarily for subscriptions if any were added here
        return () => {
           // No direct Supabase subscriptions are managed here currently,
           // they are in the ThreadsPanelSidebar. If you add any here, clean them up.
            console.log("ChatPage Load Effect Cleanup.");
        };

    // Dependencies: Re-run effect when session user changes or the threadId in the URL state changes, or userLoading finishes
    // userLoading is included to ensure the effect runs *after* user context is resolved
    }, [session?.user?.id, userLoading, location.state?.threadId, navigate, location.pathname, handleCreateNewThread, scrollToBottom]);


    // Effect to handle initial prompts from location state (e.g., from CareerTopicsPage)
    useEffect(() => {
        const initialPrompt = location.state?.initialPrompt;
        console.log("Initial Prompt Effect: initialPrompt:", initialPrompt, "currentThreadId:", currentThreadId, "chatLoading:", chatLoading, "isResponding:", isResponding, "messages.length:", messages.length, "hasInitialized:", hasInitialized.current, "initialPromptSent:", initialPromptSent.current);

        // Only process initial prompt if:
        // 1. There is a prompt in state (`initialPrompt`)
        // 2. A thread ID has been established (`currentThreadId`) - means we are ready to send messages
        // 3. The chat is NOT currently loading messages (`!chatLoading`)
        // 4. The AI is NOT already responding (`!isResponding`)
        // 5. Initialization is complete (`hasInitialized.current`)
        // 6. The prompt hasn't been sent for this thread lifecycle (`!initialPromptSent.current`)
        // 7. There are no *user* messages currently displayed (allows retrying prompt if AI failed, but not if user typed)
        const userMessagesCount = messages.filter(m => m.isUser).length;


        if (initialPrompt && currentThreadId && !chatLoading && !isResponding && hasInitialized.current && !initialPromptSent.current && userMessagesCount === 0) {
             console.log("Initial Prompt Effect: Sending initial prompt:", initialPrompt);
             initialPromptSent.current = true; // Mark prompt as sent for this thread lifecycle
             // Add a small delay before sending message to ensure state updates from thread creation are fully processed
             setTimeout(() => {
                 handleSendMessage(initialPrompt);
             }, 100); // Short delay


             // IMPORTANT: Clear the initialPrompt from state after sending
             // This prevents the prompt from being re-sent if the component re-renders
              console.log("Initial Prompt Effect: Clearing prompt from location state.");
              // Create a new state object without the initialPrompt property
              const newState = { ...location.state };
              delete newState.initialPrompt;
              navigate(location.pathname, { replace: true, state: newState });

        } else if (initialPrompt && hasInitialized.current && initialPromptSent.current) {
            // Case where prompt was present and sent, but component re-rendered. Clear state.
             console.log("Initial Prompt Effect: Prompt already processed, clearing from location state.");
             const newState = { ...location.state };
             delete newState.initialPrompt;
             navigate(location.pathname, { replace: true, state: newState });
        } else if (initialPrompt && !hasInitialized.current) {
             // Case where prompt is present but initialization isn't complete yet. Wait.
             console.log("Initial Prompt Effect: Waiting for initialization before sending prompt.");
        } else if (initialPrompt && userMessagesCount > 0) {
             // Case where prompt is present but user has already typed something. Clear state.
             console.log("Initial Prompt Effect: User has typed messages, ignoring initial prompt from state.");
             const newState = { ...location.state };
             delete newState.initialPrompt;
             navigate(location.pathname, { replace: true, state: newState });
        }


    }, [location.state?.initialPrompt, currentThreadId, chatLoading, isResponding, messages.length, hasInitialized.current, navigate, location.pathname, handleSendMessage, messages]);


     // Effect for scroll to bottom whenever messages change, but NOT on initial render
     useEffect(() => {
         // Only scroll after initialization is complete and messages change
        if (hasInitialized.current && messages.length > 0) {
             console.log("Messages updated (after init), scrolling to bottom.");
             scrollToBottom('smooth');
         } else if (hasInitialized.current && messages.length === 0) {
              // If messages become 0 after initialization, might need to scroll up or do nothing
              // For now, don't auto-scroll down if the list empties unexpectedly after init
              console.log("Messages updated (after init), now empty. Not auto-scrolling.");
         } else if (!hasInitialized.current) {
              console.log("Messages updated (before init). Not auto-scrolling yet.");
         }
     }, [messages, scrollToBottom, hasInitialized.current]);


    // Effect for click outside sidebar on mobile
    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Rendering Logic Flags ---
    // These flags determine what content to show in the main chat area
    const showLoading = chatLoading; // Show loader when chat is explicitly loading (fetch or new thread creation)
    const showInitialPlaceholder = !showLoading && placeholderType === 'initial' && messages.length === 0 && !createThreadError && !apiError;
    const showEmptyThreadPlaceholder = !showLoading && placeholderType === 'new_thread' && messages.length === 0 && !createThreadError && !apiError;
    const showMessages = !showLoading && messages.length > 0 && !createThreadError && !apiError; // Show messages only if there are messages AND no errors
    const showAnyError = !showLoading && (!!createThreadError || !!apiError); // Show error if not loading and an error exists

    // Log the render flags to help debug
     console.log(
         `Render Flags: isLoading=${showLoading}, ` +
         `showInitialPlaceholder=${showInitialPlaceholder}, ` +
         `showEmptyThreadPlaceholder=${showEmptyThreadPlaceholder}, ` +
         `showMessages=${showMessages}, ` +
         `showAnyError=${showAnyError}, ` +
         `messages.length=${messages.length}, ` +
         `placeholderType=${placeholderType}, ` +
         `createThreadError=${!!createThreadError}, ` +
         `apiError=${!!apiError}`
     );


    // Show a simple loading screen initially if user context is still resolving
    if (userLoading) {
        console.log("Rendering: User Loading...");
        return (
            <div className="flex flex-col items-center justify-center h-screen text-secondary bg-background">
                 <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                 <p className="text-lg font-medium">Loading user session...</p>
            </div>
        );
    }

    // If userLoading is false but there's no session, redirect handled by useEffect


    // Main Layout Render
    console.log("Rendering: Chat Page Layout");
    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">

             {/* --- Mobile Overlay --- */}
             <AnimatePresence>
                 {isMobile && isMobileSidebarOpen && (
                     <motion.div
                         initial={{ opacity: 0 }}
                         animate={{ opacity: 1 }}
                         exit={{ opacity: 0 }}
                         transition={{ duration: 0.2 }}
                         className="fixed inset-0 bg-black/30 z-30 md:hidden"
                         onClick={closeMobileSidebar}
                         aria-hidden="true"
                     />
                 )}
             </AnimatePresence>

             {/* --- Sidebar --- */}
             {/* The sidebar itself remains mounted but its content is conditional based on open/expanded state */}
             <motion.div
                 ref={sidebarRef} // Attach ref for outside click
                 className={clsx(
                     "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80",
                     "transition-transform duration-300 ease-in-out",
                     isMobile ? SIDEBAR_WIDTH_MOBILE_OPEN : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP),
                     isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full invisible') // Hide off-screen on mobile when closed and make invisible
                  )}
                  // For mobile when closed, explicitly set width and visibility
                  style={isMobile && !isMobileSidebarOpen ? { width: '0', transform: 'translateX(-100%)', visibility: 'hidden' } : undefined}
             >
                  {/* Render Sidebar content only if supposed to be open/expanded */}
                  {((isMobile && isMobileSidebarOpen) || (!isMobile && isDesktopSidebarExpanded)) && (
                       <Sidebar
                           isExpanded={!isMobile && isDesktopSidebarExpanded}
                           isMobileOpen={isMobile && isMobileSidebarOpen}
                           activePanel={activePanel}
                           onPanelChange={handlePanelChange}
                           openSharePopup={openSharePopup}
                           onCloseMobileSidebar={closeMobileSidebar}
                           onSelectThread={handleSelectThread}
                           onNewThread={handleCreateNewThread} // Pass the new thread creator
                           currentThreadId={currentThreadId}
                       />
                  )}
                  {/* Render only the icon column when collapsed on desktop */}
                  {(!isMobile && !isDesktopSidebarExpanded && activePanel !== null) && (
                       <div className={clsx("h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 bg-gray-50/30", SIDEBAR_ICON_WIDTH_DESKTOP)}>
                           {/* Placeholder space */}
                           <div className="h-[52px] mb-0 md:mb-1"></div>
                           {/* Render icons when collapsed */}
                           {['discover', 'threads', 'profile'].map((panelName: ActivePanelType) => {
                                const Icon = panelName === 'discover' ? Sparkles : panelName === 'threads' ? MessageSquare : User; // Use appropriate icons
                                const label = panelName === 'discover' ? 'Discover' : panelName === 'threads' ? 'Threads' : 'Profile';
                                const isSelected = activePanel === panelName; // Highlight based on selected panel
                                return (
                                    <button
                                       key={panelName}
                                       onClick={() => handlePanelChange(panelName)}
                                       className={clsx(
                                           "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                                           isSelected ? 'bg-white shadow-sm' : 'hover:bg-gray-100'
                                       )}
                                       title={label}
                                   >
                                       <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} className={clsx(isSelected ? 'text-primary' : 'text-gray-600')} />
                                       <span className={clsx("text-[10px] md:text-[11px] font-medium mt-1", isSelected ? 'text-primary' : 'text-gray-700')}> {label} </span>
                                   </button>
                                );
                           })}
                       </div>
                  )}
             </motion.div>


            {/* --- Main Chat Content Area --- */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && (
                     <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14 bg-background z-10">
                         {/* Toggle button */}
                        <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 rounded-full text-gray-600 hover:bg-gray-100" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}>
                           {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />}
                         </button>
                         {/* Title - Display Thread Title if available, else App Name */}
                        <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">
                            {/* You might need to fetch the thread title here or pass it from the thread list */}
                            {/* For now, display App name, or currentThreadId if available */}
                            {currentThreadId ? `Chat (${currentThreadId.substring(0, 4)})` : 'Parthavi'} {/* Simplified for now */}
                        </h1>
                         {/* Placeholder for balance */}
                         <div className="w-8 h-8"></div>
                     </div>
                )}

                 {/* Chat Messages/Placeholder Area */}
                 <div
                     ref={chatContainerRef}
                     className={clsx(
                         'flex-1 overflow-y-auto scroll-smooth min-h-0 w-full',
                         'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4',
                         // Center content only when showing placeholder/error, not messages
                         (showInitialPlaceholder || showEmptyThreadPlaceholder || showAnyError || showLoading) ? 'flex flex-col items-center justify-center' : ''
                     )}
                 >
                    <div className={clsx(
                        "max-w-4xl mx-auto w-full flex flex-col",
                        // Ensure min-h-full for centering placeholders and loading state
                        (showInitialPlaceholder || showEmptyThreadPlaceholder || showAnyError || showLoading) ? 'min-h-full justify-center items-center' : ''
                    )} >
                        {/* Conditional Rendering based on flags */}
                        {showLoading && (
                            <div className="flex justify-center items-center p-10 text-gray-500 flex-1">
                                <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading chat...
                            </div>
                        )}
                        {showAnyError && (
                             <div className='flex flex-col items-center text-center text-red-500 p-6 bg-red-50 rounded-lg max-w-md mx-auto border border-red-200 shadow-sm'>
                                 <AlertCircle className="w-8 h-8 mb-3 text-red-400" />
                                 <p className="font-medium mb-2 text-lg">Oops!</p>
                                 <p className="text-sm leading-relaxed">{createThreadError || apiError}</p> {/* Display the specific error */}
                                 {/* Offer to start fresh if it was a create/load error */}
                                 {(!!createThreadError) && !chatLoading && ( // Show button only if not loading and error is from thread creation/load
                                     <button onClick={() => handleCreateNewThread()} className="mt-4 text-primary hover:underline text-sm font-medium" disabled={chatLoading}>Try a new chat</button>
                                 )}
                             </div>
                        )}
                        {showInitialPlaceholder && (
                             <div className="flex-1 flex items-center justify-center w-full">
                                 <InitialPlaceholder onPromptClick={handlePromptClick} />
                             </div>
                         )}
                        {showEmptyThreadPlaceholder && (
                             <div className="flex-1 flex items-center justify-center w-full">
                                 <EmptyThreadPlaceholderComponent onPromptClick={handlePromptClick} />
                             </div>
                         )}
                        {showMessages && (
                            // Messages List - Only render if showMessages is true
                            <div className="w-full space-y-4 md:space-y-5 pt-4"> {/* Added pt-4 for spacing above first message */}
                                {messages.map((m) => (
                                    <ChatMessage
                                        // Use a stable key. For temporary messages, combine temp ID with timestamp/content part.
                                        key={m.id || `temp-${m.created_at}-${m.role}-${m.content?.substring(0, 20)}`}
                                        message={m.content}
                                        isUser={m.isUser}
                                        senderName={m.isUser ? (userName || 'You') : 'Parthavi'}
                                    />
                                ))}
                                 {isResponding && ( // Add a typing indicator when AI is responding
                                    // Provide a stable key for the typing indicator as well
                                    <ChatMessage key="ai-typing-indicator" message="" isUser={false} senderName="Parthavi" />
                                 )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        {/* Disable input if loading, responding, or in an error state, or no thread is active */}
                         <ChatInput
                             value={inputMessage}
                             onChange={handleInputChange}
                             onSendMessage={handleSendMessage}
                             isResponding={isResponding || chatLoading || showAnyError || (!genAI) || !currentThreadId} // Disable if no thread active
                         />
                         {!genAI && (
                             <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p>
                         )}
                         {!currentThreadId && !showLoading && !showInitialPlaceholder && !showEmptyThreadPlaceholder && !showAnyError && (
                             <p className="text-xs text-gray-500 mt-2 text-center px-4"> Select a thread or start a new conversation to chat. </p>
                         )}
                    </div>
                </div>
            </main>
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
