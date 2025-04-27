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
    hidden: { opacity: 0, y: 6 }, // Slightly less y offset
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" } // Slightly faster
    },
  };

   const textContentVariants = {
      initial: { opacity: 0.6, x: -4 }, // Slightly less x offset
      animate: { opacity: 1, x: 0 },
      transition: { duration: 0.2, ease: "linear" } // Faster linear transition for text
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
      // --- CHANGE: Reduced bottom margin ---
      className={clsx(
          'flex w-full mb-2 md:mb-2.5', // Reduced mb-4/md:mb-5
          isUser ? 'justify-end pl-4 md:pl-8 lg:pl-16' : 'justify-start pr-4 md:pr-8 lg:pr-16' // Slightly less padding if needed
        )}
    >
      <div className={clsx(
          "rounded-xl px-3.5 py-2 md:px-4 md:py-2.5 shadow-sm max-w-[85%] sm:max-w-[80%]", // Slightly increased max-w potentially
          isUser ? "bg-[#F7F1E8] text-secondary" : "bg-gray-100/80 text-secondary" // Made AI bubble slightly more opaque
      )}>
        <motion.div
           key={messageContent.length}
           initial="initial"
           animate="animate"
           variants={textContentVariants}
           transition={textContentVariants.transition}
           className={clsx(
               "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words", // Slightly smaller base text? Adjust if needed
               !isUser && "prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0.5 prose-strong:text-secondary"
           )}
           style={{ lineHeight: '1.55' }} // Slightly tighter line height
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
