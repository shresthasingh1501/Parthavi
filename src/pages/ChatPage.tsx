import React, { useState } from 'react';
import ChatInput from '../components/chat/ChatInput';
import ChatMessage from '../components/chat/ChatMessage';
import Panel from '../components/panels/Panel';
import ThreadsPanel from '../components/panels/ThreadsPanel';
import SettingsPanel from '../components/panels/SettingsPanel';
import Sidebar from '../components/chat/Sidebar';

interface Message {
  id: string;
  text: string;
  isUser: boolean;
  timestamp: string;
}

const ChatPage = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hey there, great to meet you. I'm Parthavi, your personal AI. My goal is to be useful, friendly and fun. Ask me for advice, for answers, or let's talk about whatever's on your mind. How's your day going?",
      isUser: false,
      timestamp: new Date().toLocaleTimeString()
    }
  ]);

  const [activePanel, setActivePanel] = useState<'threads' | 'settings' | null>(null);

  const handleSendMessage = (text: string) => {
    const newMessage: Message = {
      id: Date.now().toString(),
      text,
      isUser: true,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, newMessage]);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: "I'm here to help! What would you like to discuss about your career?",
        isUser: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, aiResponse]);
    }, 1000);
  };

  return (
    <div className="flex h-screen bg-white">
      {/* Expanded Sidebar */}
      <Sidebar />

      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 overflow-y-auto p-4">
          {messages.map(message => (
            <ChatMessage
              key={message.id}
              message={message.text}
              isUser={message.isUser}
              timestamp={message.timestamp}
            />
          ))}
        </div>
        <ChatInput onSendMessage={handleSendMessage} />
      </div>

      {/* Sliding Panels */}
      <Panel
        isOpen={activePanel === 'threads'}
        onClose={() => setActivePanel(null)}
        title="Conversations"
      >
        <ThreadsPanel />
      </Panel>

      <Panel
        isOpen={activePanel === 'settings'}
        onClose={() => setActivePanel(null)}
        title="Settings"
      >
        <SettingsPanel />
      </Panel>
    </div>
  );
};

export default ChatPage;