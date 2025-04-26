// src/components/chat/ChatInput.tsx
import React, { useRef, useEffect } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ChatInputProps {
  value: string; // Input value is controlled by parent
  onChange: (value: string) => void; // Parent provides the change handler
  onSendMessage: (message: string) => void; // Still called on submit
  isResponding: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
    value,
    onChange,
    onSendMessage,
    isResponding
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null); // Ref for the textarea

  // Effect to auto-size the textarea based on content
  useEffect(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      // Temporarily set height to 'auto' to calculate the new scrollHeight
      textarea.style.height = 'auto';
      // Set the height based on scrollHeight, constrained by max-height in CSS
      textarea.style.height = `${textarea.scrollHeight}px`;
    }
  }, [value]); // Re-run this effect whenever the value changes

  // Determine if submit is possible based on controlled value
  const canSubmit = !isResponding && value.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSendMessage(value);
      // Parent (ChatPage) is now responsible for clearing the input value
    }
  };

  // Handle key press for submitting on Enter, but not Shift+Enter
  const handleKeyPress = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Enter' && !e.shiftKey) {
          e.preventDefault(); // Prevent default newline
          handleSubmit(e as any); // Submit the form
      }
  };

  return (
    <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full"
    >
        <form onSubmit={handleSubmit} className="w-full">
            {/* Outer div provides flex context, max-width/centering, border, bg, shadow, and rounded corners */}
            <div className="relative flex items-end max-w-3xl mx-auto border border-gray-300/80 bg-white shadow-sm rounded-xl overflow-hidden">
                <textarea
                    ref={textareaRef} // Attach the ref
                    value={value} // Controlled textarea
                    onChange={(e) => onChange(e.target.value)} // Call parent's onChange handler
                    onKeyPress={handleKeyPress} // Add key press handler for Enter submit
                    placeholder="Talk with Parthavi"
                    rows={1} // Start with 1 row
                    // Classes for dynamic height (controlled by JS/CSS), scrolling, and removing manual resize
                    // Added scrollbar-thin for custom style
                    // Adjusted padding to accommodate button and scrollbar
                    className={clsx(
                        "flex-1 bg-transparent focus:outline-none focus:ring-0 text-secondary placeholder-gray-500 transition-all duration-200", // Added focus:ring-0 to ensure parent's focus ring is used
                        "min-h-[48px] max-h-[160px] overflow-y-auto resize-none leading-relaxed scrollbar-thin", // <-- scrollbar-thin is here
                        "pl-4 md:pl-5 pr-12 md:pr-14 pt-3 pb-2.5" // Adjusted right padding (pr) slightly
                    )}
                    disabled={isResponding}
                    style={{ height: 'auto' }} // Start with auto height for calculation
                />
                <button
                    type="submit"
                    // Position button relative to the bottom right of the outer container
                    className={clsx(
                        "absolute right-1.5 bottom-1.5 transition-all duration-200 p-2 rounded-full w-9 h-9 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1",
                        canSubmit
                         ? 'bg-action text-white hover:bg-opacity-90 focus:ring-action/70'
                         : 'bg-gray-200 text-gray-400 cursor-not-allowed focus:ring-gray-300'
                    )}
                    disabled={!canSubmit}
                    aria-label="Send message"
                >
                    <ArrowUp size={18} strokeWidth={2.5}/>
                </button>
            </div>
             {/* Disclaimer text remains outside */}
             <p className="text-xs text-gray-400 mt-3 text-center px-4">
                Parthavi may make mistakes, please don't rely on its information.
            </p>
        </form>
    </motion.div>
  );
};

export default ChatInput;
