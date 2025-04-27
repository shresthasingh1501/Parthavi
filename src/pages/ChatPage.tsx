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
type MessagePayload = Omit<DbMessage, 'id' | 'created_at' | 'updated_at'> & { metadata?: any };
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
    console.log("[DEBUG] callLinkupSearchAPI: Called with query:", query);
    if (!LINKUP_API_KEY) {
        console.error("[DEBUG] callLinkupSearchAPI: Linkup API Key is missing.");
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
    const fullUrl = `${url}?${params.toString()}`;
    console.log(`[DEBUG] callLinkupSearchAPI: Calling Linkup API URL: ${fullUrl}`);

    try {
        const response = await fetch(fullUrl, {
            method: 'GET',
            headers: headers,
        });
        console.log("[DEBUG] callLinkupSearchAPI: Response Status:", response.status);

        if (!response.ok) {
            const errorBody = await response.text();
            console.error(`[DEBUG] callLinkupSearchAPI: Linkup API Error (${response.status}): ${errorBody}`);
            throw new Error(`Search failed with status ${response.status}.`);
        }

        const data: LinkupSearchResult = await response.json();
        console.log("[DEBUG] callLinkupSearchAPI: Linkup API Success. Data:", data);
        if (!data || typeof data.answer !== 'string') {
             console.warn("[DEBUG] callLinkupSearchAPI: Linkup API returned unexpected format:", data);
             return { error: "Received unexpected data format from search tool." };
        }
        return data;
    } catch (error: any) {
        console.error("[DEBUG] callLinkupSearchAPI: Error during fetch:", error);
        return { error: error.message || "An error occurred while searching." };
    }
};


// --- Gemini Client Initialization ---
let genAI: GoogleGenAI | null = null;
if (GEMINI_API_KEY) {
    try {
        genAI = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
        console.log("[DEBUG] Gemini Initialized.");
    } catch (e) {
        console.error("[DEBUG] Gemini Init Failed:", e);
        genAI = null;
    }
} else {
    console.warn("[DEBUG] VITE_GEMINI_API_KEY not set.");
}

// --- Utility Functions ---
const saveMessageToDb = async (messageData: MessagePayload): Promise<string | null> => {
    if (!messageData.user_id) { console.error("[DEBUG] saveMessageToDb: Save Error: user_id missing."); return null; }
    console.log('[DEBUG] saveMessageToDb: Background save initiated for:', messageData.role, 'Content:', messageData.content?.substring(0, 50) + '...');
    try {
        const dataToInsert = { ...messageData, metadata: messageData.metadata || null };
        const { data, error } = await supabase.from('messages').insert(dataToInsert).select('id').single();
        if (error) throw error;
        console.log(`[DEBUG] saveMessageToDb: Background save SUCCESS for ${messageData.role}, ID: ${data?.id}`);
        return data?.id;
    } catch (error) { console.error(`[DEBUG] saveMessageToDb: Background save FAILED for ${messageData.role}:`, error); return null; }
};

// Format history, including potential function calls/responses
const formatChatHistoryForGemini = (messages: DisplayMessage[]): Content[] => {
    console.log("[DEBUG] formatChatHistoryForGemini: Formatting messages count:", messages.length);
    const history: Content[] = [];
    messages.forEach((msg, index) => {
        console.log(`[DEBUG] formatChatHistoryForGemini: Processing message ${index}, Role: ${msg.role}, isToolCall: ${msg.isToolCall}, hasToolResult: ${!!msg.toolResultContent}, isPending: ${msg.isPending}, isError: ${msg.isError}`);
        // Only include finalized, non-error, non-pending messages for text history
        if (!msg.isToolCall && msg.content && !msg.isError && !msg.isPending && !msg.toolResultContent) {
            console.log(`[DEBUG] formatChatHistoryForGemini: Adding TEXT part for message ${index}`);
            history.push({ role: msg.role as Role, parts: [{ text: msg.content }] });
        }
        // Include the model's *request* to call a function
        else if (msg.isToolCall && msg.content && !msg.toolResultContent && !msg.isPending && !msg.isError) {
            try {
                const funcCall: FunctionCall = JSON.parse(msg.content);
                console.log(`[DEBUG] formatChatHistoryForGemini: Adding FUNCTION_CALL part for message ${index}`, funcCall);
                history.push({ role: 'model', parts: [{ functionCall: funcCall }] });
            } catch (e) { console.error("[DEBUG] formatChatHistoryForGemini: Failed to parse stored FunctionCall:", msg.content, e); }
        }
        // Include the *result* of the function call provided back *to* the model
        else if (msg.toolResultContent && !msg.isPending && !msg.isError) {
            try {
                const funcResponse: FunctionResponse = JSON.parse(msg.toolResultContent);
                console.log(`[DEBUG] formatChatHistoryForGemini: Adding FUNCTION_RESPONSE part for message ${index}`, funcResponse);
                history.push({ role: 'user', parts: [{ functionResponse: funcResponse }] });
            } catch (e) { console.error("[DEBUG] formatChatHistoryForGemini: Failed to parse stored FunctionResponse:", msg.toolResultContent, e); }
        } else {
             console.log(`[DEBUG] formatChatHistoryForGemini: SKIPPING message ${index} from history (pending, error, or invalid state).`);
        }
    });
    console.log("[DEBUG] formatChatHistoryForGemini: Final history object:", history);
    // Final filter (should ideally be unnecessary if logic above is correct)
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
    const [isResponding, setIsResponding] = useState(false);
    const [chatLoading, setChatLoading] = useState(true);
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

    // --- Callbacks ---
    const scrollToBottom = useCallback((behavior: ScrollBehavior = 'smooth') => {
        console.log("[DEBUG] scrollToBottom called with behavior:", behavior);
        setTimeout(() => {
            if (chatContainerRef.current) {
                const scrollHeight = chatContainerRef.current.scrollHeight;
                console.log("[DEBUG] scrollToBottom: Scrolling to height:", scrollHeight);
                chatContainerRef.current.scrollTo({ top: scrollHeight, behavior });
            } else {
                 console.log("[DEBUG] scrollToBottom: chatContainerRef.current is null.");
            }
        }, 60);
    }, []);

    const handleCreateNewThread = useCallback(async (shouldSetActive: boolean = true): Promise<string | null> => {
        console.log("[DEBUG] handleCreateNewThread: Called.");
        if (!session?.user) { console.error("[DEBUG] handleCreateNewThread: User session not found."); setCreateThreadError("User session not found."); return null; }
        console.log("[DEBUG] handleCreateNewThread: Attempting to create new thread...");
        setChatLoading(true); setMessages([]); setCurrentThreadId(null);
        setPlaceholderType(null); setCreateThreadError(null); setApiError(null);
        try {
            const newTitle = generateRandomTitle();
            const { data: newThread, error } = await supabase.from('threads').insert({ user_id: session.user.id, title: newTitle }).select('id').single();
            if (error) throw error;
            if (!newThread) throw new Error("New thread data missing after insert.");
            console.log("[DEBUG] handleCreateNewThread: New thread created:", newThread.id);
            setCurrentThreadId(newThread.id);
            setPlaceholderType('new_thread');
            navigate(location.pathname, { replace: true, state: { threadId: newThread.id } });
            if (shouldSetActive) { setActivePanel('discover'); }
            setChatLoading(false);
            console.log("[DEBUG] handleCreateNewThread: Finished successfully.");
            return newThread.id;
        } catch (error: any) {
            console.error("[DEBUG] handleCreateNewThread: Error creating new thread:", error);
            setCreateThreadError(error.message || "Failed to create new thread.");
            setChatLoading(false); setCurrentThreadId(null); setPlaceholderType(null);
            return null;
        }
    }, [session?.user?.id, navigate, location.pathname]);


    // --- Main Send Message Logic ---
    const handleSendMessage = useCallback(async (text: string) => {
        console.log("[DEBUG] handleSendMessage: Called with text:", text.substring(0, 50) + '...');
        if (!genAI) { console.error("[DEBUG] handleSendMessage: AI Client not configured."); setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread) { console.warn("[DEBUG] handleSendMessage: No current thread ID."); return; }
        if (isResponding) { console.warn("[DEBUG] handleSendMessage: Already responding, ignoring."); return; }
        if (!session?.user) { console.error("[DEBUG] handleSendMessage: No user session."); return; }
        const trimmedText = text.trim();
        if (!trimmedText) { console.warn("[DEBUG] handleSendMessage: Empty text, ignoring."); return; }

        console.log("[DEBUG] handleSendMessage: Proceeding to send message.");
        setPlaceholderType(null); setCreateThreadError(null); setApiError(null);
        const userId = session.user.id;
        setIsResponding(true); setInputMessage('');

        // 1. Prepare user message and next state array
        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = {
            id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user',
            timestamp: "", created_at: new Date().toISOString()
        };
        const nextMessages = [...messages, optimisticUserMsg];
        console.log("[DEBUG] handleSendMessage: Prepared nextMessages array (adding user msg). Count:", nextMessages.length);

        // Calculate history based on this next state *before* setting state
        let currentHistory = formatChatHistoryForGemini(nextMessages);
        console.log("[DEBUG] handleSendMessage: Calculated initial history for API call. Length:", currentHistory.length);

        // Update UI state with the user message
        setMessages(nextMessages);
        scrollToBottom('smooth');

        if (currentHistory.length === 0) {
             console.error("[DEBUG] handleSendMessage: CRITICAL - History is empty after adding user message and formatting. Aborting.");
             setApiError("Internal error preparing message history."); setIsResponding(false); return;
        }

        // Save user message to DB
        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("[DEBUG] handleSendMessage: Error saving user message (background):", err));

        // --- Main Interaction Loop ---
        let loopCount = 0;
        let latestMessagesState = nextMessages; // Track state within async loop

        try {
            while (loopCount < 5) {
                loopCount++;
                console.log(`[DEBUG] handleSendMessage: --- Interaction Loop Turn ${loopCount} ---`);
                console.log(`[DEBUG] handleSendMessage: Calling Gemini API. History Length: ${currentHistory.length}`, JSON.stringify(currentHistory, null, 2)); // Log full history being sent

                // 2. Prepare and Call Gemini API
                const requestPayload = {
                    model: MODEL_NAME,
                    contents: currentHistory,
                    tools: [linkupSearchTool],
                    systemInstruction: systemInstructionObject,
                };

                if (!genAI) throw new Error("Gemini AI Client lost mid-process."); // Should not happen if initial check passed

                console.log("[DEBUG] handleSendMessage: Awaiting genAI.models.generateContentStream...");
                const resultPromise = genAI.models.generateContentStream(requestPayload);
                const result = await resultPromise;
                console.log("[DEBUG] handleSendMessage: API Call Result Object:", result);

                // *** CRITICAL STREAM CHECK ***
                if (!result || !result.stream || typeof result.stream[Symbol.asyncIterator] !== 'function') {
                    console.error("[DEBUG] handleSendMessage: Error - result.stream is not a valid async iterator.", result);
                    const finalResponse = result?.response ? await result.response : null;
                    console.error("[DEBUG] handleSendMessage: Final Response object (if stream failed):", finalResponse);
                    const blockReason = finalResponse?.promptFeedback?.blockReason;
                    const finishReason = finalResponse?.candidates?.[0]?.finishReason;
                    let errMsg = "API did not return a valid stream.";
                    if (blockReason?.message) errMsg = `API blocked: ${blockReason.message}`;
                    else if (blockReason) errMsg = `API blocked request (Reason: ${blockReason.reason})`;
                    else if (finishReason && finishReason !== "STOP") errMsg = `API finished unexpectedly (Reason: ${finishReason})`;
                    // ... other checks from previous version ...
                    throw new Error(errMsg);
                }
                 console.log("[DEBUG] handleSendMessage: result.stream appears valid. Proceeding with stream processing.");
                // ******************************

                // 3. Process Response Stream / Function Call
                let aggregatedResponse: GenerateContentResponse | null = null;
                let accumulatedText = "";
                let detectedFunctionCall: FunctionCall | null = null;
                const tempAiMsgId = `temp-ai-${Date.now()}-turn-${loopCount}`;
                const pendingAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isPending: true };

                console.log("[DEBUG] handleSendMessage: Adding pending AI message placeholder:", tempAiMsgId);
                setMessages(prev => { latestMessagesState = [...prev, pendingAiMsg]; return latestMessagesState; });
                scrollToBottom('smooth');

                console.log("[DEBUG] handleSendMessage: Starting stream iteration...");
                for await (const chunk of result.stream) {
                    console.log("[DEBUG] handleSendMessage: Received stream chunk:", chunk);
                    // ... (stream aggregation logic - simplified log)
                    if (!aggregatedResponse) aggregatedResponse = { ...chunk }; else { if (chunk.candidates) aggregatedResponse.candidates = chunk.candidates; if (chunk.promptFeedback) aggregatedResponse.promptFeedback = chunk.promptFeedback; }

                    const candidate = chunk?.candidates?.[0];
                    const funcCallPart = candidate?.content?.parts?.find(part => part.functionCall);
                    const textPart = candidate?.content?.parts?.find(part => part.text);

                    if (funcCallPart?.functionCall) {
                        detectedFunctionCall = funcCallPart.functionCall;
                        console.log("[DEBUG] handleSendMessage: Function Call DETECTED in chunk:", detectedFunctionCall);
                        setMessages(prev => { latestMessagesState = prev.filter(m => m.id !== tempAiMsgId); return latestMessagesState; }); // Remove pending text msg
                        break; // Exit stream loop
                    }

                    if (textPart?.text) {
                        accumulatedText += textPart.text;
                         console.log("[DEBUG] handleSendMessage: Accumulated text:", accumulatedText);
                        setMessages(prev => { latestMessagesState = prev.map(m => m.id === tempAiMsgId ? { ...m, content: accumulatedText, isPending: true } : m); return latestMessagesState; });
                        scrollToBottom('smooth'); // Scroll as text streams
                    }
                } // End stream processing loop
                console.log("[DEBUG] handleSendMessage: Finished stream iteration.");

                // --- Decide Action ---
                // A. FUNCTION CALL Required
                if (detectedFunctionCall) {
                    console.log("[DEBUG] handleSendMessage: Processing detected Function Call:", detectedFunctionCall.name);
                    const tempToolCallMsgId = `temp-toolcall-${Date.now()}`;
                    const serializedCall = JSON.stringify(detectedFunctionCall);
                    const toolCallMsg: DisplayMessage = { id: tempToolCallMsgId, content: serializedCall, isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isToolCall: true, isPending: true };
                    setMessages(prev => { latestMessagesState = [...prev, toolCallMsg]; return latestMessagesState; });
                    scrollToBottom();

                    let toolResult: LinkupSearchResult | { error: string }; let toolResultMessage = "";

                    if (detectedFunctionCall.name === 'linkup_web_search') {
                        const query = detectedFunctionCall.args.q as string || "missing query";
                        toolResultMessage = `Searching the web for: "${query}"...`;
                        setMessages(prev => { latestMessagesState = prev.map(m => m.id === tempToolCallMsgId ? { ...m, isPending: true, content: toolResultMessage } : m); return latestMessagesState; });
                        toolResult = await callLinkupSearchAPI(query); // Await tool execution
                    } else {
                        toolResultMessage = `Error: Tool '${detectedFunctionCall.name}' is not available.`; toolResult = { error: `Function ${detectedFunctionCall.name} is not implemented.` }; console.warn(`[DEBUG] handleSendMessage: Unsupported function call: ${detectedFunctionCall.name}`);
                    }

                    const functionResponsePart: FunctionResponse = { name: detectedFunctionCall.name, response: toolResult };
                    const serializedResponse = JSON.stringify(functionResponsePart);
                    const resultSummary = (toolResult as { error: string }).error ? `Search failed: ${(toolResult as { error: string }).error}` : `Search results received for "${(detectedFunctionCall.args.q as string || 'topic')}".`;

                    console.log("[DEBUG] handleSendMessage: Updating tool message state with result summary:", resultSummary);
                    setMessages(prev => { latestMessagesState = prev.map(m => m.id === tempToolCallMsgId ? { ...m, isPending: false, content: resultSummary, toolResultContent: serializedResponse } : m); return latestMessagesState; });
                    scrollToBottom();

                    // Prepare history for the NEXT Gemini call
                    currentHistory.push({ role: 'model', parts: [{ functionCall: detectedFunctionCall }] });
                    currentHistory.push({ role: 'user', parts: [{ functionResponse: functionResponsePart }] });
                    console.log("[DEBUG] handleSendMessage: Updated history after function call for next turn:", currentHistory);

                    // Save tool interaction message to DB
                    const toolMessagePayload: MessagePayload = { thread_id: currentThread, content: resultSummary, role: 'assistant', user_id: userId, metadata: { isToolCall: true, toolResultContent: serializedResponse } };
                    saveMessageToDb(toolMessagePayload).catch(err => console.error("[DEBUG] handleSendMessage: Error saving tool message:", err));

                    console.log("[DEBUG] handleSendMessage: Continuing interaction loop after function call.");
                    continue; // Loop back to Gemini with function result
                }

                // B. TEXT Response Received
                else if (accumulatedText) {
                    console.log("[DEBUG] handleSendMessage: Final Text Response Received:", accumulatedText);
                    setMessages(prev => { latestMessagesState = prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: accumulatedText, isPending: false } : msg); return latestMessagesState; });
                    scrollToBottom();
                    const aiMessagePayload: MessagePayload = { thread_id: currentThread, content: accumulatedText, role: 'assistant', user_id: userId };
                    saveMessageToDb(aiMessagePayload).catch(err => console.error("[DEBUG] handleSendMessage: Error saving final AI message:", err));
                    console.log("[DEBUG] handleSendMessage: Interaction loop finished with text response.");
                    break; // Exit loop
                }

                // C. No Text/Function Call (Error Case)
                else {
                    const finalResponse = await result.response; // Check final response object
                    console.warn("[DEBUG] handleSendMessage: Gemini responded empty after stream.", finalResponse);
                    const errMsg = finalResponse?.promptFeedback?.blockReason?.message || "AI assistant did not provide a response.";
                    setApiError(errMsg);
                    setMessages(prev => {
                        const pIdx = prev.findIndex(m => m.id === tempAiMsgId);
                        if (pIdx > -1) latestMessagesState = prev.map((m, i) => i === pIdx ? { ...m, content: `Error: ${errMsg}`, isPending: false, isError: true } : m);
                        else { const errM: DisplayMessage = { id: tempAiMsgId, content: `Error: ${errMsg}`, isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isError: true }; latestMessagesState = [...prev, errM]; }
                        return latestMessagesState;
                    });
                   scrollToBottom();
                   console.log("[DEBUG] handleSendMessage: Interaction loop finished with empty/error response.");
                   break; // Exit loop
                }
            } // End while loop

            // Handle loop limit reached
            if (loopCount >= 5) {
                 console.error("[DEBUG] handleSendMessage: Function calling loop reached maximum iterations.");
                 setApiError("The conversation flow became too complex. Please try rephrasing.");
                 const loopErrorMsg: DisplayMessage = { id: `loop-error-${Date.now()}`, content: "Error: Conversation complexity limit reached.", isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isError: true };
                 setMessages(prev => [...prev.filter(m => !m.isPending), loopErrorMsg]);
            }

        } catch (aiError: any) {
            // Catch errors from API call or processing
             console.error("[DEBUG] handleSendMessage: Error during Gemini interaction:", aiError);
             const errorMessage = aiError.message || "Unknown API error occurred.";
             setApiError(errorMessage);
             const errorDisplayMsg: DisplayMessage = { id: `error-${Date.now()}`, content: `Error: ${errorMessage}`, isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString(), isError: true };
             // Add error message, clear any pending messages
             setMessages(prev => [...prev.filter(m => !m.isPending), errorDisplayMsg]);
            scrollToBottom();
        } finally {
            console.log("[DEBUG] handleSendMessage: Finalizing, setting isResponding=false.");
            setIsResponding(false); // Ensure input is unlocked
        }
    }, [currentThreadId, isResponding, session?.user?.id, messages, scrollToBottom, genAI]); // Dependencies


    // --- Other Callbacks ---
    const closeMobileSidebar = useCallback(() => { console.log("[DEBUG] closeMobileSidebar"); setIsMobileSidebarOpen(false); }, []);
    const openMobileSidebar = useCallback(() => { console.log("[DEBUG] openMobileSidebar"); if (!activePanel) setActivePanel('discover'); setIsMobileSidebarOpen(true); }, [activePanel]);
    const collapseDesktopSidebar = useCallback(() => { console.log("[DEBUG] collapseDesktopSidebar"); setIsDesktopSidebarExpanded(false); }, []);
    const expandDesktopSidebar = useCallback((panel: ActivePanelType) => { console.log("[DEBUG] expandDesktopSidebar:", panel); setActivePanel(panel || 'discover'); setIsDesktopSidebarExpanded(true); }, []);
    const handlePanelChange = useCallback((panel: ActivePanelType) => { console.log("[DEBUG] handlePanelChange:", panel); if (isMobile) { if (isMobileSidebarOpen && activePanel === panel) closeMobileSidebar(); else { setActivePanel(panel); setIsMobileSidebarOpen(true); } } else { if (isDesktopSidebarExpanded && activePanel === panel) collapseDesktopSidebar(); else expandDesktopSidebar(panel); } }, [isMobile, activePanel, isMobileSidebarOpen, isDesktopSidebarExpanded, closeMobileSidebar, collapseDesktopSidebar, expandDesktopSidebar]);
    const handleClickOutside = useCallback((event: MouseEvent) => { if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) { if (isMobile && isMobileSidebarOpen) { console.log("[DEBUG] handleClickOutside: Closing mobile sidebar"); closeMobileSidebar(); } } }, [isMobile, isMobileSidebarOpen, closeMobileSidebar]);
    const handleSelectThread = useCallback((threadId: string) => { console.log("[DEBUG] handleSelectThread:", threadId); if (threadId !== currentThreadId) { setApiError(null); setCreateThreadError(null); navigate(location.pathname, { replace: true, state: { threadId: threadId } }); if (isMobile) closeMobileSidebar(); } else { if (isMobile) closeMobileSidebar(); } }, [currentThreadId, isMobile, closeMobileSidebar, navigate, location.pathname]);
    const handlePromptClick = useCallback((prompt: string) => { console.log("[DEBUG] handlePromptClick:", prompt); if (!currentThreadId) { handleCreateNewThread(false).then((newId) => { if (newId) { requestAnimationFrame(() => handleSendMessage(prompt)); } }); } else { handleSendMessage(prompt); } }, [currentThreadId, handleCreateNewThread, handleSendMessage]);
    const handleInputChange = useCallback((value: string) => setInputMessage(value), []);
    const openSharePopup = () => { console.log("[DEBUG] openSharePopup"); setIsSharePopupOpen(true); };

    // --- Effects ---
    useEffect(() => {
        console.log("[DEBUG] Auth Effect: userLoading=", userLoading, "session=", !!session);
        if (!userLoading && !session) {
            console.log("[DEBUG] Auth Effect: Redirecting to login.");
            navigate('/', { replace: true });
        }
    }, [session, userLoading, navigate]);

    // Initial Load / Thread Change Effect
    useEffect(() => {
        const effectId = Date.now(); // ID for tracking specific effect run
        console.log(`[DEBUG] Load Effect (${effectId}): START. isInitialMount=`, isInitialMount.current, "chatLoading=", chatLoading);
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) {
            console.log(`[DEBUG] Load Effect (${effectId}): Exiting early (no user or user loading).`);
            setChatLoading(false);
            return;
        }
        const threadIdFromState = location.state?.threadId;
        console.log(`[DEBUG] Load Effect (${effectId}): User=${currentUserId}, UserLoading=${userLoading}, State Thread=${threadIdFromState}, Current Thread=${currentThreadId}`);

        // Prevent redundant reloads
         if (threadIdFromState === currentThreadId && !isInitialMount.current && !chatLoading) {
             console.log(`[DEBUG] Load Effect (${effectId}): Thread ID unchanged and not initial mount/loading, skipping reload.`);
             return;
         }

        const initializeChat = async () => {
            console.log(`[DEBUG] Load Effect (${effectId}): Initializing Chat... Setting chatLoading=true`);
            setChatLoading(true); setMessages([]); setApiError(null);
            setCreateThreadError(null); setPlaceholderType(null);

            if (threadIdFromState) {
                console.log(`[DEBUG] Load Effect (${effectId}): Loading thread from state:`, threadIdFromState);
                if (threadIdFromState !== currentThreadId) {
                     console.log(`[DEBUG] Load Effect (${effectId}): Setting currentThreadId state.`);
                    setCurrentThreadId(threadIdFromState);
                }
                try {
                    console.log(`[DEBUG] Load Effect (${effectId}): Fetching messages from DB for thread`, threadIdFromState);
                    const { data: existingMessages, error: messagesError } = await supabase
                        .from('messages')
                        .select('*, metadata')
                        .eq('thread_id', threadIdFromState)
                        .order('created_at', { ascending: true });

                    if (messagesError) {
                        console.error(`[DEBUG] Load Effect (${effectId}): DB error fetching messages:`, messagesError);
                        throw messagesError;
                    }
                    console.log(`[DEBUG] Load Effect (${effectId}): DB fetch success, ${existingMessages.length} messages found.`);

                    const formatted = existingMessages.map((msg, idx) => {
                        // console.log(`[DEBUG] Load Effect (${effectId}): Formatting message ${idx}:`, msg); // Can be very verbose
                        return {
                            id: msg.id, content: msg.content ?? '', isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant',
                            timestamp: "", created_at: msg.created_at,
                            isToolCall: (msg.metadata as any)?.isToolCall ?? false, toolResultContent: (msg.metadata as any)?.toolResultContent ?? null,
                            isPending: false, isError: (msg.metadata as any)?.isError ?? false,
                        };
                    });

                    console.log(`[DEBUG] Load Effect (${effectId}): Setting messages state. Count=`, formatted.length);
                    setMessages(formatted);
                    const newPlaceholder = formatted.length === 0 ? 'new_thread' : null;
                    console.log(`[DEBUG] Load Effect (${effectId}): Setting placeholder type:`, newPlaceholder);
                    setPlaceholderType(newPlaceholder);
                    console.log(`[DEBUG] Load Effect (${effectId}): Setting chatLoading=false.`);
                    setChatLoading(false);
                    requestAnimationFrame(() => {
                        console.log(`[DEBUG] Load Effect (${effectId}): Requesting scroll after render.`);
                        scrollToBottom('auto');
                    });
                } catch (error: any) {
                    console.error(`[DEBUG] Load Effect (${effectId}): Error loading thread messages:`, error);
                    setMessages([]); setCurrentThreadId(null);
                    navigate(location.pathname, { replace: true, state: {} }); // Clear URL state
                    setCreateThreadError(`Failed to load chat: ${error.message}`);
                    setChatLoading(false); setPlaceholderType(null);
                }
            } else {
                console.log(`[DEBUG] Load Effect (${effectId}): No thread in state, creating new one...`);
                await handleCreateNewThread(false); // Let this handle state updates including chatLoading=false
                console.log(`[DEBUG] Load Effect (${effectId}): Finished creating new thread.`);
            }
             console.log(`[DEBUG] Load Effect (${effectId}): Setting isInitialMount=false.`);
             isInitialMount.current = false; // Mark initial setup as done
        };
        initializeChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [session?.user?.id, userLoading, location.state?.threadId]); // Key dependencies

    // Scroll on new message effect (separate from load)
    useEffect(() => {
         console.log("[DEBUG] Scroll Effect Triggered: chatLoading=", chatLoading, "messages.length=", messages.length, "isInitialMount=", isInitialMount.current);
         if (!chatLoading && messages.length > 0) {
             // Use 'auto' only if the initial mount ref is still true (should be handled by load effect now, but safe check)
             const scrollBehavior = isInitialMount.current ? 'auto' : 'smooth';
             console.log("[DEBUG] Scroll Effect: Calling scrollToBottom with behavior:", scrollBehavior);
             scrollToBottom(scrollBehavior);
         }
    }, [messages, chatLoading, scrollToBottom]);


    // Mobile sidebar outside click handler effect
    useEffect(() => {
        const handler = (event: MouseEvent) => handleClickOutside(event);
        if (isMobile && isMobileSidebarOpen) {
            console.log("[DEBUG] Attaching outside click listener for mobile sidebar.");
            document.addEventListener('mousedown', handler);
        } else {
            console.log("[DEBUG] Removing outside click listener for mobile sidebar.");
            document.removeEventListener('mousedown', handler);
        }
        return () => {
             console.log("[DEBUG] Cleanup: Removing outside click listener.");
            document.removeEventListener('mousedown', handler);
        };
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Render Logic ---
    if (userLoading && !session) {
        console.log("[DEBUG] Render: Showing 'Loading User...'");
        return <div className="flex items-center justify-center h-screen bg-background text-primary">Loading User...</div>;
    }

    const isLoading = chatLoading; // Only true during initial load/create
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;
    const aiDisabled = !GEMINI_API_KEY;
    const searchDisabled = !LINKUP_API_KEY;

    console.log("[DEBUG] Render: isLoading=", isLoading, "showAnyPlaceholder=", showAnyPlaceholder, "placeholderType=", placeholderType, "showAnyError=", showAnyError, "errorText=", errorText, "showMessagesList=", showMessagesList, "messages.length=", messages.length);

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
                        {/* Loading Indicator */}
                        {isLoading && <div className="flex justify-center items-center p-10 text-muted-foreground flex-1"> <Loader2 className="w-6 h-6 animate-spin mr-2" /> Loading Chat... </div>}
                        {/* Placeholders */}
                        {showAnyPlaceholder && placeholderType === 'initial' && <div className="flex-1 flex items-center justify-center w-full"><InitialPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {showAnyPlaceholder && placeholderType === 'new_thread' && <div className="flex-1 flex items-center justify-center w-full"><NewThreadPlaceholder onPromptClick={handlePromptClick} /></div>}
                        {/* Top-level Error Display */}
                        {showAnyError && <div className="flex-1 flex items-center justify-center w-full"><div className='flex flex-col items-center text-center text-red-600 p-4 bg-red-100 rounded-lg max-w-md border border-red-300'><AlertCircle className="w-8 h-8 mb-3 text-red-500" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div></div>}

                        {/* Render Actual Messages */}
                        {showMessagesList && (
                            <div className="w-full space-y-4 md:space-y-5">
                                {messages.map((m, idx) => {
                                     // console.log(`[DEBUG] Render: Rendering message ${idx}, ID: ${m.id}, Role: ${m.role}, isPending: ${m.isPending}, isError: ${m.isError}, isToolCall: ${m.isToolCall}`); // Very verbose
                                    // Render normal user/AI messages (finalized)
                                    if (!m.isPending && !m.isError && !m.isToolCall) {
                                        return <ChatMessage key={m.id} message={m.content} isUser={m.isUser} senderName={m.isUser ? (userName || 'You') : 'Parthavi'} />;
                                    }
                                    // Render pending AI text message (streaming)
                                    else if (m.isPending && !m.isToolCall && !m.isError) {
                                        return <ChatMessage key={m.id} message={m.content || "..."} isUser={false} senderName={'Parthavi'} isPending={true} />;
                                    }
                                    // Render tool call status message
                                     else if (m.isToolCall) {
                                         return (
                                             <div key={m.id} className="text-xs text-muted-foreground italic text-center py-2 my-1 flex items-center justify-center gap-2">
                                                 <Search size={12}/> {m.content} {/* Content holds the status/summary */}
                                                 {m.isPending && <Loader2 size={12} className="animate-spin"/>}
                                             </div>
                                         );
                                     }
                                     // Render inline errors distinctly
                                     else if (m.isError) {
                                         return <div key={m.id} className="text-sm text-destructive text-center py-2 px-4 bg-destructive/10 rounded my-2 mx-auto max-w-md">{m.content}</div>
                                     }
                                     return null; // Should not reach here
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
                            isResponding={isResponding || chatLoading || aiDisabled} // Disable input when busy/loading/AI disabled
                         />
                        {/* API Key Warnings */}
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
