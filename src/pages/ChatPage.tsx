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
import InitialPlaceholder from '../components/chat/InitialPlaceholder';
// Import the *correct* NewThreadPlaceholder
import NewThreadPlaceholderComponent from '../components/chat/InitialPlaceholder'; // Assuming this is the one you want for empty threads
// Rename it to avoid conflict if needed, e.g., EmptyThreadPlaceholder
const EmptyThreadPlaceholder = NewThreadPlaceholderComponent;


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
// (Keep System Instruction Text as is)
const SYSTEM_INSTRUCTION_TEXT = `
**Persona & Role:**
You are Parthavi, an advanced AI career advisor chatbot. Your core mission is to empower Indian women by providing exceptional, personalized, and culturally sensitive guidance for their professional journeys. You act as a knowledgeable, supportive, and encouraging mentor figure.

// ... (rest of system instruction) ...
`;

const systemInstructionObject: SystemInstruction = { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] };

const saveMessageToDb = async (messageData: MessagePayload) => {
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role, 'to thread:', messageData.thread_id); // Added thread_id log
    try {
        // Add updated_at to the insert payload to ensure threads are sorted correctly
        const payloadWithTimestamp = {
            ...messageData,
            updated_at: new Date().toISOString()
        };
        const { data, error } = await supabase.from('messages').insert(payloadWithTimestamp).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);

        // --- Additionally, update the thread's updated_at timestamp ---
         try {
            const { error: threadUpdateError } = await supabase
               .from('threads')
               .update({ updated_at: new Date().toISOString() })
               .eq('id', messageData.thread_id)
               .select(); // Or .single() if expecting one row back

            if (threadUpdateError) {
                 console.error("Error updating thread timestamp after message save:", threadUpdateError);
                 // Decide if you want to fail the message save if timestamp update fails
                 // For now, log error but don't re-throw, as message is saved.
            } else {
                console.log(`Successfully updated thread ${messageData.thread_id} timestamp.`);
            }
         } catch (updateErr) {
             console.error("Exception during thread timestamp update:", updateErr);
         }
        // --- End thread timestamp update ---


        return data?.id;
    } catch (error) {
        console.error(`Background save FAILED for ${messageData.role}:`, error);
        // Add more details from the error object if available
        if (error && typeof error === 'object' && 'message' in error) {
            console.error("Supabase Error Details:", error.message);
        }
        return null;
    }
};

let genAI: GoogleGenAI | null = null;
if (API_KEY) {
    try { genAI = new GoogleGenAI({ apiKey: API_KEY }); console.log("Gemini Initialized."); }
    catch (e) { console.error("Gemini Init Failed:", e); genAI = null; }
} else { console.warn("VITE_GEMINI_API_KEY not set."); }

const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    return messages.map((msg): Content => ({
        role: msg.isUser ? 'user' : 'model', // Use isUser to determine role for Gemini
        parts: [{ text: msg.content }],
    })).filter(content => content.parts[0].text?.trim()); // Filter out messages with empty content
};


const ChatPage = () => {
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    // Initialize currentThreadId from state on mount
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true); // Keep initial loading true
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    // Ref to track if this is the *very* first render after load/sign-in
    const isInitialRenderAfterLoad = useRef(true);


    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // Use requestAnimationFrame to wait for DOM updates
         requestAnimationFrame(() => {
             if (chatContainerRef.current) {
                 chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
             }
         });
    }, []);


    // --- Handle Create New Thread ---
    // Made this more robust and ensures placeholder/loading state is set
    const handleCreateNewThread = useCallback(async (): Promise<string | null> => {
        if (!session?.user) {
             console.warn("handleCreateNewThread: No user session.");
             setCreateThreadError("User session not found. Please sign in.");
             return null;
         }
        console.log("Attempting to create new thread...");

        // Set loading and clear relevant states immediately
        setChatLoading(true);
        setMessages([]);
        setCurrentThreadId(null); // Clear current thread ID
        setPlaceholderType(null); // Clear placeholder
        setCreateThreadError(null);
        setApiError(null);


        try {
            const newTitle = generateRandomTitle();
            // Ensure updated_at is included in the initial thread creation
            const { data: newThread, error } = await supabase.from('threads').insert({
                user_id: session.user.id,
                title: newTitle,
                updated_at: new Date().toISOString() // Set initial updated_at
            }).select('id').single();

            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");

            console.log("New thread created successfully:", newThread.id);

            // Update state reflecting the new empty thread
            setCurrentThreadId(newThread.id);
            setPlaceholderType('new_thread'); // Show the empty thread placeholder
            setMessages([]); // Ensure messages are empty for a new thread


            // Update URL state without causing a full re-render loop triggered by location state
            // We only need to do this if we are *not* already at this thread ID
             if (location.state?.threadId !== newThread.id) {
                 console.log("Updating URL state with new thread ID:", newThread.id);
                  // Use replace to avoid accumulating history entries for new threads
                 navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });
             }


            setChatLoading(false); // Stop loading once thread is created
            return newThread.id; // Return the new thread ID

        } catch (error: any) {
            console.error("Error creating new thread:", error);
            const errorMessage = error.message || "Failed to create new chat.";
            setCreateThreadError(errorMessage); // Set specific create error
            setChatLoading(false); // Stop loading on error
            setCurrentThreadId(null); // Ensure thread ID is null on error
            setPlaceholderType(null); // Ensure no placeholder is shown on error
            return null; // Return null on failure
        }
    }, [session, navigate, location.pathname, location.state]); // Added location dependencies


    // --- Handle Send Message ---
    const handleSendMessage = useCallback(async (text: string) => {
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) {
             console.warn("handleSendMessage called when chat is not ready.", { currentThread, isResponding, user: session?.user });
             if (!session?.user) setCreateThreadError("User not signed in."); // Use createThreadError for user issues? Or add a new userError state?
             return;
        }
        const trimmedText = text.trim(); if (!trimmedText) return;

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
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: "", created_at: new Date().toISOString() };

        // 2. Optimistic AI Placeholder Message (empty initially)
        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString() };


        // Prepare history for API *including* the new user message
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);

        // Update messages state with both optimistic messages
        setMessages(prev => [...prev, optimisticUserMsg, optimisticAiMsg]);
        scrollToBottom('smooth'); // Scroll after adding messages


        // 3. Save User Message to DB (async, fire-and-forget for UI)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
         // We don't await this save, but log potential errors
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message to DB:", err));


        // 4. Call Gemini API
        try {
             if (!genAI) throw new Error("Gemini AI Client not initialized.");

            const requestPayload = {
                model: MODEL_NAME,
                contents: historyForApi, // Send the whole history
                generationConfig: { // Use generationConfig as per Gemini docs
                    responseMimeType: 'text/plain',
                },
                systemInstruction: systemInstructionObject, // Pass system instruction
            };

            const result = await genAI.models.gemini.generateContentStream(requestPayload); // Use gemini.generateContentStream


            let accumulatedResponse = ""; // Accumulate text here
            // Update the optimistic AI message in the state as chunks arrive (optional, but good for streaming UI)
            for await (const chunk of result.stream) {
                 const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                 if (chunkText) {
                    accumulatedResponse += chunkText;
                    // Update the LAST message (which should be the optimistic AI one)
                    setMessages(prev => prev.map(msg =>
                        msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg
                    ));
                    // Scroll frequently during streaming
                    scrollToBottom('auto'); // Use 'auto' for less jumpy streaming scroll
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
    }, [currentThreadId, isResponding, session, messages, scrollToBottom, genAI]); // Added genAI to dependencies


    // --- Main Effect for Loading Threads/Messages ---
    useEffect(() => {
        const currentUserId = session?.user?.id;
        const threadIdFromState = location.state?.threadId;

        console.log("ChatPage Load Effect START: User Loading:", userLoading, "Session:", !!session, "User ID:", currentUserId, "Thread ID from state:", threadIdFromState);

        // If user context is still loading or no user is logged in, wait or redirect
        if (userLoading) {
             console.log("ChatPage Load Effect: User context loading, waiting...");
             setChatLoading(true); // Indicate loading state
             setMessages([]); // Clear messages while loading
             setPlaceholderType(null); // Clear placeholder
             setApiError(null);
             setCreateThreadError(null);
             isInitialRenderAfterLoad.current = true; // Stay in initial render state
            return; // Wait for user context
        }

        if (!currentUserId) {
             console.log("ChatPage Load Effect: No user ID, redirecting to sign-in.");
             navigate('/', { replace: true }); // Redirect if no user
             setChatLoading(false); // Stop loading state as we are redirecting
             isInitialRenderAfterLoad.current = false;
             return; // Exit effect
        }

        // Only proceed with fetching/creating if user is loaded and present
        const initializeChat = async () => {
             console.log("ChatPage initializeChat START: User ID:", currentUserId, "Thread ID from state:", threadIdFromState);

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
                         // You might want to keep this filter even with RLS off as a data integrity check
                         // Although strictly not needed for *permission* with RLS off, it ensures you only load messages relevant to the current user for that thread if there were ever data inconsistencies.
                         .eq('user_id', currentUserId)
                        .order('created_at', { ascending: true });

                    console.log("initializeChat: Supabase messages fetch result:", { data: existingMessages, error: messagesError });


                    if (messagesError) {
                         console.error("initializeChat: Supabase messages fetch ERROR:", messagesError);
                        // If fetch fails, set error state
                        throw messagesError; // Throw to catch block
                    }

                    const formattedMessages = (existingMessages || []).map(msg => ({
                         id: msg.id,
                         content: msg.content ?? '', // Ensure content is string
                         isUser: msg.role === 'user',
                         role: msg.role as 'user' | 'assistant',
                         timestamp: new Date(msg.created_at).toLocaleString(), // Format timestamp if needed for display
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
                     // Set the error state appropriately
                     const errorMessage = error.message || "Failed to load chat history.";
                     setCreateThreadError(`Load Error: ${errorMessage}`); // Use createThreadError for load failures
                     setPlaceholderType(null); // Ensure no placeholder on error state
                     setCurrentThreadId(null); // Clear thread ID if loading failed? Depends on desired behaviour. Let's keep it null for now.
                 } finally {
                     console.log("initializeChat: Fetch/Load process finished.");
                     setChatLoading(false); // Stop loading

                     // Scroll only if we successfully loaded messages or are showing a placeholder
                     requestAnimationFrame(() => {
                         scrollToBottom('auto'); // Use 'auto' for initial load
                          isInitialRenderAfterLoad.current = false; // Mark initial render as complete
                     });
                 }

            } else {
                // No threadId in state, this is likely the first visit or navigating to /chat directly
                console.log("initializeChat: No thread ID in state, assuming new session or navigation. Showing initial placeholder.");
                // Set initial placeholder and loading false immediately.
                // Creating the thread will happen when the user sends their first message or clicks "New Thread".
                 setPlaceholderType('initial'); // Show the initial welcome placeholder
                 setChatLoading(false); // Stop loading state
                 setCurrentThreadId(null); // Ensure no thread is active yet

                 isInitialRenderAfterLoad.current = false; // Mark initial render as complete immediately
            }
        };

        // Run initialization async function
        initializeChat();

        // Cleanup function - primarily for subscriptions if any were added here
        return () => {
           // No direct Supabase subscriptions are managed here currently,
           // they are in the ThreadsPanelSidebar. If you add any here, clean them up.
            console.log("ChatPage Load Effect Cleanup.");
        };

    // Dependencies: Re-run effect when session user changes or the threadId in the URL state changes
    // userLoading is included to ensure the effect runs *after* user context is resolved
    }, [session?.user?.id, userLoading, location.state?.threadId, navigate, location.pathname, handleCreateNewThread, scrollToBottom]); // Added necessary dependencies


    // Effect to handle initial prompts from location state (e.g., from CareerTopicsPage)
    useEffect(() => {
        const initialPrompt = location.state?.initialPrompt;
        console.log("Initial Prompt Effect: initialPrompt:", initialPrompt, "currentThreadId:", currentThreadId, "chatLoading:", chatLoading, "isResponding:", isResponding);

        // Only process initial prompt if:
        // 1. There is a prompt in state
        // 2. A thread ID has been established (either loaded or newly created)
        // 3. The chat is not currently loading messages for an existing thread
        // 4. The AI is not already responding
        // 5. There are no messages in the current state yet (prevents sending prompt multiple times)
        // 6. It's not the very first render after load where the main effect is still setting up
        // Use a ref to ensure prompt is sent only ONCE per thread lifecycle
        const promptSentRef = useRef(false);

        if (initialPrompt && currentThreadId && !chatLoading && !isResponding && messages.length === 0 && !isInitialRenderAfterLoad.current && !promptSentRef.current) {
             console.log("Initial Prompt Effect: Sending initial prompt:", initialPrompt);
             promptSentRef.current = true; // Mark prompt as sent
             handleSendMessage(initialPrompt);

             // IMPORTANT: Clear the initialPrompt from state after sending
             // This prevents the prompt from being re-sent if the component re-renders
              navigate(location.pathname, { replace: true, state: { ...location.state, initialPrompt: undefined } }); // Clear the prompt
        } else if (initialPrompt && currentThreadId && !chatLoading && !isResponding && !isInitialRenderAfterLoad.current && promptSentRef.current) {
             // Case where prompt was sent, and we navigated away and back, but prompt is still in state
             // Clear it here to avoid confusion, don't send again.
              console.log("Initial Prompt Effect: Prompt already sent or shouldn't be sent again. Clearing state.");
               navigate(location.pathname, { replace: true, state: { ...location.state, initialPrompt: undefined } }); // Clear the prompt
        }


    }, [location.state?.initialPrompt, currentThreadId, chatLoading, isResponding, messages.length, navigate, location.pathname, handleSendMessage]); // Added dependencies



     // Other useCallback functions (closeMobileSidebar, etc.) remain the same...
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
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

    const handleClickOutside = useCallback((event: MouseEvent) => {
        // If sidebar is mobile open and click is outside the sidebar ref, close it
        if (isMobile && isMobileSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
             console.log("Click outside mobile sidebar, closing...");
            closeMobileSidebar();
        }
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);

     const handleSelectThread = useCallback((threadId: string) => {
        console.log("handleSelectThread:", threadId, "Current Thread:", currentThreadId);
        if (threadId !== currentThreadId) {
            // Navigate to the same page but update the state with the new threadId
            // This will trigger the useEffect to load messages for the new thread
            console.log(`Selecting new thread ${threadId}, navigating.`);
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
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);

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
                    console.error("Failed to create new thread, cannot send prompt.");
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


    // Effect for scroll to bottom whenever messages change, but NOT on initial render
     useEffect(() => {
         // Only scroll after the very first load render is complete AND messages change
        if (!isInitialRenderAfterLoad.current && messages.length > 0) {
             console.log("Messages updated, scrolling to bottom.");
             scrollToBottom('smooth');
         } else if (!isInitialRenderAfterLoad.current && messages.length === 0) {
              // If messages become 0 after initial load, might need to scroll up or do nothing, depending on state
              // For now, just don't auto-scroll down if the list empties unexpectedly
              console.log("Messages updated, now empty. Not scrolling.");
         }
     }, [messages, scrollToBottom]);


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
    const showMessages = !showLoading && messages.length > 0 && !createThreadError && !apiError;
    const showAnyError = !showLoading && (!!createThreadError || !!apiError);

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
        return (
            <div className="flex flex-col items-center justify-center h-screen text-secondary bg-background">
                 <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary" />
                 <p className="text-lg font-medium">Loading user session...</p>
            </div>
        );
    }

    // If userLoading is false but there's no session, redirect handled by useEffect


    // Main Layout Render
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
             <motion.div
                 ref={sidebarRef} // Attach ref for outside click
                 className={clsx(
                     "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80",
                     "transition-transform duration-300 ease-in-out",
                     isMobile
                         ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-0 translate-x-full') // Hide off-screen on mobile when closed
                         : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP),
                     isMobile && !isMobileSidebarOpen && 'invisible md:visible' // Hide completely on mobile when closed
                  )}
                 // Remove mobile translation class here, handled by width and potentially display: none if needed
                  style={isMobile && !isMobileSidebarOpen ? { width: 0, transform: 'translateX(-100%)' } : undefined} // Explicitly hide on mobile when closed
             >
                  {/* Render Sidebar content only if supposed to be open/expanded */}
                  {(isMobile && isMobileSidebarOpen) || (!isMobile && (isDesktopSidebarExpanded || activePanel !== null)) ? (
                       <Sidebar
                           isExpanded={!isMobile && isDesktopSidebarExpanded}
                           isMobileOpen={isMobile && isMobileSidebarOpen}
                           activePanel={activePanel}
                           onPanelChange={handlePanelChange}
                           openSharePopup={openSharePopup}
                           onCloseMobileSidebar={closeMobileSidebar}
                           onSelectThread={handleSelectThread}
                           onNewThread={handleCreateNewThread}
                           currentThreadId={currentThreadId}
                       />
                  ) : (
                      // Render only the icon column when collapsed on desktop or closed on mobile (but mobile is hidden)
                       (!isMobile || (isMobile && !isMobileSidebarOpen)) && (
                            <div className={clsx("h-full flex flex-col items-center py-4 space-y-1 flex-shrink-0 border-r border-gray-200/80 bg-gray-50/30", isMobile ? 'w-16' : SIDEBAR_ICON_WIDTH_DESKTOP)}>
                                {isMobile && ( // Mobile close button when collapsed - wait, this button should be outside the hidden part
                                     // Let's rethink mobile sidebar close button - it should be in the main content header
                                    null // This button shouldn't be here
                                )}
                                {/* Placeholder space */}
                                {(!isMobile || !isMobileSidebarOpen) && <div className="h-[52px] mb-0 md:mb-1"></div>}
                                {/* Render icons when collapsed/closed */}
                                {['discover', 'threads', 'profile'].map((panelName: ActivePanelType) => {
                                     const Icon = panelName === 'discover' ? MessageSquare : panelName === 'threads' ? MessageSquare : User; // Use appropriate icons
                                     const label = panelName === 'discover' ? 'Discover' : panelName === 'threads' ? 'Threads' : 'Profile';
                                     const isSelected = activePanel === panelName; // Highlight based on selected panel
                                     return (
                                         <button
                                            key={panelName}
                                            onClick={() => handlePanelChange(panelName)}
                                            className={clsx(
                                                "flex flex-col items-center justify-center py-2 rounded-lg text-secondary transition-colors w-14 md:w-[76px] h-auto min-h-[56px] md:min-h-[60px]",
                                                isSelected ? 'bg-white shadow-sm' : 'hover:bg-gray-100' // Only hover on non-selected collapsed
                                            )}
                                            title={label}
                                        >
                                            <Icon size={20} strokeWidth={isSelected ? 2.5 : 2} className={clsx(isSelected ? 'text-primary' : 'text-gray-600')} />
                                            <span className={clsx("text-[10px] md:text-[11px] font-medium mt-1", isSelected ? 'text-primary' : 'text-gray-700')}> {label} </span>
                                        </button>
                                     );
                                })}
                            </div>
                       )
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
                         {/* Title */}
                        <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">Parthavi</h1>
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
                         (showInitialPlaceholder || showEmptyThreadPlaceholder || showAnyError) ? 'flex flex-col items-center justify-center' : ''
                     )}
                 >
                    <div className={clsx(
                        "max-w-4xl mx-auto w-full flex flex-col",
                        // Ensure min-h-full for centering placeholders
                        (showInitialPlaceholder || showEmptyThreadPlaceholder || showAnyError) ? 'min-h-full justify-center items-center' : ''
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
                                 <p className="text-sm leading-relaxed">{errorText}</p>
                                 {/* Add a button to try again or go home? */}
                                 {createThreadError && ( // If it's a create/load error, offer to start fresh
                                     <button onClick={() => handleCreateNewThread()} className="mt-4 text-primary hover:underline text-sm font-medium">Try a new chat</button>
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
                                 <EmptyThreadPlaceholder onPromptClick={handlePromptClick} />
                             </div>
                         )}
                        {showMessages && (
                            // Messages List
                            <div className="w-full space-y-4 md:space-y-5 pt-4"> {/* Added pt-4 for spacing above first message */}
                                {messages.map((m) => (
                                    <ChatMessage
                                        key={m.id || `temp-${m.created_at}-${m.role}-${m.content?.substring(0, 10)}`} // Use unique key, fallback for temp messages
                                        message={m.content}
                                        isUser={m.isUser}
                                        senderName={m.isUser ? (userName || 'You') : 'Parthavi'}
                                    />
                                ))}
                                 {isResponding && ( // Add a typing indicator when AI is responding
                                    <ChatMessage message="" isUser={false} senderName="Parthavi" />
                                 )}
                            </div>
                        )}
                    </div>
                </div>

                {/* Chat Input Area */}
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        {/* Disable input if loading, responding, or in an error state */}
                         <ChatInput
                             value={inputMessage}
                             onChange={handleInputChange}
                             onSendMessage={handleSendMessage}
                             isResponding={isResponding || chatLoading || showAnyError || (!genAI && !!API_KEY === false)} // Disable if API key is missing
                         />
                         {!genAI && !!API_KEY === false && (
                             <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p>
                         )}
                    </div>
                </div>
            </main>
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
