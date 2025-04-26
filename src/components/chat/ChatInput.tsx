import React, { useState } from 'react';
import { Send } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
}

const ChatInput: React.FC<ChatInputProps> = ({ onSendMessage }) => {
  const [message, setMessage] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim()) {
      onSendMessage(message);
      setMessage('');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 bg-white">
      <div className="relative flex items-center">
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Talk with Parthavi"
          className="w-full px-4 py-2 pr-10 rounded-full border border-gray-200 focus:outline-none focus:border-primary"
        />
        <button
          type="submit"
          className="absolute right-3 text-primary hover:text-primary/80 transition-colors"
          disabled={!message.trim()}
        >
          <Send size={20} />
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-2 text-center">
        By using Parthavi, you agree to our{' '}
        <a href="#" className="text-primary hover:underline">Terms</a>
        {' '}and{' '}
        <a href="#" className="text-primary hover:underline">Privacy Policy</a>
      </p>
    </form>
  );
};

export default ChatInput;