import React from 'react';
import { motion } from 'framer-motion';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  timestamp?: string;
}

const ChatMessage: React.FC<ChatMessageProps> = ({ message, isUser, timestamp }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}
    >
      <div
        className={`max-w-[80%] rounded-lg px-4 py-2 ${
          isUser
            ? 'bg-primary text-white rounded-br-none'
            : 'bg-gray-100 text-secondary rounded-bl-none'
        }`}
      >
        <p className="text-sm md:text-base">{message}</p>
        {timestamp && (
          <p className={`text-xs mt-1 ${isUser ? 'text-white/70' : 'text-gray-500'}`}>
            {timestamp}
          </p>
        )}
      </div>
    </motion.div>
  );
};

export default ChatMessage;