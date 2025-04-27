// src/components/chat/ChatMessage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  senderName?: string | null;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, isUser, senderName }) => {

  // Entry animation for the whole block
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: "easeOut" }
    },
  };

   // --- Animation for the text content - Simple Fade-In ---
   // This will trigger once when 'messageContent' changes from "" to the full text
   const textContentVariants = {
      initial: { opacity: 0 }, // Start fully transparent
      animate: { opacity: 1 },   // Fade to full opacity
      transition: { duration: 0.4, ease: "easeOut" } // Control fade duration/easing
   };
   // --- End Animation ---

   const messageContent = typeof message === 'string' ? message : '';
   if (typeof message !== 'string') {
       console.warn(`ChatMessage received non-string message prop: type=${typeof message}, value=`, message);
   }

  return (
    <motion.div
      layout
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      className={clsx(
          'flex w-full mb-4 md:mb-5',
          isUser ? 'justify-end pl-8 md:pl-12 lg:pl-20' : 'justify-start pr-8 md:pr-12 lg:pr-20'
        )}
    >
      <div className={clsx("flex flex-col", isUser ? 'items-end' : 'items-start', "max-w-[90%]")}>
        {senderName && (
          <div className={clsx( "text-xs font-medium mb-1", isUser ? "text-primary/80" : "text-gray-500" )}>
            {senderName}
          </div>
        )}
        {/* Apply animation to the content wrapper */}
        <motion.div
           // --- REMOVED key={messageContent.length} ---
           // We want animation based on presence of content, not length change
           initial="initial"
           animate="animate"
           variants={textContentVariants}
           transition={textContentVariants.transition}
           className={clsx(
               "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words",
               isUser ? "text-secondary" : "text-secondary",
               !isUser && `
                 prose prose-sm max-w-none
                 prose-p:my-1 md:prose-p:my-1.5
                 prose-ul:my-1 md:prose-ul:my-1.5
                 prose-ol:my-1 md:prose-ol:my-1.5
                 prose-li:my-0.5
                 prose-headings:my-2 md:prose-headings:my-2.5
                 prose-blockquote:my-1 prose-blockquote:pl-3 prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:text-secondary/80
                 prose-pre:my-2 prose-pre:p-3 prose-pre:bg-gray-100/70 prose-pre:rounded-md prose-pre:text-xs
                 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:bg-gray-200/70 prose-code:text-xs
                 prose-strong:text-secondary
                 prose-a:text-primary hover:prose-a:underline
               `
           )}
           style={{ lineHeight: '1.6' }}
        >
          {/* Render only if there's actual content to prevent empty flashes */}
          {messageContent ? (
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {messageContent}
             </ReactMarkdown>
           ) : (
              // Optional: Render a subtle loading indicator while content is empty
              // Only show if this is an AI message that's currently responding
              !isUser && <span className="text-gray-400 text-xs">Parthavi is thinking...</span>
           )}
        </motion.div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
