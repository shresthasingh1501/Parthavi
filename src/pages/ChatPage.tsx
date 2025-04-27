// src/pages/ChatPage.tsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { clsx } from 'clsx';
import { MessageSquare, Menu as MenuIcon, X, Loader2, AlertCircle, Search } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import {
    GoogleGenAI,
    Content,
    Part,
    Role,
    GenerateContentResponse,
    SystemInstruction,
    FunctionCall,
    FunctionResponse,
    GenerateContentStreamResult,
    Tool
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
type DisplayMessage = Pick<DbMessage, 'id' | 'role' | 'created_at' | 'content'> & {
    isUser: boolean;
    timestamp: string;
    isPending?: boolean;
    isError?: boolean;
    isToolCall?: boolean;
    toolResultContent?: any; // Store serialized FunctionResponse
};
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'> & { metadata?: any }; // Added metadata for potential DB storage
type PlaceholderType = 'initial' | 'new_thread' | null;
type LinkupSearchResult = {
    answer: string;
    sources: Array<{ name: string; url: string; snippet: string }>;
}

// Constants
const SIDEBAR_WIDTH_DESKTOP = 'w-[448px]';
const SIDEBAR_ICON_WIDTH_DESKTOP = 'md:w-24';
const SIDEBAR_WIDTH_MOBILE_OPEN = 'w-[85vw] max-w-sm';
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
const LINKUP_API_KEY = import.meta.env.VITE_LINKUP_API_KEY;
const MODEL_NAME = "gemini-2.0-flash";

// --- System Instruction (Corrected) ---
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
6.  **Tool Usage (Web Search):** If a user's query requires current information beyond your training data (e.g., recent job market trends, specific company details, current salary benchmarks, links to specific online resources, news about an industry), **use the 'linkup_web_search' tool**. Formulate a concise and effective search query (the 'q' parameter) based on the user's request to fetch relevant information from the web. After receiving the search results, synthesize the information and present it clearly to the user, citing the source if appropriate based on the search result content. Do not just dump the raw search results.

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
    const params = new URLSearchParams({
        q: query,
         outputType: "sourcedAnswer"
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
        if (!data || typeof data.answer !== 'string') {
             console.warn("Linkup API returned unexpected format:", data);
             return { answer: "Received unexpected data from search.", sources: [] };
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
    if (!messageData.user_id) { console.error("Save Error: user_id missing."); return null; }
    console.log('Background save initiated for:', messageData.role);
    try {
        // Ensure metadata is at least null if not provided
        const dataToInsert = { ...messageData, metadata: messageData.metadata || null };
        const { data, error } = await supabase
            .from('messages')
            .insert(dataToInsert)
            .select('id')
            .single();
        if (error) throw error;
        console.log(`Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`Background save FAILED for ${messageData.role}:`, error); return null; }
};

// Format history, including potential function calls/responses
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    const history: Content[] = [];
    messages.forEach(msg => {
        // Only include finalized, non-error, non-pending, non-tool-call messages for text history
        if (!msg.isToolCall && msg.content && !msg.isError && !msg.isPending && !msg.toolResultContent) {
             history.push({
                role: msg.role as Role,
                parts: [{ text: msg.content }],
            });
        }
        // Include the model's request to call a function
        else if (msg.isToolCall && msg.content && !msg.toolResultContent) { // Ensure it's the call request, not the result display
             try {
                const funcCall: FunctionCall = JSON.parse(msg.content); // Content holds serialized FunctionCall
                history.push({
                    role: 'model',
                    parts: [{ functionCall: funcCall }]
                });
             } catch (e) { console.error("Failed to parse stored FunctionCall:", msg.content, e); }
        }
        // Include the result of the function call provided back to the model
        else if (msg.toolResultContent) { // toolResultContent holds serialized FunctionResponse
             try {
                const funcResponse: FunctionResponse = JSON.parse(msg.toolResultContent);
                history.push({
                    role: 'user', // Role is 'user' (or 'function') for function result
                    parts: [{ functionResponse: funcResponse }]
                });
             } catch (e) { console.error("Failed to parse stored FunctionResponse:", msg.toolResultContent, e); }
        }
    });
    // Final filter for safety
    return history.filter(content => content.parts && content.parts.length > 0 && (content.parts[0].text || content.parts[0].functionCall || content.parts[0].functionResponse));
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
        setTimeout(() => {
            if (chatContainerRef.current) {
                chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior });
            }
        }, 60);
    }, []);

    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => {
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


    // --- Main Send Message Logic (Corrected - Reverted to genAI.models.generateContentStream) ---
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
        // Use a functional update to get the latest messages state
        let latestMessages: DisplayMessage[] = [];
        setMessages(prevMessages => {
            latestMessages = [...prevMessages, optimisticUserMsg];
            return latestMessages;
        });
        scrollToBottom('smooth');

        // Save user message to DB (fire and forget)
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        // Get the history *after* adding the user message
        let currentHistory = formatChatHistoryForGemini(latestMessages);

        // --- Main Interaction Loop ---
        let loopCount = 0; // Safety break

        try {
            while (loopCount < 5) { // Max 5 turns (user->model->tool->model->...)
                loopCount++;
                console.log(`Gemini Call #${loopCount} - History Length: ${currentHistory.length}`);

                // 2. Call Gemini API (Using the correct method)
                const requestPayload = {
                    model: MODEL_NAME, // *** Ensure model name is here ***
                    contents: currentHistory,
                    tools: [linkupSearchTool], // Pass the tool definition
                    systemInstruction: systemInstructionObject,
                };

                // *** Use the correct API call structure ***
                 if (!genAI) throw new Error("Gemini AI Client lost."); // Re-check just in case
                const result: GenerateContentStreamResult = await genAI.models.generateContentStream(requestPayload);
                 // ********************************************

                // 3. Process the Response (Stream or Function Call)
                let aggregatedResponse: GenerateContentResponse | null = null;
                let accumulatedText = "";
                let detectedFunctionCall: FunctionCall | null = null;

                // Add a temporary pending AI message placeholder immediately
                const tempAiMsgId = `temp-ai-${Date.now()}-turn-${loopCount}`;
                const pendingAiMsg: DisplayMessage = {
                    id: tempAiMsgId, content: '', isUser: false, role: 'assistant',
                    timestamp: "", created_at: new Date().toISOString(), isPending: true
                };
                // Update state using functional update
                setMessages(prev => {
                    latestMessages = [...prev, pendingAiMsg];
                    return latestMessages;
                });
                scrollToBottom('smooth'); // Scroll for the pending message

                // Process stream chunks
                for await (const chunk of result.stream) {
                    // Simple aggregation (might need improvement)
                    if (!aggregatedResponse) aggregatedResponse = { ...chunk };
                    else {
                        if (chunk.candidates) aggregatedResponse.candidates = chunk.candidates;
                        if (chunk.promptFeedback) aggregatedResponse.promptFeedback = chunk.promptFeedback;
                    }

                    const candidate = chunk?.candidates?.[0];
                    const funcCallPart = candidate?.content?.parts?.find(part => part.functionCall);
                    const textPart = candidate?.content?.parts?.find(part => part.text);

                    if (funcCallPart?.functionCall) {
                        detectedFunctionCall = funcCallPart.functionCall;
                        console.log("Function Call DETECTED in stream chunk:", detectedFunctionCall);
                        // Remove the pending text placeholder as function call takes precedence
                        setMessages(prev => {
                            latestMessages = prev.filter(m => m.id !== tempAiMsgId);
                            return latestMessages;
                        });
                        break; // Stop stream processing
                    }

                    if (textPart?.text) {
                        accumulatedText += textPart.text;
                        // Update the pending message content incrementally
                        setMessages(prev => {
                             latestMessages = prev.map(m =>
                                m.id === tempAiMsgId ? { ...m, content: accumulatedText, isPending: true } : m
                            );
                            return latestMessages;
                        });
                        scrollToBottom('smooth'); // Scroll as text streams in
                    }
                } // End stream processing

                // --- Decide Action based on Gemini's response ---

                // A. FUNCTION CALL Required
                if (detectedFunctionCall) {
                    console.log("Processing Function Call:", detectedFunctionCall.name);
                    const tempToolCallMsgId = `temp-toolcall-${Date.now()}`;
                     const toolCallMsg: DisplayMessage = {
                        id: tempToolCallMsgId,
                        content: JSON.stringify(detectedFunctionCall), // Store serialized call
                        isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                        isToolCall: true, isPending: true
                    };
                    // Update state to show tool call initiation
                    setMessages(prev => {
                        latestMessages = [...prev, toolCallMsg];
                        return latestMessages;
                    });
                    scrollToBottom();

                    let toolResult: LinkupSearchResult | { error: string };
                    let toolResultMessage = "";

                    if (detectedFunctionCall.name === 'linkup_web_search') {
                        const query = detectedFunctionCall.args.q as string || "generic topic";
                        toolResultMessage = `Searching the web for: "${query}"...`;
                        setMessages(prev => {
                            latestMessages = prev.map(m => m.id === tempToolCallMsgId ? { ...m, isPending: true, content: toolResultMessage } : m);
                            return latestMessages;
                        });
                        toolResult = await callLinkupSearchAPI(query);
                    } else {
                        console.warn(`Unsupported function call detected: ${detectedFunctionCall.name}`);
                        toolResultMessage = `Error: Tool '${detectedFunctionCall.name}' is not available.`;
                        toolResult = { error: `Function ${detectedFunctionCall.name} is not implemented.` };
                    }

                    const functionResponsePart: FunctionResponse = {
                        name: detectedFunctionCall.name,
                        response: toolResult
                    };

                    const resultSummary = (toolResult as { error: string }).error
                        ? `Search failed: ${(toolResult as { error: string }).error}`
                        : `Search results received for "${(detectedFunctionCall.args.q as string || 'topic')}".`;

                    setMessages(prev => {
                        latestMessages = prev.map(m => m.id === tempToolCallMsgId ? {
                            ...m,
                            isPending: false,
                            content: resultSummary, // Display summary, not raw data
                            toolResultContent: JSON.stringify(functionResponsePart) // Store serialized *response* sent back
                        } : m);
                        return latestMessages;
                    });
                    scrollToBottom();

                    // Add function call *request* and function *response* to history for the *next* loop iteration
                    currentHistory.push({ role: 'model', parts: [{ functionCall: detectedFunctionCall }] });
                    currentHistory.push({ role: 'user', parts: [{ functionResponse: functionResponsePart }] });

                    // Save the message representing the tool call and its result (optional, for history viewing)
                     const toolMessagePayload: MessagePayload = {
                        thread_id: currentThread,
                        content: resultSummary, // Store the summary text
                        role: 'assistant', // Or a special role like 'tool'
                        user_id: userId,
                        metadata: { isToolCall: true, toolResultContent: JSON.stringify(functionResponsePart) } // Store details in metadata
                    };
                    saveMessageToDb(toolMessagePayload).catch(err => console.error("Error saving tool message:", err));


                    continue; // Continue loop to send result back to Gemini
                }

                // B. TEXT Response Received
                else if (accumulatedText) {
                     console.log("Final Text Response Received:", accumulatedText);
                     setMessages(prev => {
                         latestMessages = prev.map(msg =>
                            msg.id === tempAiMsgId
                                ? { ...msg, content: accumulatedText, isPending: false }
                                : msg
                        );
                         return latestMessages;
                     });
                    scrollToBottom(); // Ensure scrolled

                    const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedText, role: 'assistant', user_id: userId };
                    saveMessageToDb(aiMessagePayload).catch(err => console.error("Error saving final AI message:", err));
                    break; // Text response means loop is done
                }

                // C. No Text and No Function Call
                else {
                    const finalResponse = await result.response; // Check final aggregated response
                    console.warn("Gemini responded with neither text nor function call.", finalResponse);
                    const errMsg = finalResponse?.promptFeedback?.blockReason?.message || "The AI assistant did not provide a response.";
                    setApiError(errMsg);

                    setMessages(prev => {
                         const pendingMsgIndex = prev.findIndex(m => m.id === tempAiMsgId);
                         if (pendingMsgIndex > -1) {
                             latestMessages = prev.map((msg, index) =>
                                index === pendingMsgIndex
                                    ? { ...msg, content: `Error: ${errMsg}`, isPending: false, isError: true }
                                    : msg
                            );
                         } else {
                             const errorDisplayMsg: DisplayMessage = {
                                id: tempAiMsgId,
                                content: `Error: ${errMsg}`,
                                isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                                isError: true
                             };
                             latestMessages = [...prev, errorDisplayMsg];
                         }
                         return latestMessages;
                    });
                    scrollToBottom();
                    break; // Exit loop
                }
            } // End while loop

            if (loopCount >= 5) {
                 console.error("Function calling loop reached maximum iterations.");
                 setApiError("The conversation flow became too complex. Please try rephrasing.");
                 const loopErrorMsg: DisplayMessage = {
                    id: `loop-error-${Date.now()}`, content: "Error: Conversation complexity limit reached.",
                    isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isError: true
                 };
                 setMessages(prev => [...prev, loopErrorMsg]);
            }

        } catch (aiError: any) {
            console.error("Error during Gemini interaction:", aiError);
            const errorMessage = aiError.message || "An unknown API error occurred.";
            setApiError(errorMessage);
            const errorDisplayMsg: DisplayMessage = {
                id: `error-${Date.now()}`,
                content: `Error: ${errorMessage}`,
                isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(),
                isError: true
            };
            // Add error message, removing any pending placeholders first
            setMessages(prev => [...prev.filter(m => !m.isPending), errorDisplayMsg]);
            scrollToBottom();
        } finally {
            setIsResponding(false); // Stop loading indicator
        }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom, genAI]); // Dependencies


    // --- Other Callbacks (Keep existing) ---
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
            // Reset errors when switching threads
            setApiError(null);
            setCreateThreadError(null);
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
                    requestAnimationFrame(() => handleSendMessage(prompt));
                }
            });
        } else {
            handleSendMessage(prompt);
        }
    }, [currentThreadId, handleCreateNewThread, handleSendMessage]);
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => setIsSharePopupOpen(true);

    // --- Effects (Keep existing) ---
    useEffect(() => { if (!userLoading && !session) navigate('/', { replace: true }); }, [session, userLoading, navigate]);

    // Initial Load / Thread Change Effect
     useEffect(() => {
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) {
            setChatLoading(false); // Stop loading if no user
            return;
        }
        const threadIdFromState = location.state?.threadId;
        console.log("Load Effect Triggered: User=", !!currentUserId, "UserLoading=", userLoading, "State Thread=", threadIdFromState, "Current Thread=", currentThreadId);

        // Prevent reloading same thread or running on initial render before state is set
         if (threadIdFromState === currentThreadId && !isInitialMount.current && !chatLoading) {
             console.log("Load Effect: Thread ID unchanged, skipping reload.");
             return;
         }

        const initializeChat = async () => {
            setChatLoading(true); setMessages([]); setApiError(null);
            setCreateThreadError(null); setPlaceholderType(null);
            console.log("Load Effect: Initializing Chat...");

            if (threadIdFromState) {
                console.log("Load Effect: Loading thread from state:", threadIdFromState);
                // Only set if different to avoid re-triggering effect unnecessarily
                if (threadIdFromState !== currentThreadId) {
                    setCurrentThreadId(threadIdFromState);
                }
                try {
                    const { data: existingMessages, error: messagesError } = await supabase
                        .from('messages')
                        .select('*, metadata') // Select metadata
                        .eq('thread_id', threadIdFromState)
                        .order('created_at', { ascending: true });

                    if (messagesError) throw messagesError;

                    const formatted = existingMessages.map(msg => ({
                        id: msg.id,
                        content: msg.content ?? '',
                        isUser: msg.role === 'user',
                        role: msg.role as 'user' | 'assistant',
                        timestamp: "",
                        created_at: msg.created_at,
                        isToolCall: (msg.metadata as any)?.isToolCall ?? false,
                        // Ensure content for tool calls is the summary, not the raw data if saved that way
                        toolResultContent: (msg.metadata as any)?.toolResultContent ?? null, // Store the response sent *back* to gemini
                        isPending: false,
                        isError: (msg.metadata as any)?.isError ?? false,
                    }));

                    setMessages(formatted);
                    setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                    console.log("Load Effect: Messages loaded, count=", formatted.length);
                    setChatLoading(false);
                    requestAnimationFrame(() => {
                        scrollToBottom('auto');
                    });
                } catch (error: any) {
                    console.error("Load Effect: Error loading messages:", error);
                    setMessages([]);
                    setCurrentThreadId(null); // Reset thread ID if load fails
                    navigate(location.pathname, { replace: true, state: {} }); // Clear state on error
                    setCreateThreadError(`Failed to load chat: ${error.message}`);
                    setChatLoading(false);
                    setPlaceholderType(null);
                }
            } else {
                console.log("Load Effect: No thread in state, creating new one.");
                await handleCreateNewThread(false);
            }
             isInitialMount.current = false; // Mark initial setup finished *after* potential async operations
        };
        initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id, userLoading, location.state?.threadId]); // Rerun when user or threadId in state changes

    // Scroll on new message
    useEffect(() => {
        if (!chatLoading && messages.length > 0) {
             // Use auto scroll for initial load potentially handled by the load effect
             // Use smooth scroll for subsequent messages added by user or AI
             const scrollBehavior = isInitialMount.current ? 'auto' : 'smooth';
             // Check if the last message is pending to decide whether to scroll immediately or wait slightly
             const lastMessage = messages[messages.length - 1];
             if (!lastMessage?.isPending) { // If not pending, scroll immediately
                 scrollToBottom(scrollBehavior);
             } else { // If pending, maybe a slight delay helps rendering
                  setTimeout(() => scrollToBottom(scrollBehavior), 100);
             }
        }
    }, [messages, chatLoading, scrollToBottom]);

    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background text-primary">Loading User...</div>;

    const isLoading = chatLoading;
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;
    const aiDisabled = !GEMINI_API_KEY;
    const searchDisabled = !LINKUP_API_KEY;

    return (
        <div className="flex h-screen bg-background text-secondary overflow-hidden">
            {/* Sidebar */}
            <AnimatePresence>{isMobile && isMobileSidebarOpen && ( <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="fixed inset-0 bg-black/30 z-30 md:hidden" onClick={closeMobileSidebar} aria-hidden="true"/> )}</AnimatePresence>
             <motion.div ref={sidebarRef} className={clsx( "absolute md:relative h-full flex-shrink-0 z-40 bg-background border-r border-border", "transition-transform duration-300 ease-in-out", isMobile ? (isMobileSidebarOpen ? SIDEBAR_WIDTH_MOBILE_OPEN : 'w-16') : (isDesktopSidebarExpanded ? SIDEBAR_WIDTH_DESKTOP : SIDEBAR_ICON_WIDTH_DESKTOP), isMobile && (isMobileSidebarOpen ? 'translate-x-0 shadow-lg' : '-translate-x-full') )}>
                  <Sidebar isExpanded={!isMobile && isDesktopSidebarExpanded} isMobileOpen={isMobile && isMobileSidebarOpen} activePanel={activePanel} onPanelChange={handlePanelChange} openSharePopup={openSharePopup} onCloseMobileSidebar={closeMobileSidebar} onSelectThread={handleSelectThread} onNewThread={handleCreateNewThread} currentThreadId={currentThreadId} />
             </motion.div>

            {/* Main Chat Area */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative">
                {/* Mobile Header */}
                {isMobile && ( <div className="flex items-center px-4 py-2 border-b border-border flex-shrink-0 h-14"> <button onClick={isMobileSidebarOpen ? closeMobileSidebar : openMobileSidebar} className="p-2 text-muted-foreground hover:text-primary" aria-label={isMobileSidebarOpen ? "Close menu" : "Open menu"}> {isMobileSidebarOpen ? <X size={22} /> : <MenuIcon size={22} />} </button> <h1 className="flex-grow text-center text-base font-semibold text-foreground truncate px-2">Parthavi</h1> <div className="w-8 h-8"></div> </div> )}

                {/* Message List */}
                <div ref={chatContainerRef} className={clsx('flex-1 overflow-y-auto scroll-smooth min-h-0', 'px-4 md:px-10 lg:px-16 xl:px-20 pt-4 pb-4')} >
                    <div className={clsx("max-w-4xl mx-auto w-full flex flex-col min-h-full", showMessagesList ? 'justify-end' : 'justify-center items-center')} >
                        {isLoading && <div className="flex justify-center items-center p-10 text-muted-foreground flex-1"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat... </div>}
                        {showAnyPlaceholder && placeholderType === 'initial' && <div className="flex-1 flex items-center justify-center w-full"><InitialPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyPlaceholder && placeholderType === 'new_thread' && <div className="flex-1 flex items-center justify-center w-full"><NewThreadPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyError && <div className="flex-1 flex items-center justify-center w-full"><div className='flex flex-col items-center text-center text-red-600 p-4 bg-red-100 rounded-lg max-w-md border border-red-300'><AlertCircle className="w-8 h-8 mb-3 text-red-500" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div></div>}

                        {/* Render Actual Messages */}
                        {showMessagesList && (
                            <div className="w-full space-y-4 md:space-y-5">
                                {messages.map((m) => {
                                    // Render normal user/AI messages
                                    if (!m.isPending && !m.isError && !m.isToolCall) {
                                        return <ChatMessage key={m.id} message={m.content} isUser={m.isUser} senderName={m.isUser ? (userName || 'You') : 'Parthavi'} />;
                                    }
                                    // Render pending AI text message
                                    else if (m.isPending && !m.isToolCall && !m.isError) {
                                        return <ChatMessage key={m.id} message={m.content || "..."} isUser={false} senderName={'Parthavi'} isPending={true} />;
                                    }
                                    // Render tool call status message
                                     else if (m.isToolCall) {
                                         return (
                                             <div key={m.id} className="text-xs text-muted-foreground italic text-center py-2 my-1 flex items-center justify-center gap-2">
                                                 <Search size={12}/> {m.content} {/* Content now holds the summary/status */}
                                                 {m.isPending && <Loader2 size={12} className="animate-spin"/>}
                                             </div>
                                         );
                                     }
                                     // Render inline errors distinctly
                                     else if (m.isError) {
                                         return <div key={m.id} className="text-sm text-destructive text-center py-2 px-4 bg-destructive/10 rounded my-2 mx-auto max-w-md">{m.content}</div>
                                     }
                                     return null;
                                })}
                            </div>
                        )}
                    </div>
                </div>

                 {/* Chat Input Area */}
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-border flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <ChatInput
                            value={inputMessage}
                            onChange={handleInputChange}
                            onSendMessage={handleSendMessage}
                            isResponding={isResponding || chatLoading || aiDisabled}
                         />
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

            {/* Share Popup */}
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
