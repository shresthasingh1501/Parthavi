// src/pages/ChatPage.tsx

// ... other imports ...
import { GoogleGenAI, Content, Part, Role, GenerateContentResponse, SystemInstruction } from "@google/genai";
// ... rest of imports ...


// --- System Instruction ---
// Define the persistent instructions for the AI model

// Make sure this text block doesn't have template literal backticks ` ` around it
// if you copy-paste, just the raw string content.
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

// Format for the API (SystemInstruction can often take a simple 'parts' array)
// Adjust if the specific API structure requires a 'role' property here.
// Most implementations treat this separately or imply the 'system' role.
const systemInstructionObject: SystemInstruction = { // Or use 'Content' type if that's more accurate for your SDK version
    // role: 'system', // Sometimes needed, sometimes implied. Check SDK docs if error occurs.
    parts: [{ text: SYSTEM_INSTRUCTION_TEXT }],
};


// --- Component ---
const ChatPage = () => {
    // ... existing state, refs, hooks ...

    const handleSendMessage = useCallback(async (text: string) => {
        // ... existing checks ...
        if (!genAI) { setApiError("AI Client not configured."); return; }
        const currentThread = currentThreadId;
        if (!currentThread || isResponding || !session?.user) return;
        const trimmedText = text.trim(); if (!trimmedText) return;

        setPlaceholderType(null);
        setCreateThreadError(null); setApiError(null);
        const userId = session.user.id;
        setIsResponding(true); setInputMessage('');

        const tempUserMsgId = `temp-user-${Date.now()}`;
        const optimisticUserMsg: DisplayMessage = { id: tempUserMsgId, content: trimmedText, isUser: true, role: 'user', timestamp: "", created_at: new Date().toISOString() };
        const historyForApi = formatChatHistoryForGemini([...messages, optimisticUserMsg]);
        setMessages(prev => [...prev, optimisticUserMsg]);
        scrollToBottom('smooth');

        const userMessagePayload: MessagePayload = { thread_id: currentThread, content: trimmedText, role: 'user', user_id: userId };
        saveMessageToDb(userMessagePayload).catch(err => console.error("Error saving user message:", err));

        const tempAiMsgId = `temp-ai-${Date.now()}`;
        const optimisticAiMsg: DisplayMessage = { id: tempAiMsgId, content: '', isUser: false, role: 'assistant', timestamp: "", created_at: new Date().toISOString() };
        setMessages(prev => [...prev, optimisticAiMsg]);

        try {
            // --- ADD systemInstruction to the request payload ---
            const requestPayload = {
                model: MODEL_NAME,
                contents: historyForApi,
                systemInstruction: systemInstructionObject, // <-- Pass the system instruction here
                config: { responseMimeType: 'text/plain' },
            };
            // --- End change ---

            if (!genAI) throw new Error("Gemini AI Client lost.");
            const result = await genAI.models.generateContentStream(requestPayload);

            let accumulatedResponse = "";
            let streamSource: AsyncIterable<GenerateContentResponse> | null = null;

            if (result && typeof result[Symbol.asyncIterator] === 'function') streamSource = result;
            else if (result && result.stream && typeof result.stream[Symbol.asyncIterator] === 'function') streamSource = result.stream;
            else throw new Error(`Unexpected API response structure: ${JSON.stringify(result).substring(0,100)}...`);

            if (streamSource) {
                for await (const chunk of streamSource) {
                    const chunkText = chunk?.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (chunkText) {
                        accumulatedResponse += chunkText;
                        setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: accumulatedResponse } : msg));
                    }
                }
            }
            scrollToBottom('smooth');

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
            setMessages(prev => prev.map(msg => msg.id === tempAiMsgId ? { ...msg, content: `Error: ${errorMessage}` } : msg));
            scrollToBottom('smooth');
        } finally { setIsResponding(false); }
    }, [currentThreadId, isResponding, session, messages, scrollToBottom]); // Added systemInstructionObject if it were dynamic

    // ... rest of the component code (effects, handlers, JSX) remains exactly the same ...
    // --- Effects ---
    useEffect(() => { if (!userLoading && !session) navigate('/', { replace: true }); }, [session, userLoading, navigate]);

    useEffect(() => {
        const currentUserId = session?.user?.id;
        if (!currentUserId || userLoading) { setChatLoading(false); return; }
        const threadIdFromState = location.state?.threadId;
        console.log("Load Effect: User=", currentUserId, "Loading=", userLoading, "State Thread=", threadIdFromState);

        const initializeChat = async () => {
             setChatLoading(true); setMessages([]); setApiError(null);
             setCreateThreadError(null); setPlaceholderType(null);
             isInitialMount.current = true;

            if (threadIdFromState) {
                console.log("Load Effect: Loading thread from state:", threadIdFromState);
                setCurrentThreadId(threadIdFromState);
                 try {
                    const { data: existingMessages, error: messagesError } = await supabase.from('messages').select('*').eq('thread_id', threadIdFromState).order('created_at', { ascending: true });
                    if (messagesError) throw messagesError;
                    const formatted = existingMessages.map(msg => ({ id: msg.id, content: msg.content ?? '', isUser: msg.role === 'user', role: msg.role as 'user' | 'assistant', timestamp: "", created_at: msg.created_at }));
                    setMessages(formatted);
                    setPlaceholderType(formatted.length === 0 ? 'new_thread' : null);
                    console.log("Load Effect: Messages loaded, count=", formatted.length, "Placeholder=", formatted.length === 0 ? 'new_thread' : null);
                    setChatLoading(false);
                    requestAnimationFrame(() => {
                         scrollToBottom('auto');
                         isInitialMount.current = false;
                    });
                } catch (error: any) {
                    console.error("Load Effect: Error loading messages:", error);
                    setMessages([]); setCreateThreadError(`Failed to load chat: ${error.message}`); setChatLoading(false);
                    setPlaceholderType(null);
                    isInitialMount.current = false;
                }
            } else {
                console.log("Load Effect: No thread in state, creating new one.");
                await handleCreateNewThread(false);
                isInitialMount.current = false;
            }
        };
        initializeChat();
    }, [session?.user?.id, userLoading, location.state?.threadId, handleCreateNewThread]); // Added handleCreateNewThread dep

    useEffect(() => {
        if (!isInitialMount.current && messages.length > 0) {
             scrollToBottom('smooth');
        }
    }, [messages, scrollToBottom]);

    useEffect(() => {
        if (isMobile && isMobileSidebarOpen) document.addEventListener('mousedown', handleClickOutside);
        else document.removeEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isMobile, isMobileSidebarOpen, handleClickOutside]);


    // --- Render Logic ---
    if (userLoading && !session) return <div className="flex items-center justify-center h-screen bg-background">Loading User...</div>;

    const isLoading = chatLoading;
    const showAnyPlaceholder = !isLoading && messages.length === 0 && !createThreadError && !apiError && (placeholderType !== null);
    const showAnyError = !isLoading && (!!createThreadError || !!apiError);
    const errorText = apiError || createThreadError || "";
    const showMessagesList = !isLoading && !showAnyPlaceholder && !showAnyError;

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
                        {showAnyError && <div className="flex-1 flex items-center justify-center w-full"><div className='flex flex-col items-center text-center text-red-500 p-4 bg-red-50 rounded-lg max-w-md'><AlertCircle className="w-8 h-8 mb-3 text-red-400" /><p className="font-medium mb-1">Oops!</p><p className="text-sm">{errorText}</p></div></div>}
                        {showMessagesList && <div className="w-full space-y-2 md:space-y-3">{messages.map((m) => <ChatMessage key={m.id} message={m.content} isUser={m.isUser} />)}</div>}
                    </div>
                </div>
                <div className="px-4 md:px-10 lg:px-16 xl:px-20 pb-6 pt-2 bg-background border-t border-gray-200/60 flex-shrink-0">
                    <div className="max-w-4xl mx-auto">
                        <ChatInput value={inputMessage} onChange={handleInputChange} onSendMessage={handleSendMessage} isResponding={isResponding || chatLoading || (!genAI && !API_KEY)} />
                         {!genAI && !API_KEY && ( <p className="text-xs text-red-500 mt-2 text-center px-4"> AI functionality is disabled. Missing API Key. </p> )}
                    </div>
                </div>
            </main>
            <SharePopup isOpen={isSharePopupOpen} onClose={() => setIsSharePopupOpen(false)} />
        </div>
    );
};

export default ChatPage;
