// src/components/chat/ChatMessage.tsx
// Use the simplified version WITHOUT internal delays
import React from 'react';
import { motion } from 'framer-motion'; // Import motion
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isUser,
}) => {

  // Simple fade-in animation for the message block
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
  };

  return (
    // Apply motion directly to the message block container
    <motion.div
      key={message.substring(0,10) + (isUser ? '-user' : '-ai')} // Key helps framer-motion identify element
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      // layout // Optional: enable if list reordering/insertions look jumpy
      className={clsx(
          'flex w-full mb-4 md:mb-5', // Standard bottom margin
          isUser ? 'justify-end pl-10 sm:pl-20' : 'justify-start pr-10 sm:pr-20' // Align left/right
        )}
    >
        {/* --- Content Styling --- */}
        {isUser ? (
          // User message bubble styling
          <div className="bg-[#F7F1E8] rounded-lg px-4 py-2.5 text-secondary shadow-sm max-w-[85%] sm:max-w-[75%]">
            <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message}</p>
          </div>
        ) : (
          // AI message text styling
          <div className="max-w-[85%] sm:max-w-[75%]">
             <p
                className="text-sm md:text-base text-[#3D3A3A] whitespace-pre-wrap break-words min-h-[1.5em]"
                style={{ lineHeight: '1.6' }}
            >
                {message}
            </p>
          </div>
        )}
    </motion.div>
  );
};

export default ChatMessage;
