// src/components/chat/ChatMessage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isUser,
}) => {

  const messageBlockVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3, ease: "easeOut" }
    },
  };

  return (
    <motion.div
      key={message.substring(0,10) + (isUser ? '-user' : '-ai')}
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      // Added responsive padding pl/pr
      className={clsx(
          'flex w-full mb-4 md:mb-5',
          isUser ? 'justify-end pl-6 md:pl-10 lg:pl-20' : 'justify-start pr-6 md:pr-10 lg:pr-20' // Adjusted padding
        )}
    >
        {/* User message bubble: Use new secondary text, kept custom bg */}
        {isUser ? (
          // Max width is responsive
          <div className="bg-[#F7F1E8] rounded-lg px-4 py-2.5 text-secondary shadow-sm max-w-[85%] sm:max-w-[75%]">
            {/* Text size is responsive */}
            <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message}</p>
          </div>
        ) : (
          // AI message text: Use new secondary text
           // Max width is responsive
          <div className="max-w-[85%] sm:max-w-[75%]">
             {/* Text size is responsive */}
             <p
                className="text-sm md:text-base text-secondary whitespace-pre-wrap break-words min-h-[1.5em]" // Changed text color
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
