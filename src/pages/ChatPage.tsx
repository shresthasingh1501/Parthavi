// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle, Sparkles, User } from 'lucide-react'; // Added icons needed for collapsed sidebar
import { useMediaQuery } from 'react-responsive';
import { GoogleGenerativeAI } from "@google/generative-ai";
// Import types needed for the original generateContentStream response structure
import { GenerateContentResponse, Content, Part } from "@google/generative-ai"; // Import types

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
const EmptyThreadPlaceholderComponent = InitialPlaceholder;


// Type definitions
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
// Use a union type for role to match DB and frontend display
type MessageRole = 'user' | 'assistant'; // Assuming only these two roles from DB/API
type DisplayMessage = Omit<DbMessage, 'user_id' | 'updated_at' | 'thread_id'> & { isUser: boolean; role: MessageRole }; // Keep user_id, updated_at, thread_id out of display type
type MessagePayload = Omit<DbMessage, 'id' | 'created_at'>; // Payload for DB insert
type PlaceholderType = 'initial' | 'new_thread' | null;

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
// Note: If you are using an older library, "gemini-1.5-flash-latest" might not exist.
// You might need to revert to "gemini-pro" or similar, check your library version documentation.
// For now, keeping the name as it was in the previous version, but be aware.
const MODEL_NAME = "gemini-1.5-flash-latest";


// --- System Instruction ---
// Reverted to the plain string as in your original code's payload structure
const SYSTEM_INSTRUCTION_TEXT = `
**Persona & Role:**
You are Parthavi, an advanced AI career advisor chatbot. Your core mission is to empower Indian women by providing exceptional, personalized, and culturally sensitive guidance for their professional journeys. You act as a knowledgeable, supportive, and encouraging mentor figure.

// ... (rest of system instruction) ...
`;

// For the older generateContentStream pattern, the system instruction is often just the string itself
// placed inside the 'config' object.
const systemInstructionConfig = SYSTEM_INSTRUCTION_TEXT;


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
               .select(); // Or .single() if expecting one row back

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
// This function prepares the *full history* for the generateContentStream call in the old pattern
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
     return messages
        .filter(msg => msg.role === 'user' || msg.role === 'assistant') // Only include user/assistant roles
        .map((msg): Content => ({
            role: msg.isUser ? 'user' : 'model', // Map isUser back to Gemini roles
            parts: [{ text: msg.content || '' }], // Ensure content is not null/undefined
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
    const sidebarRef = useRef<HTMLDivElement>(null); // Corrected ref type


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


    // --- Handle Send Message - Reverted to original AI call logic ---
    const handleSendMessage = useCallback(async (text: string) => {
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) {
             console.warn("handleSendMessage called when chat is not ready.", { currentThread, isResponding, user: session?.user });
             if (!session?.user) setCreateThreadError("User not signed in.");
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
             role: 'user',
             timestamp: new Date().toLocaleString(),
             created_at: new Date().toISOString()
        };

        // 2. Optimistic AI Placeholder Message (empty initially)
        const tempAiMsgId = `temp-ai-${Date.now() + 1}`; // Ensure ID is different
        const optimisticAiMsg: DisplayMessage = {
             id: tempAiMsgId,
             content: '',
             isUser: false,
             role: 'assistant',
             timestamp: new Date().toLocaleString(),
             created_at: new Date().toISOString()
        };


        // Prepare history for API *including* the new user message
        // The formatChatHistoryForGemini now produces the full history including the latest user message
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);
         console.log("History sent to Gemini API:", historyForApi);

        // Update messages state with both optimistic messages
        setMessages(prev => [...prev, optimisticUserMsg, optimisticAiMsg]);

        // Scroll after adding optimistic messages
        scrollToBottom('smooth');


        // 3. Save User Message to DB (async, fire-and-forget for UI)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message to DB:", err));


        // 4. Call Gemini API (Reverted to original pattern)
        try {
             // Check if the necessary API parts exist
             if (!genAI || !genAI.models || typeof genAI.models.generateContentStream !== 'function') {
                  console.error("Gemini Client or generateContentStream method is missing or not a function.");
                  // Provide a more informative error if API key is present but the method isn't found
                  const errorDetail = API_KEY ? "Check @google/generative-ai library version compatibility." : "Missing API Key.";
                  setApiError(`AI Client Error: ${errorDetail}`);
                  throw new Error(`AI Client setup failed: ${errorDetail}`);
             }

             // Prepare the payload matching the original structure provided by user
            const requestPayload = {
                model: MODEL_NAME,
                contents: historyForApi, // Send full history as per the original code snippet
                 config: { // Using 'config' as per your original code snippet
                     responseMimeType: 'text/plain',
                     systemInstruction: systemInstructionConfig, // Use the plain string here
                 },
            };

            console.log("Sending request payload to Gemini API:", requestPayload);

            // Call generateContentStream directly on genAI.models
            const result = await genAI.models.generateContentStream(requestPayload);

            let accumulatedResponse = ""; // Accumulate text here
            let streamSource: AsyncIterable<GenerateContentResponse> | null = null;

             // Check for both result and result.stream for compatibility with potentially older library versions
             if (result && typeof result[Symbol.asyncIterator] === 'function') {
                 streamSource = result;
                 console.log("Using result as stream source (potential older version).");
             }
             else if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') {
                 streamSource = result.stream;
                 console.log("Using result.stream as stream source (potential newer version).");
             }
             else {
                 console.error("Unexpected API response structure:", result);
                 throw new Error(`Unexpected API response structure from generateContentStream: ${JSON.stringify(result).substring(0,100)}...`);
             }


             if (streamSource) {
                 // Process the stream
                for await (const chunk of streamSource) {
                     // Adapt chunk processing based on potential older structures if needed
                     // Assuming chunk structure is similar enough for parts[0].text
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
             } else {
                 console.error("Stream source is null or undefined after generateContentStream.");
                 throw new Error("Failed to get stream source from AI response.");
             }


            // 5. Save AI Message to DB (after receiving full response)
            if (accumulatedResponse.trim()) {
                console.log("Full AI response received, saving to DB.");
                const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedResponse, role: 'assistant', user_id: userId };
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
        }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom, genAI, systemInstructionConfig]); // Dependency on systemInstructionConfig string


    // --- Sidebar and Overlay Callbacks ---
    // Define these before the effects that use them
    const closeMobileSidebar = useCallback(() => {
         console.log("Closing mobile sidebar.");
         setIsMobileSidebarOpen(false);
    }, []);

    const openMobileSidebar = useCallback(() => {
        console.log("Opening mobile sidebar.");
        // If no active panel is set, default to 'discover' when opening
        if (activePanel === null) {
            console.log("No active panel set, defaulting to 'discover'.");
            setActivePanel('discover');
        }
        setIsMobileSidebarOpen(true);
    }, [activePanel]); // Depends on activePanel

    const collapseDesktopSidebar = useCallback(() => {
        console.log("Collapsing desktop sidebar.");
        setIsDesktopSidebarExpanded(false);
        // Do NOT set activePanel to null here, keep track of which panel was open
        // activePanel is used to show the correct icon and handle clicking the icon to expand back
    }, []);

    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => {
        console.log("Expanding desktop sidebar to panel:", panel);
        // Ensure a panel is set if expanding
        setActivePanel(panel || 'discover');
        setIsDesktopSidebarExpanded(true);
    }, []);

    const handlePanelChange = useCallback((panel: ActivePanelType) => {
        console.log("handlePanelChange:", panel);
        if (isMobile) {
            // On mobile, clicking the same panel icon closes it
            if (isMobileSidebarOpen && activePanel === panel) {
                 console.log("Mobile: Clicking same panel, closing sidebar.");
                 closeMobileSidebar();
             } else {
                 console.log("Mobile: Clicking different panel or sidebar closed, opening sidebar to:", panel);
                 setActivePanel(panel);
                 setIsMobileSidebarOpen(true); // Ensure sidebar opens
             }
        } else {
             // On desktop, clicking the same panel icon collapses it
            if (isDesktopSidebarExpanded && activePanel === panel) {
                 console.log("Desktop: Clicking same panel, collapsing sidebar.");
                collapseDesktopSidebar();
            } else {
                 console.log("Desktop: Clicking different panel or sidebar collapsed, expanding sidebar to:", panel);
                expandDesktopSidebar(panel); // Expand sidebar to the new panel
            }
        }
    }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);


    // --- Click Outside Sidebar Callback ---
    // Define this here, before the effect that uses it
    const handleClickOutside = useCallback((event: MouseEvent) => {
        // If sidebar is mobile open and click is outside the sidebar ref, close it
        if (isMobile && isMobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
             console.log("Click outside mobile sidebar, closing...");
            closeMobileSidebar();
        }
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]); // Depends on mobile state, sidebar open state, and close function


     // --- Handle Select Thread ---
     const handleSelectThread = useCallback((threadId: string) => {
        console.log("handleSelectThread:", threadId, "Current Thread:", currentThreadId);
        if (threadId !== currentThreadId) {
            // Navigate to the same page but update the state with the new threadId
            // This will trigger the useEffect to load messages for the new thread
            console.log(`Selecting new thread ${threadId}, navigating.`);
            // Clear messages and set loading immediately for perceived responsiveness
             setMessages([]);
             setChatLoading(true);
             setPlaceholderType(null);
             setApiError(null);
             setCreateThreadError(null);
             initialPromptSent.current = false; // Reset prompt flag for the new thread selection

            navigate(location.pathname, { replace: true, state: { threadId: threadId } });
             // Close sidebar regardless on mobile after selecting a thread
             if (isMobile) {
                 console.log("Mobile: Thread selected, closing sidebar.");
                 closeMobileSidebar();
            }
        } else {
             console.log("Clicked on current thread. No navigation needed.");
             // If it's the current thread, just close the sidebar on mobile
             if (isMobile) {
                 console.log("Mobile: Current thread selected, closing sidebar.");
                 closeMobileSidebar();
            }
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]); // Added location dependencies for navigate


     // This is the function passed to NewThreadPlaceholder/InitialPlaceholder
     const handlePromptClick = useCallback((prompt: string) => {
        console.log("Prompt Clicked:", prompt, "Current Thread:", currentThreadId);
        if (!currentThreadId) {
            // If no thread is active, create one first, then send the message
            console.log("No active thread, creating one before sending prompt.");
            handleCreateNewThread().then((newId) => {
                if (newId) {
                    // Wait slightly before sending message to ensure state updates
                    setTimeout(() => {
                         console.log("New thread created, sending prompt after delay.");
                        handleSendMessage(prompt);
                    }, 50); // Small delay might help state stabilize
                } else {
                    console.error("Failed to create new thread from prompt click.");
                    // Error state should already be set by handleCreateNewThread
                }
            });
        } else {
            // If a thread is active, just send the message
            console.log("Active thread found, sending prompt directly.");
            handleSendMessage(prompt);
        }
         // Ensure sidebar closes on mobile after selecting a prompt/starting chat
         if (isMobile && isMobileSidebarOpen) {
             console.log("Mobile: Prompt clicked, closing sidebar.");
             closeMobileSidebar();
         }
    }, [currentThreadId, handleCreateNewThread, handleSendMessage, isMobile, isMobileSidebarOpen, closeMobileSidebar]);


    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);


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
        const initializeChat = async (userId: string, initialThreadIdFromState: string | null) => {
             console.log("initializeChat START: User ID:", userId, "Initial Thread ID from state:", initialThreadIdFromState);

            // Always start by clearing old state and showing loading
            setChatLoading(true);
            setMessages([]);
            setApiError(null);
            setCreateThreadError(null);
            setPlaceholderType(null); // Clear any previous placeholder


            if (initialThreadIdFromState) {
                console.log("initializeChat: Attempting to load messages for existing thread:", initialThreadIdFromState);
                setCurrentThreadId(initialThreadIdFromState); // Set current thread ID immediately

                 try {
                    // Fetch messages for the specific thread ID
                    console.log(`Fetching messages for thread: ${initialThreadIdFromState}`);
                    const { data: existingMessages, error: messagesError } = await supabase
                        .from('messages')
                        .select('*')
                        .eq('thread_id', initialThreadIdFromState)
                         // Filter by user_id even with RLS off for data integrity
                         .eq('user_id', userId)
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
                         // Keep currentThreadId set if the fetch was successful but returned empty
                         setCurrentThreadId(initialThreadIdFromState);
                    } else {
                        console.log("initializeChat: Messages loaded, no placeholder needed.");
                        setPlaceholderType(null); // If messages were loaded
                         setCurrentThreadId(initialThreadIdFromState); // Ensure thread ID is set
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
                     // Also scroll if we are showing a placeholder, to ensure it's in view
                     if (messages.length > 0 || placeholderType !== null) { // Check messages.length > 0 OR placeholderType is not null (from previous state)
                          // Need to re-evaluate scroll trigger here. Maybe scroll after state update effect runs?
                          // Let's remove scroll from here for now and rely on the messages/placeholder state effect.
                          // requestAnimationFrame(() => scrollToBottom('auto')); // Initial scroll
                     }
                     // Ensure initialPromptSent is false when loading is complete, ready for potential prompt
                     initialPromptSent.current = false;
                 }

            } else {
                // No threadId in state on load - this is the initial landing or direct /chat navigation
                console.log("initializeChat: No thread ID in state on initial load, assuming new session or navigation. Showing initial placeholder.");
                // Set initial placeholder and loading false immediately.
                setPlaceholderType('initial'); // Show the initial welcome placeholder
                setChatLoading(false); // Stop loading state
                setCurrentThreadId(null); // Ensure no thread is active yet

                hasInitialized.current = true; // Mark initialization complete
                initialPromptSent.current = false; // Ensure flag is reset
            }
        };

        // Execute initialization when user context is ready AND
        // when the user ID changes OR the threadId in the URL state changes.
        // This prevents unnecessary re-runs.
         const threadIdInState = location.state?.threadId;
         const userIdChanged = currentUserId !== session?.user?.id; // Redundant check as effect dependency covers this? Re-evaluate.
         // Let's simplify: run if user is loaded and it's the first init attempt OR the threadId in state has changed
         // We also need to consider when the user object itself changes (e.g., after profile update)

        // Determine if initialization should run
        const shouldInitialize = !hasInitialized.current || (currentUserId && threadIdInState !== currentThreadId);
        console.log("ChatPage Load Effect Decision:", { shouldInitialize, hasInitialized: hasInitialized.current, currentUserId, threadIdInState, currentThreadId });


         if (shouldInitialize) {
             console.log("Running initializeChat...");
              // Pass the user ID and thread ID from state explicitly
             initializeChat(currentUserId, threadIdInState);
         } else {
             console.log("Skipping initializeChat...");
             // If we are skipping, ensure loading is off IF user is loaded and there's no active error
              if (!userLoading && !apiError && !createThreadError) {
                   setChatLoading(false);
              }
         }


        // Cleanup function - primarily for subscriptions if any were added here
        return () => {
           // No direct Supabase subscriptions are managed here currently,
           // they are in the ThreadsPanelSidebar. If you add any here, clean them up.
            console.log("ChatPage Load Effect Cleanup.");
             // Ensure hasInitialized is reset if the component unmounts or user logs out
             // This is important for proper re-initialization if the user signs back in without a full page reload
             if (!session?.user) { // If the user is signing out or session is ending
                 hasInitialized.current = false;
                 initialPromptSent.current = false;
             }
        };

    // Dependencies: Re-run effect when session user changes or the threadId in the URL state changes, or userLoading finishes
    // This effect manages the *initial* load based on URL/user state.
    }, [session?.user?.id, userLoading, location.state?.threadId, navigate, location.pathname, handleCreateNewThread, scrollToBottom]);


    // Effect to handle initial prompts from location state (e.g., from CareerTopicsPage)
    // This effect runs *after* the main load effect has potentially finished and set hasInitialized.current = true
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
        // 8. There are no active errors
        const userMessagesCount = messages.filter(m => m.isUser).length;


        if (initialPrompt && currentThreadId && !chatLoading && !isResponding && hasInitialized.current && !initialPromptSent.current && userMessagesCount === 0 && !apiError && !createThreadError) {
             console.log("Initial Prompt Effect: Sending initial prompt:", initialPrompt);
             initialPromptSent.current = true; // Mark prompt as sent for this thread lifecycle
             // Add a small delay before sending message to ensure state updates from thread creation are fully processed
             // And to allow UI to render the new empty thread state
             setTimeout(() => {
                 handleSendMessage(initialPrompt);
             }, 150); // Increased delay slightly


             // IMPORTANT: Clear the initialPrompt from state AFTER the message is sent (or slightly after the timeout starts)
             // This prevents the prompt from being re-sent if the component re-renders before the timeout finishes
              console.log("Initial Prompt Effect: Clearing prompt from location state.");
              // Create a new state object without the initialPrompt property
              const newState = { ...location.state };
              delete newState.initialPrompt;
               // Use a timeout for navigation as well to ensure it happens after the message send logic starts
               setTimeout(() => {
                  navigate(location.pathname, { replace: true, state: newState });
               }, 100); // Slightly less delay than send message

        } else if (initialPrompt && hasInitialized.current) {
            // Cases where prompt is present but already sent, or user has typed, or there's an error. Clear state.
             console.log("Initial Prompt Effect: Prompt present but condition not met or already processed. Clearing from location state.");
             const newState = { ...location.state };
             delete newState.initialPrompt;
             navigate(location.pathname, { replace: true, state: newState });
        }
        // No dependency needed for initialPromptSent.current inside this effect's dependency array
        // as we only read its value once at the start of the effect execution.

    }, [location.state?.initialPrompt, currentThreadId, chatLoading, isResponding, messages.length, hasInitialized.current, navigate, location.pathname, handleSendMessage, messages, apiError, createThreadError]); // Added error dependencies

     // Effect for initial scroll on mount (if messages are already there)
     // and subsequent scrolls when messages update after initialization
     useEffect(() => {
         console.log("Scroll Trigger Effect: messages.length:", messages.length, "hasInitialized:", hasInitialized.current, "chatLoading:", chatLoading);
         // Initial scroll right after messages are loaded on mount AND initialization is complete
         // Or scroll when messages are updated *after* initialization is complete
         if (hasInitialized.current && messages.length > 0) {
             console.log("Scroll Trigger Effect: Scrolling to bottom.");
              // Use requestAnimationFrame and maybe a small timeout to ensure DOM is ready
              requestAnimationFrame(() => {
                  setTimeout(() => {
                      scrollToBottom('smooth');
                  }, 50);
              });
         } else if (hasInitialized.current && messages.length === 0 && placeholderType !== null) {
             // If initialization is done and there are no messages but a placeholder IS set,
             // scroll to the placeholder location (usually the middle of the container).
             console.log("Scroll Trigger Effect: No messages, placeholder visible. Scrolling to center (approx).");
              requestAnimationFrame(() => {
                 setTimeout(() => {
                      // This is an approximation, scrolling to center might require more complex logic
                      // For now, just scroll to top or let CSS centering handle it.
                      // Let's just scroll to top in this case.
                     if (chatContainerRef.current) chatContainerRef.current.scrollTo({ top: 0, behavior: 'auto' });
                 }, 50);
              });
         } else {
              console.log("Scroll Trigger Effect: No scroll needed yet or conditions not met.");
         }
     // Depend on messages state, placeholder state, and initialization status
     }, [messages, placeholderType, hasInitialized.current, scrollToBottom]);


    // Effect for click outside sidebar on mobile
    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
             console.log("Added mousedown listener for handleClickOutside.");
        } else {
            document.removeEventListener('mousedown', handleClickOutside);
             console.log("Removed mousedown listener for handleClickOutside.");
        }
        return () => {
             document.removeEventListener('mousedown', handleClickOutside);
             console.log("Cleanup: Removed mousedown listener for handleClickOutside.");
        }
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]); // Depends on mobile state, sidebar state, and the callback itself


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
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopup(false)} /> {/* Fixed typo */}
        </div>
    );
};

export default ChatPage;
