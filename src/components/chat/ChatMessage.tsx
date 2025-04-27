// src/components/chat/ChatMessage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';
// Import Markdown renderer
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm'; // For GitHub Flavored Markdown (lists, bold, etc.)

interface ChatMessageProps {
  message: string; // Content of the message (can be markdown)
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, isUser }) => {
  // console.log(`Rendering ChatMessage: ${isUser ? 'User' : 'AI'} - ${message.substring(0, 15)}...`);

  // Animation for the whole message block
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" }
    },
  };

   // Animation for the text content itself when it updates (for streaming)
   const textContentVariants = {
      initial: { opacity: 0.6, x: -5 },
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.25, ease: "easeOut" }
   };

   // --- Defensively ensure message is a string ---
   const messageContent = typeof message === 'string' ? message : '';
   if (typeof message !== 'string') {
       console.warn(`ChatMessage received non-string message prop: type=${typeof message}, value=`, message);
   }
   // --- End defensive check ---

  return (
    <motion.div
      layout
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      className={clsx(
          'flex w-full mb-4 md:mb-5',
          isUser ? 'justify-end pl-6 md:pl-10 lg:pl-20' : 'justify-start pr-6 md:pr-10 lg:pr-20'
        )}
    >
      {/* Styling based on user or AI */}
      <div className={clsx(
          "rounded-xl px-4 py-2.5 shadow-sm max-w-[85%] sm:max-w-[75%]",
          isUser ? "bg-[#F7F1E8] text-secondary" : "bg-gray-100/70 text-secondary"
      )}>
        {/* Motion wrapper for text content animation */}
        <motion.div
           key={messageContent.length} // Key based on sanitized content length
           initial="initial"
           animate="animate"
           variants={textContentVariants}
           transition={textContentVariants.transition}
           className={clsx(
               "text-sm md:text-base whitespace-pre-wrap break-words",
               !isUser && "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-secondary"
           )}
           style={{ lineHeight: '1.6' }}
        >
          {/* Render using ReactMarkdown */}
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
