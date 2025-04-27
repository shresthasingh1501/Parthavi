import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { clsx } from 'clsx';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface ChatMessageProps {
  message: string;
  isUser: boolean;
  senderName?: string | null; // Added optional sender name prop
}

const ChatMessage: React.FC<ChatMessageProps> = React.memo(({ message, isUser, senderName }) => {
  // Animations remain the same
  const messageBlockVariants = {
    hidden: { opacity: 0, y: 6 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
  };

  const messageContent = typeof message === 'string' ? message : '';
  if (typeof message !== 'string') {
       console.warn(`ChatMessage received non-string message prop: type=${typeof message}, value=`, message);
  }

  // Only apply the word-by-word animation for AI messages
  const [displayedContent, setDisplayedContent] = useState(isUser ? messageContent : '');
  const [isAnimating, setIsAnimating] = useState(!isUser);
  const wordsRef = useRef<string[]>([]);
  const currentIndexRef = useRef(0);
  const animationSpeedRef = useRef(30); // Milliseconds per word

  useEffect(() => {
    if (!isUser && messageContent) {
      // Reset state for new messages
      setIsAnimating(true);
      currentIndexRef.current = 0;
      
      // Split content into words while preserving markdown
      const preserveMarkdown = (text: string): string[] => {
        // Regular expression to match markdown code blocks and inline code
        const codeBlockRegex = /```[\s\S]*?```|`[^`]+`/g;
        const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
        const emphasisRegex = /\*\*[^*]+\*\*|\*[^*]+\*|__[^_]+__|_[^_]+_/g;
        
        // Find all special markdown entities
        const specialEntities: { start: number; end: number; content: string }[] = [];
        
        // Helper to add matches to our entities array
        const addMatches = (regex: RegExp, text: string) => {
          let match;
          while ((match = regex.exec(text)) !== null) {
            specialEntities.push({
              start: match.index,
              end: match.index + match[0].length,
              content: match[0]
            });
          }
        };
        
        addMatches(codeBlockRegex, text);
        addMatches(linkRegex, text);
        addMatches(emphasisRegex, text);
        
        // Sort entities by start position
        specialEntities.sort((a, b) => a.start - b.start);
        
        // Process text into words, preserving markdown entities
        const words: string[] = [];
        let lastIndex = 0;
        
        for (const entity of specialEntities) {
          // Add any text before this entity as individual words
          if (entity.start > lastIndex) {
            const textBefore = text.substring(lastIndex, entity.start);
            words.push(...textBefore.split(/(\s+)/).filter(word => word));
          }
          
          // Add the entity as a single "word"
          words.push(entity.content);
          lastIndex = entity.end;
        }
        
        // Add any remaining text after the last entity
        if (lastIndex < text.length) {
          const textAfter = text.substring(lastIndex);
          words.push(...textAfter.split(/(\s+)/).filter(word => word));
        }
        
        return words;
      };
      
      wordsRef.current = preserveMarkdown(messageContent);
      setDisplayedContent('');
      
      // Start the animation
      const animateText = () => {
        if (currentIndexRef.current < wordsRef.current.length) {
          setDisplayedContent(prev => 
            prev + wordsRef.current[currentIndexRef.current]);
          currentIndexRef.current++;
          setTimeout(animateText, animationSpeedRef.current);
        } else {
          setIsAnimating(false);
        }
      };
      
      animateText();
    }
  }, [messageContent, isUser]);

  // Custom hook for detecting code blocks in the message
  const hasCompleteCodeBlock = (content: string): boolean => {
    const codeBlockRegex = /```[\s\S]*?```/;
    return codeBlockRegex.test(content);
  };

  // Determine if we need to show the original content because of incomplete markdown
  const shouldShowOriginal = !isUser && 
    (!isAnimating && displayedContent !== messageContent) || 
    (hasCompleteCodeBlock(messageContent) && !hasCompleteCodeBlock(displayedContent));

  return (
    // Outermost container for alignment and bottom margin
    <motion.div
      layout
      variants={messageBlockVariants}
      initial="hidden"
      animate="visible"
      className={clsx(
          'flex w-full mb-4 md:mb-5', // Increased margin slightly for sender name
          isUser ? 'justify-end pl-8 md:pl-12 lg:pl-20' : 'justify-start pr-8 md:pr-12 lg:pr-20'
        )}
    >
      {/* Wrapper for name + message content, applies max-width */}
      <div className={clsx("flex flex-col", isUser ? 'items-end' : 'items-start', "max-w-[90%]")}>
        {/* --- Sender Name Label --- */}
        {senderName && (
          <div className={clsx(
            "text-xs font-medium mb-1", // Styling for the name label
            isUser ? "text-primary/80" : "text-gray-500" // Different colors for user/AI name
          )}>
            {senderName}
          </div>
        )}
        {/* --- End Sender Name Label --- */}
        {/* Message Content */}
        <div
          className={clsx(
            "text-sm md:text-[0.9rem] whitespace-pre-wrap break-words",
            isUser ? "text-secondary" : "text-secondary",
            // Prose classes for markdown styling
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
          {isUser || shouldShowOriginal ? (
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {messageContent}
            </ReactMarkdown>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div
                key={displayedContent.length}
                initial={{ opacity: 0.6 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.15 }}
              >
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {displayedContent}
                </ReactMarkdown>
                {isAnimating && (
                  <motion.span
                    className="inline-block ml-0.5 h-4 w-0.5 bg-primary/70"
                    animate={{ opacity: [1, 0, 1] }}
                    transition={{ repeat: Infinity, duration: 0.8 }}
                  />
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.div>
  );
});

ChatMessage.displayName = 'ChatMessage';
export default ChatMessage;
