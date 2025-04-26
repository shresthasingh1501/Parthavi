import React, { useState } from 'react';
import { ArrowUp } from 'lucide-react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  isResponding: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage, isResponding }) => {
  const [message, setMessage] = useState('');
  // Button is active if not responding AND message has content
  const canSubmit = !isResponding && message.trim().length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (canSubmit) {
      onSendMessage(message);
      setMessage('');
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
            <div className="relative flex items-center mx-auto">
                <input
                    type="text"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Talk with Parthavi"
                    className="w-full px-5 py-3 pr-14 rounded-full border border-gray-300/80 focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 bg-white shadow-sm text-secondary placeholder-gray-400 transition-all duration-200"
                    // Input itself is not disabled, only the button state changes
                />
                <button
                    type="submit"
                    className={clsx(
                        "absolute right-1.5 top-1/2 transform -translate-y-1/2 transition-all duration-200 p-2 rounded-full w-9 h-9 flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-offset-1",
                        canSubmit
                         ? 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-500' // Active state (green)
                         : 'bg-gray-200 text-gray-400 cursor-not-allowed focus:ring-gray-300' // Inactive state (grey)
                    )}
                    disabled={!canSubmit} // Disable button logically
                    aria-label="Send message"
                >
                    <ArrowUp size={18} strokeWidth={2.5}/>
                </button>
            </div>
             <p className="text-xs text-gray-400 mt-3 text-center px-4">
                Parthavi may make mistakes, please don't rely on its information. By using Parthavi, you agree to our{' '}
                <a href="#" className="text-primary/80 hover:underline">Terms</a>
                {' '}and{' '}
                <a href="#" className="text-primary/80 hover:underline">Privacy Policy</a>.
            </p>
        </form>
    </motion.div>
  );
};

export default ChatInput;
