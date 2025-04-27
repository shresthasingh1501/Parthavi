import React from 'react'; // Import React
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
}

// Use React.memo to prevent re-renders if props haven't changed
const ChatMessage: React.FC<ChatMessageProps> = React.memo(({
    message,
    isUser,
}) => {

  console.log(`Rendering ChatMessage: ${isUser ? 'User' : 'AI'} - ${message.substring(0, 10)}`); // Add log to see when it renders

  const messageBlockVariants = {
    hidden: { opacity: 0, y: 8 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.6, ease: "easeOut" }
    },
  };

  return (
    <motion.div
      // Key should ideally be stable. Use the message id which is updated post-save.
      // Using Date.now() here was likely contributing to re-renders. Stick to message.id.
      // key={message.id} // Assuming message.id becomes stable after background save (or is stable from initial load)
      layout // Enable smooth layout changes
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      className={clsx(
          'flex w-full mb-4 md:mb-5',
          isUser ? 'justify-end pl-6 md:pl-10 lg:pl-20' : 'justify-start pr-6 md:pr-10 lg:pr-20'
        )}
    >
        {isUser ? (
          <div className="bg-[#F7F1E8] rounded-xl px-4 py-2.5 text-secondary shadow-sm max-w-[85%] sm:max-w-[75%]">
            <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message}</p>
          </div>
        ) : (
          <div className="max-w-[85%] sm:max-w-[75%]">
             <p
                className="text-sm md:text-base text-secondary whitespace-pre-wrap break-words min-h-[1.5em] bg-gray-100/70 rounded-xl px-4 py-2.5 shadow-sm"
                style={{ lineHeight: '1.6' }}
            >
                {message}
            </p>
          </div>
        )}
    </motion.div>
  );
}); // Close React.memo HOC

// Set display name for better debugging in React DevTools
ChatMessage.displayName = 'ChatMessage';

export default ChatMessage;
