import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  isLastMessage?: boolean;
  onAnimationComplete?: () => void;
}

const ChatMessage: React.FC<ChatMessageProps> = ({
    message,
    isUser,
    isLastMessage = false,
    onAnimationComplete
}) => {
  // State to track when the internal "typing" is complete for AI message
  const [isReadyToDisplay, setIsReadyToDisplay] = useState(isUser || !isLastMessage);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const animationCompletedRef = useRef(false);

  useEffect(() => {
    // Reset state for new messages or non-target messages
    setIsReadyToDisplay(isUser || !isLastMessage);
    animationCompletedRef.current = false;
    if (intervalRef.current) clearInterval(intervalRef.current);

    // Simulate internal typing only for the last AI message
    if (!isUser && isLastMessage) {
        const characters = message.split('');
        // Calculate estimated typing duration based on message length
        const typingDuration = characters.length * 25; // Same speed as before

        // Set a timeout to mark as ready after the estimated duration
        intervalRef.current = setTimeout(() => {
            setIsReadyToDisplay(true); // Trigger the fade-in animation
            if (onAnimationComplete && !animationCompletedRef.current) {
                onAnimationComplete();
                animationCompletedRef.current = true;
            }
        }, typingDuration);
    }

    // Cleanup timeout on unmount or before re-running
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [message, isUser, isLastMessage, onAnimationComplete]);


  // Animation for the message block itself
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.35, ease: [0.4, 0, 0.2, 1] }
    },
  };

  // Animation for the text content fading in
  const textFadeInVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.4, delay: 0.05 } }, // Slight delay after block appears
  };

  return (
    <motion.div
      key={message}
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      layout="position"
      className={clsx('flex w-full mb-4 md:mb-5', isUser ? 'justify-end' : 'justify-start')}
    >
        {isUser ? (
          // User message block
          <div className="bg-muted/70 rounded-lg px-4 py-2.5 text-secondary shadow-sm max-w-[85%] sm:max-w-[75%]">
            <p className="text-sm md:text-base whitespace-pre-wrap break-words">{message}</p>
          </div>
        ) : (
          // AI message block
          <div className="px-1 py-1 max-w-[85%] sm:max-w-[75%]">
            {/* Use motion.p for the text fade-in, controlled by isReadyToDisplay */}
            <motion.p
                key="ai-text-content" // Key for Framer Motion
                variants={textFadeInVariants}
                initial="hidden"
                animate={isReadyToDisplay ? "visible" : "hidden"}
                className="text-sm md:text-base text-secondary whitespace-pre-wrap break-words min-h-[1.5em]" // min-h prevents jumpiness
            >
                {/* Render the full message text */}
                {message}
            </motion.p>
          </div>
        )}
    </motion.div>
  );
};

export default ChatMessage;
