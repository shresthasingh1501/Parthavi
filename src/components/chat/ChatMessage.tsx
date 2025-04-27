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

  // Animation for the message block remains useful for entry/layout
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: "easeOut" }
    },
  };

  // Text animation can still apply
  const textContentVariants = {
    initial: { opacity: 0.8 }, // Simpler fade-in for text
    animate: { opacity: 1 },
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
          'flex w-full mb-3 md:mb-4', // Slightly increased margin between messages now there's no bubble
          isUser ? 'justify-end pl-8 md:pl-12 lg:pl-20' : 'justify-start pr-8 md:pr-12 lg:pr-20' // Adjust padding if needed
        )}
    >
      {/* --- REMOVED the inner div that had the background color --- */}
      {/* Apply max-width directly to the content wrapper */}
      <motion.div
          key={messageContent.length} // Still useful for text animation trigger
          initial="initial"
          animate="animate"
          variants={textContentVariants}
          transition={textContentVariants.transition}
          // --- Apply max-width and text color here ---
          className={clsx(
              "max-w-[90%]", // General max-width for both user/ai text blocks
              "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words",
              isUser ? "text-secondary" : "text-secondary", // Use secondary text color for both (or differentiate if desired)
              // Apply prose for markdown styling, adjust margins if needed
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
          {/* Render the markdown content */}
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messageContent}
          </ReactMarkdown>
      </motion.div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
