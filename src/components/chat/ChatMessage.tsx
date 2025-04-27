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

  // Animations
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 4 }, // Even less y offset
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" } // Quicker block entry
    },
  };
  const textContentVariants = {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.35, ease: "easeOut" } // Slightly longer fade for text
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
      // --- CHANGE: Significantly reduced bottom margin ---
      className={clsx(
          'flex w-full mb-1.5 md:mb-2', // Reduced from mb-4/md:mb-5
          isUser ? 'justify-end pl-8 md:pl-12 lg:pl-20' : 'justify-start pr-8 md:pr-12 lg:pr-20'
        )}
    >
      {/* Wrapper for name + message */}
      <div className={clsx("flex flex-col", isUser ? 'items-end' : 'items-start', "max-w-[90%]")}>

        {/* Sender Name */}
        {senderName && (
          <div className={clsx( "text-xs font-medium mb-0.5", // Reduced margin below name
            isUser ? "text-primary/80" : "text-gray-500" )}>
            {senderName}
          </div>
        )}

        {/* Message Content */}
        <motion.div
           initial="initial"
           animate="animate"
           variants={textContentVariants}
           transition={textContentVariants.transition}
           // --- CHANGE: Aggressive prose spacing reduction ---
           className={clsx(
               "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words",
               isUser ? "text-secondary" : "text-secondary",
               !isUser && `
                 prose prose-sm max-w-none
                 prose-p:my-0.5 md:prose-p:my-0.5         # Greatly reduced paragraph margin
                 prose-ul:my-0.5 md:prose-ul:my-1         # Reduced list margin
                 prose-ol:my-0.5 md:prose-ol:my-1         # Reduced list margin
                 prose-li:my-0                            # No margin for list items
                 prose-headings:mt-1.5 prose-headings:mb-0.5 # Reduced heading margins
                 prose-blockquote:my-1 prose-blockquote:pl-3 prose-blockquote:border-l-2 prose-blockquote:border-primary/30 prose-blockquote:text-secondary/80
                 prose-hr:my-1.5                           # Reduced horizontal rule margin
                 prose-pre:my-1.5 prose-pre:p-2 prose-pre:text-xs # Reduced code block margin
                 prose-code:px-1 prose-code:py-0.5 prose-code:rounded-sm prose-code:bg-gray-200/70 prose-code:text-xs
                 prose-strong:text-secondary
                 prose-a:text-primary hover:prose-a:underline
               `
           )}
           style={{ lineHeight: '1.5' }} // Tighter line height
        >
          {/* Render only if there's actual content */}
          {messageContent ? (
             <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {messageContent}
             </ReactMarkdown>
           ) : (
              !isUser && <span className="text-gray-400 text-xs italic">Thinking...</span> // Adjusted thinking indicator
           )}
        </motion.div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
