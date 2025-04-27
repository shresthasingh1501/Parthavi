// src/components/chat/ChatMessage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, isUser }) => {

  const messageBlockVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

   const textContentVariants = {
      initial: { opacity: 0.6, x: -4 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.2, ease: "linear" }
   };

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
          'flex w-full mb-2 md:mb-2.5', // Keep reduced spacing between bubbles
          isUser ? 'justify-end pl-4 md:pl-8 lg:pl-16' : 'justify-start pr-4 md:pr-8 lg:pr-16'
        )}
    >
      {/* Bubble container: Adjust max-width for user vs AI */}
      <div className={clsx(
          "rounded-xl px-3.5 py-2 md:px-4 md:py-2.5 shadow-sm", // Base padding
          isUser
            ? "bg-[#F7F1E8] text-secondary max-w-[85%] sm:max-w-[80%]" // User max-width
            // --- CHANGE: Increased max-width for AI bubbles ---
            : "bg-gray-100/80 text-secondary max-w-[95%] sm:max-w-[90%]" // AI max-width increased
      )}>
        {/* Motion wrapper for text content */}
        <motion.div
           key={messageContent.length}
           initial="initial"
           animate="animate"
           variants={textContentVariants}
           transition={textContentVariants.transition}
           // --- CHANGE: Added more prose utilities for tighter spacing ---
           className={clsx(
               "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words",
               !isUser && `
                 prose prose-sm max-w-none
                 prose-p:my-1 md:prose-p:my-1.5
                 prose-ul:my-1 md:prose-ul:my-1.5
                 prose-ol:my-1 md:prose-ol:my-1.5
                 prose-li:my-0.5
                 prose-headings:my-2 md:prose-headings:my-2.5
                 prose-blockquote:my-1
                 prose-pre:my-2 prose-pre:p-2
                 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:bg-gray-200/70 prose-code:text-xs
                 prose-strong:text-secondary
                 prose-a:text-primary hover:prose-a:underline
                 dark:prose-invert
                 dark:prose-code:bg-gray-700/50
               ` // Add spacing overrides for dark mode if needed
           )}
           style={{ lineHeight: '1.6' }} // Adjusted line height slightly
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messageContent}
          </ReactMarkdown>
        </motion.div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
