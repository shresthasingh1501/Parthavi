// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle, Search } from 'lucide-react'; // Added Search icon
import { useMediaQuery } from 'react-responsive';
// Import necessary Gemini types
import {
    GoogleGenAI,
    Content,
    Part,
    Role,
    GenerateContentResponse,
    SystemInstruction,
    FunctionCall, // Import FunctionCall
    FunctionResponse, // Import FunctionResponse
    GenerateContentStreamResult, // Import GenerateContentStreamResult
    Tool // Import Tool type
} from "@google/genai";

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

// Type definitions
export type ActivePanelType = 'discover' | 'threads' | 'profile' | null;
type DbMessage = Database['public']['Tables']['messages']['Row'];
// Add optional properties for intermediate states
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & {
    isUser: boolean;
    timestamp: string;
    isPending?: boolean; // For AI messages waiting for response
    isError?: boolean; // Indicate if this message represents an error
    isToolCall?: boolean; // Indicate if this is a tool call message (optional display)
    toolResultContent?: any; // Store tool result (optional display)
};
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'>;
type PlaceholderType = 'initial' | 'new_thread' | null;
// Type for Linkup API Response (adjust based on actual API structure if needed)
type LinkupSearchResult = {
    answer: string;
    sources: Array<{ name: string; url: string; snippet: string }>;
}

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const LINKUP_API_KEY = import.meta.env.VITE_LINKUP_API_KEY; // Get Linkup Key
const MODEL_NAME = "gemini-2.0-flash"; // Ensure this model supports function calling

// --- System Instruction (Updated) ---
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
6.  **Tool Usage (Web Search):** If a user's query requires current information beyond your training data (e.g., recent job market trends, specific company details, current salary benchmarks, links to specific online resources, news about an industry), **use the \`linkup_web_search\` tool**. Formulate a concise and effective search query (`q` parameter) based on the user's request to fetch relevant information from the web. After receiving the search results, synthesize the information and present it clearly to the user, citing the source if appropriate based on the search result content. Do not just dump the raw search results.

**Content Domain & Boundaries (Strict Guardrails):**
1.  **Career Focus ONLY:** Your knowledge and conversation **must remain strictly confined** to career development, job searching, resume/CV building, interview preparation, skill enhancement (professional skills), salary negotiation, workplace challenges (e.g., communication, conflict resolution, bias), networking, mentorship, career changes, entrepreneurship (related to career paths), professional goal setting, and work-life balance strategies *as they pertain to professional life*. This includes using the search tool for these purposes.
2.  **Strict Topic Refusal:** **Politely but firmly decline** any requests or attempts to discuss topics outside this defined career domain. This includes, but is not limited to: personal relationships (romantic, familial, friendships - unless *directly* and significantly impacting a specific workplace dynamic being discussed), health/medical advice (beyond generic stress management tips for work), financial investment advice, politics, religion, entertainment, gossip, illegal activities, or any other non-career-related subject. Use clear refusal phrases like: "My expertise is centered on career guidance, so I can't assist with [unrelated topic]. Can we focus back on your professional goals?" or "That topic falls outside my scope as a career advisor. How can I help with your career journey today?" Do not get drawn into off-topic discussions, even if the user tries to use the search tool for them. Refuse to perform searches for non-career topics.
3.  **Absolute Gender Neutrality & Bias Rejection:** This is paramount. You **must operate with zero gender bias**. Your programming strictly prohibits generating responses that reinforce gender stereotypes or discriminatory views. You **must refuse** to answer questions or engage in discussions premised on gender bias. If a user query contains inherent gender bias or asks for advice based on stereotypes (e.g., "Should women avoid certain fields?"), politely decline the biased premise: "I cannot provide advice based on gender stereotypes. My guidance focuses on individual skills, interests, and objective career factors. How can I help you explore career options based on those?" or "My purpose is to provide fair and unbiased career advice. I cannot address questions rooted in gender bias." Do not engage the bias directly; simply refuse the biased framing and redirect to an objective, skills-based approach if possible within the career domain.

**Overall Goal:** Be the most helpful, reliable, empowering, and *safe* AI career advisor possible for your specific user group, always operating within your defined ethical boundaries and professional scope, utilizing tools effectively when needed.
`;

const systemInstructionObject: SystemInstruction = { parts: [{ text: SYSTEM_INSTRUCTION_TEXT }] };

// --- Function Declaration for Linkup Search ---
const linkupSearchTool: Tool = {
    functionDeclarations: [
        {
            name: "linkup_web_search",
            description: "Performs a web search using the Linkup API to find current information, online resources, job details, or company information relevant to career and professional growth questions. Returns a summarized answer and source URLs.",
            parameters: {
                type: "object",
                properties: {
                    q: {
                        type: "string",
                        description: "The specific career-related question or topic to search the web for.",
                    },
                    // Optional: Add depth or outputType if you plan to use them
                    // depth: { type: "string", description: "Optional. Search depth (e.g., 'deep')." },
                    // outputType: { type: "string", description: "Optional. Desired output format (e.g., 'sourcedAnswer')." }
                },
                required: ["q"],
            },
        },
    ],
};

// Helper function to execute Linkup Search API Call
const callLinkupSearchAPI = async (query: string): Promise<LinkupSearchResult | { error: string }> => {
    if (!LINKUP_API_KEY) {
        console.error("Linkup API Key is missing.");
        return { error: "Search functionality is currently unavailable (missing configuration)." };
    }
    const url = "https://api.linkup.so/v1/search";
    const headers = {
        "Authorization": `Bearer ${LINKUP_API_KEY}`,
    };
    // Construct query parameters
    const params = new URLSearchParams({
        q: query,
        // Add other params like depth or outputType if needed
         outputType: "sourcedAnswer" // Example: Requesting a structured answer
    });

    console.log(`Calling Linkup API: ${url}?${params.toString()}`);

    try {
        const response = await fetch(`${url}?${params.toString()}`, {
            method: 'GET',
            headers: headers,
        });

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`Linkup API Error (${response.status}): ${errorBody}`);
            throw new Error(`Search failed with status ${response.status}.`);
        }

        const data: LinkupSearchResult = await response.json();
        console.log("Linkup API Success:", data);
        // Basic validation - adjust if the API might return empty/null instead of erroring
        if (!data || typeof data.answer !== 'string') {
             console.warn("Linkup API returned unexpected format:", data);
             return { answer: "Received unexpected data from search.", sources: [] }; // Handle gracefully
        }
        return data;
    } catch (error: any) {
        console.error("Error calling Linkup API:", error);
        return { error: error.message || "An error occurred while searching." };
    }
};


// --- Gemini Client Initialization ---
let genAI: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log("Gemini Initialized.");
    } catch (e) {
        console.error("Gemini Init Failed:", e);
        genAI = null;
    }
} else {
    console.warn("VITE_GEMINI_API_KEY not set.");
}

// --- Utility Functions ---
const saveMessageToDb = async (messageData: MessagePayload): Promise<string | null> => {
    // ... (keep existing saveMessageToDb function)
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role);
    try {
        const { data, error } = await supabase.from('messages').insert(messageData).select('id').single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`Background save FAILED for ${messageData.role}:`, error); return null; }
};

// Format history, including potential function calls/responses
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    const history: Content[] = [];
    messages.forEach(msg => {
        // Simple text message (user or previous model response)
        if (!msg.isToolCall && !msg.toolResultContent && msg.content) {
            history.push({
                role: msg.role as Role, // 'user' or 'model'
                parts: [{ text: msg.content }],
            });
        }
        // Model's request to call a function
        else if (msg.isToolCall && msg.content) { // Assuming content holds the FunctionCall object temporarily
             try {
                const funcCall: FunctionCall = JSON.parse(msg.content); // Deserialize
                history.push({
                    role: 'model', // Model requested this
                    parts: [{ functionCall: funcCall }]
                });
             } catch (e) { console.error("Failed to parse stored FunctionCall:", msg.content, e); }
        }
        // The result of the function call provided back to the model
        else if (msg.toolResultContent) {
             try {
                const funcResponse: FunctionResponse = JSON.parse(msg.toolResultContent); // Deserialize
                history.push({
                    role: 'user', // Role is 'user' (or 'function') when providing function result
                    parts: [{ functionResponse: funcResponse }]
                });
             } catch (e) { console.error("Failed to parse stored FunctionResponse:", msg.toolResultContent, e); }
        }
        // Ignore messages that don't fit (e.g., empty placeholders before streaming)
    });
    return history.filter(content => content.parts && content.parts.length > 0); // Ensure parts exist
};


// --- ChatPage Component ---
const ChatPage = () => {
    const { session, user, userName, loading: userLoading } = useUser();
    const navigate = useNavigate();
    const location = useLocation();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
    const [currentThreadId, setCurrentThreadId] = useState<string | null>(location.state?.threadId || null);
    const [messages, setMessages] = useState<DisplayMessage[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [isResponding, setIsResponding] = useState(false); // General loading state
    const [chatLoading, setChatLoading] = useState(true); // Initial thread load
    const [apiError, setApiError] = useState<string | null>(null);
    const [createThreadError, setCreateThreadError] = useState<string | null>(null);
    const [placeholderType, setPlaceholderType] = useState<PlaceholderType>(null);
    const [isDesktopSidebarExpanded, setIsDesktopSidebarExpanded] = useState(true);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [activePanel, setActivePanel] = useState<ActivePanelType>('discover');
    const [isSharePopupOpen, setIsSharePopupOpen] = useState(false);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const sidebarRef = useRef<HTMLDivElement>(null);
    const isInitialMount = useRef(true);

    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        // ... (keep existing scrollToBottom function)
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
            }
        }, 60);
    }, []);

    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => {
        // ... (keep existing handleCreateNewThread function)
        if (!session?.user) { setCreateThreadError("User session not found."); return null; }
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
    }, [session, navigate, location.pathname]);


    // --- Main Send Message Logic (Refactored for Function Calling) ---
    const handleSendMessage = useCallback(async (text: string) => {
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) return;
        const trimmedText = text.trim(); if (!trimmedText) return;

        setPlaceholderType(null);
        setCreateThreadError(null);
        setApiError(null);
        const userId = session.user.id;
        setIsResponding(true);
        setInputMessage('');

        // 1. Add User Message Optimistically
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = {
            id: tempUserMsgId,
            content: trimmedText,
            isUser: true,
            role: 'user',
            timestamp: "",
            created_at: new Date().toISOString()
        };
        const currentMessages = [...messages, optimisticUserMsg]; // History including the new user msg
        setMessages(currentMessages);
        scrollToBottom('smooth');

        // Save user message to DB (fire and forget)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        // --- Main Interaction Loop ---
        let loopCount = 0; // Safety break
        let currentHistory = formatChatHistoryForGemini(currentMessages); // Start with user message added

        try {
            while (loopCount < 5) { // Max 5 turns (user->model->tool->model->...)
                loopCount++;
                console.log(`Gemini Call #${loopCount} - History Length: ${currentHistory.length}`);

                // 2. Call Gemini API
                const requestPayload = {
                    model: MODEL_NAME,
                    contents: currentHistory,
                    tools: [linkupSearchTool], // Pass the tool definition
                    systemInstruction: systemInstructionObject,
                    config: { responseMimeType: 'text/plain' } // Keep this simple for now
                };

                const result: GenerateContentStreamResult = await genAI.models.generateContentStream(requestPayload);

                // 3. Process the Response (Stream or Function Call)
                let aggregatedResponse: GenerateContentResponse | null = null;
                let accumulatedText = "";
                let detectedFunctionCall: FunctionCall | null = null;

                // Process stream chunks
                for await (const chunk of result.stream) {
                    // Aggregate the full response object for function call checks
                    if (!aggregatedResponse) aggregatedResponse = { ...chunk };
                    else { // Naive merge, might need deeper merge for complex scenarios
                        if (chunk.candidates) aggregatedResponse.candidates = chunk.candidates;
                        if (chunk.promptFeedback) aggregatedResponse.promptFeedback = chunk.promptFeedback;
                    }

                    // Check for function call in the candidate (might appear early)
                    const funcCall = chunk?.candidates?.[0]?.content?.parts?.find(part => part.functionCall)?.functionCall;
                    if (funcCall) {
                        detectedFunctionCall = funcCall;
                        console.log("Function Call DETECTED in stream chunk:", detectedFunctionCall);
                        break; // Stop processing stream chunks if a function call is found
                    }

                    // Accumulate text if no function call yet
                    const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                        accumulatedText += chunkText;
                    }
                } // End stream processing

                // --- Decide Action based on Gemini's response ---

                // A. FUNCTION CALL Required
                if (detectedFunctionCall) {
                    console.log("Processing Function Call:", detectedFunctionCall.name);

                    // Add a placeholder message for the function call itself (optional visual)
                    const tempToolCallMsgId = `temp-toolcall-${Date.now()}`;
                     const toolCallMsg: DisplayMessage = {
                        id: tempToolCallMsgId,
                        content: JSON.stringify(detectedFunctionCall), // Store the call object
                        isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                        isToolCall: true, isPending: true // Mark as pending tool call
                    };
                    setMessages(prev => [...prev, toolCallMsg]);
                    scrollToBottom();

                    let toolResult: LinkupSearchResult | { error: string };
                    if (detectedFunctionCall.name === 'linkup_web_search') {
                        // Update placeholder to "Searching..."
                         setMessages(prev => prev.map(m => m.id === tempToolCallMsgId ? { ...m, isPending: true, content: `Searching the web for: "${detectedFunctionCall.args.q}"...` } : m));
                        toolResult = await callLinkupSearchAPI(detectedFunctionCall.args.q as string);
                    } else {
                        console.warn(`Unsupported function call detected: ${detectedFunctionCall.name}`);
                        toolResult = { error: `Function ${detectedFunctionCall.name} is not implemented.` };
                    }

                     // Prepare the function response part for Gemini
                    const functionResponsePart: FunctionResponse = {
                        name: detectedFunctionCall.name,
                        response: toolResult // Send back the success data or error object
                    };

                    // Update the placeholder message with the result (optional visual)
                    setMessages(prev => prev.map(m => m.id === tempToolCallMsgId ? {
                         ...m,
                         isPending: false,
                         content: `Search results received for "${detectedFunctionCall.args.q}".`, // Update text
                         toolResultContent: JSON.stringify(functionResponsePart) // Store the result sent back
                    } : m));
                    scrollToBottom();


                    // Add the function call *request* from the model and the function *response* to history
                    currentHistory.push({ role: 'model', parts: [{ functionCall: detectedFunctionCall }] });
                    currentHistory.push({ role: 'user', parts: [{ functionResponse: functionResponsePart }] }); // Role 'user' tells Gemini "here's the function result"

                    // Continue the loop to send the result back to Gemini
                    continue;
                }

                // B. TEXT Response Received
                else if (accumulatedText) {
                    console.log("Text Response Received.");
                    const tempAiMsgId = `temp-ai-${Date.now()}`;
                    const finalAiMsg: DisplayMessage = {
                        id: tempAiMsgId,
                        content: accumulatedText, // Use the fully accumulated text
                        isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString()
                    };
                    setMessages(prev => [...prev, finalAiMsg]);
                    scrollToBottom();

                    // Save final AI message
                    const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedText, role: 'assistant', user_id: userId };
                    saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving final AI message:", err));

                    // Text response means the loop is done
                    break;
                }

                // C. No Text and No Function Call (Error or Empty Response)
                else {
                    console.warn("Gemini responded with neither text nor function call.");
                     const errMsg = "The AI assistant did not provide a response or tool request.";
                     setApiError(errMsg);
                      const tempErrorMsgId = `temp-error-${Date.now()}`;
                     const errorMsg: DisplayMessage = {
                        id: tempErrorMsgId, content: errMsg,
                        isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                        isError: true
                     };
                    setMessages(prev => [...prev, errorMsg]);
                    scrollToBottom();
                    break; // Exit loop on empty/error response
                }
            } // End while loop

            if (loopCount >= 5) {
                 console.error("Function calling loop reached maximum iterations.");
                 setApiError("The conversation flow became too complex. Please try rephrasing.");
            }

        } catch (aiError: any) {
            console.error("Error during Gemini interaction:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred during the conversation.";
            setApiError(errorMessage);
            const tempErrorMsgId = `temp-error-${Date.now()}`;
            const errorDisplayMsg: DisplayMessage = {
                id: tempErrorMsgId,
                content: `Error: ${errorMessage}`,
                isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                isError: true
            };
            // Add error message to display
            setMessages(prev => [...prev, errorDisplayMsg]);
            scrollToBottom();
        } finally {
            setIsResponding(false); // Stop loading indicator
        }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom, genAI]); // Dependencies


    // Other callbacks (closeMobileSidebar, etc.) - Keep existing ones
    const closeMobileSidebar = useCallback(() => setIsMobileSidebarOpen(false), []);
    const openMobileSidebar = useCallback(() => { if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => setIsDesktopSidebarExpanded(false), []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => {
        if (isMobile) {
            if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar();
            else { setActivePanel(panel); setIsMobileSidebarOpen(true); }
        } else {
            if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar();
            else expandDesktopSidebar(panel);
        }
    }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => {
        if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
            if (isMobile && isMobileSidebarOpen) closeMobileSidebar();
        }
    }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);
    const handleSelectThread = useCallback((threadId: string) => {
        if (threadId !== currentThreadId) {
            console.log("Selecting thread:", threadId);
            navigate(location.pathname, { replace: true, state: { threadId: threadId } });
            if (isMobile) closeMobileSidebar();
        } else {
            if (isMobile) closeMobileSidebar();
        }
    }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
    const handlePromptClick = useCallback((prompt: string) => {
        if (!currentThreadId) {
            handleCreateNewThread(false).then((newId) => {
                if (newId) {
                    // Need to ensure threadId is set before sending
                    setTimeout(() => handleSendMessage(prompt), 0);
                }
            });
        } else {
            handleSendMessage(prompt);
        }
    }, [currentThreadId, handleCreateNewThread, handleSendMessage]);
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);


    // --- Effects (Keep existing ones, adjust initial load if needed) ---
    useEffect(() => { if (!userLoading && !session) navigate('/', { replace: true }); }, [session, userLoading, navigate]);

    // Initial Load / Thread Change Effect
     useEffect(() => {
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) { setChatLoading(false); return; }
        const threadIdFromState = location.state?.threadId;
        console.log("Load Effect: User=", currentUserId, "Loading=", userLoading, "State Thread=", threadIdFromState);

        const initializeChat = async () => {
             setChatLoading(true); setMessages([]); setApiError(null);
             setCreateThreadError(null); setPlaceholderType(null);
             isInitialMount.current = true; // Mark as initial load

            if (threadIdFromState && threadIdFromState !== currentThreadId) { // Only reload if ID changed
                 console.log("Load Effect: Loading thread from state:", threadIdFromState);
                 setCurrentThreadId(threadIdFromState); // Set the new ID
                 try {
                     const { data: existingMessages, error: messagesError } = await supabase
                         .from('messages')
                         .select('*')
                         .eq('thread_id', threadIdFromState)
                         .order('created_at', { ascending: true });

                    if (messagesError) throw messagesError;

                    // Map DB messages to DisplayMessages (handle potential missing content)
                     const formatted = existingMessages.map(msg => ({
                         id: msg.id,
                         content: msg.content ?? '', // Default to empty string if null
                         isUser: msg.role === 'user',
                         role: msg.role as 'user' | 'assistant',
                         timestamp: "", // You might want to format msg.created_at here
                         created_at: msg.created_at,
                         // Add logic here if you stored tool call/response info in DB
                         isToolCall: msg.metadata?.isToolCall ?? false,
                         toolResultContent: msg.metadata?.toolResultContent ?? null,
                     }));

                    setMessages(formatted);
                    setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                    console.log("Load Effect: Messages loaded, count=", formatted.length);
                    setChatLoading(false);
                     // Use requestAnimationFrame for smoother scroll after render
                     requestAnimationFrame(() => {
                         scrollToBottom('auto'); // Use 'auto' for initial load
                         isInitialMount.current = false; // Mark initial load finished
                     });
                 } catch (error: any) {
                    console.error("Load Effect: Error loading messages:", error);
                    setMessages([]); // Clear messages on error
                    setCurrentThreadId(null); // Reset thread ID
                    setCreateThreadError(`Failed to load chat: ${error.message}`);
                    setChatLoading(false);
                    setPlaceholderType(null);
                     isInitialMount.current = false;
                 }
             } else if (!threadIdFromState) {
                 console.log("Load Effect: No thread in state, creating new one.");
                 await handleCreateNewThread(false); // This sets chatLoading=false inside
                 isInitialMount.current = false;
             } else {
                 // Thread ID hasn't changed, don't reload, just ensure loading is false
                 setChatLoading(false);
                 if (messages.length > 0) {
                     requestAnimationFrame(() => scrollToBottom('auto')); // Scroll if already loaded
                 }
                  isInitialMount.current = false;
             }
         };
         initializeChat();
     // eslint-disable-next-line react-hooks/exhaustive-deps
     }, [session?.user?.id, userLoading, location.state?.threadId]); // Rerun when user or threadId in state changes


    // Scroll on new message (excluding initial mount)
    useEffect(() => {
        if (!isInitialMount.current && messages.length > 0) {
            scrollToBottom('smooth');
        }
    }, [messages, scrollToBottom]); // Depend only on messages

    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Render Logic (Adjusted Message Display) ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background">Loading User...</div>;

    const isLoading = chatLoading; // Only consider initial thread loading here
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;

    // Check if Gemini/Linkup keys are missing for UI feedback
    const aiDisabled = !GEMINI_API_KEY;
    const searchDisabled = !LINKUP_API_KEY;

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
            {/* Sidebar (keep existing) */}
            <AnimatePresence>{isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true"/> )}</AnimatePresence>
             <motion.div ref={sidebarRef} className={clsx( "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-gray-200/80", "transition-transform duration-300 ease-in-out", isMobile ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full') )}>
                  <Sidebar isExpanded={!isMobile && isDesktopSidebarExpanded} isMobileOpen={isMobile && isMobileSidebarOpen} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
             </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header (keep existing) */}
                {isMobile && ( <div className="flex items-center px-4 py-2 border-b border-gray-200/60 flex-shrink-0 h-14"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-gray-600 hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="flex-grow text-center text-base font-semibold text-secondary truncate px-2">Parthavi</h1> <div className="w-8 h-8"></div> </div> )}

                {/* Message List */}
                <div ref={chatContainerRef} className={clsx('flex-1 overflow-y-auto scroll-smooth min-h-0', 'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4')} >
                    <div className={clsx("max-w-4xl mx-auto w-full flex flex-col min-h-full", showMessagesList ? 'justify-end' : 'justify-center items-center')} >
                        {isLoading && <div className="flex justify-center items-center p-10 text-gray-500 flex-1"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat... </div>}
                        {showAnyPlaceholder && placeholderType === 'initial' && <div className="flex-1 flex items-center justify-center w-full"><InitialPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyPlaceholder && placeholderType === 'new_thread' && <div className="flex-1 flex items-center justify-center w-full"><NewThreadPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyError && <div className="flex-1 flex items-center justify-center w-full"><div className='flex flex-col items-center text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md'><AlertCircle className="w-8 h-8 mb-3 text-red-400" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div></div>}

                        {/* Render Actual Messages */}
                        {showMessagesList && (
                            <div className="w-full space-y-4 md:space-y-5">
                                {messages.map((m) => {
                                    // Render normal user/AI messages
                                    if (!m.isToolCall && !m.isError) {
                                        return <ChatMessage key={m.id} message={m.content} isUser={m.isUser} senderName={m.isUser ? (userName || 'You') : 'Parthavi'} />;
                                    }
                                    // Optionally render tool call / result steps for debugging or clarity
                                     else if (m.isToolCall) {
                                         return (
                                             <div key={m.id} className="text-xs text-gray-500 italic text-center py-2 my-1 flex items-center justify-center gap-2">
                                                 <Search size={12}/> {m.isPending ? m.content : `Called tool: linkup_web_search`}
                                                 {m.isPending && <Loader2 size={12} className="animate-spin"/>}
                                             </div>
                                         );
                                     }
                                     // Render API errors inline (already handled by showAnyError block, but keep for safety)
                                     else if (m.isError) {
                                         return <div key={m.id} className="text-sm text-red-600 text-center py-2">{m.content}</div>
                                     }
                                     return null; // Should not happen
                                })}
                                 {/* Show typing indicator only when actively waiting for Gemini (not during tool call) */}
                                {isResponding && messages[messages.length - 1]?.role === 'user' && (
                                    <div className="flex justify-start pl-10 pr-4"> {/* Adjust padding to align with AI messages */}
                                        <div className="flex items-center space-x-2 text-gray-500">
                                             <div className="typing-indicator"> {/* You'd need CSS for the dots */}
                                                <span></span><span></span><span></span>
                                             </div>
                                             <span className="text-sm">Parthavi is thinking...</span>
                                        </div>
                                    </div>
                                )}
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
                            onSendMessage={handleSendMessage}
                            isResponding={isResponding || chatLoading || aiDisabled} // Disable input if AI key missing
                         />
                        {/* Show API Key warning */}
                        {(aiDisabled || searchDisabled) && (
                             <p className="text-xs text-orange-600 mt-2 text-center px-4">
                                 {aiDisabled && "AI functionality is disabled (Missing Gemini API Key)."}
                                 {aiDisabled && searchDisabled && " "}
                                 {searchDisabled && "Web search functionality may be unavailable (Missing Linkup API Key)."}
                             </p>
                         )}
                    </div>
                </div>
            </main>

            {/* Share Popup (keep existing) */}
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
