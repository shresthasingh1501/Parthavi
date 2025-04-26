import React from 'react';
import { Plus, MessageSquare } from 'lucide-react'; // Assuming MessageSquare for thread icon

interface Thread {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

const ThreadsPanelSidebar = () => {
  const threads: Thread[] = [
    {
      id: '1',
      title: 'Career Planning',
      preview: 'Let\'s discuss your career goals and aspirations...',
      timestamp: '2h ago'
    },
    {
      id: '2',
      title: 'Interview Preparation',
      preview: 'Here are some tips for your upcoming interview...',
      timestamp: '1d ago'
    },
    {
      id: '3',
      title: 'Resume Review',
      preview: 'Your resume looks great! Here are some suggestions...',
      timestamp: '3d ago'
    },
    {
        id: '4',
        title: 'Networking Strategies',
        preview: 'How to approach networking events effectively...',
        timestamp: '5d ago'
    }
  ];

  return (
    <div className="p-4 h-full flex flex-col">
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-semibold font-serif text-secondary">Threads</h2>
         <button className="flex items-center gap-1 text-sm font-medium text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors">
            <Plus size={16} />
            New Thread
         </button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto -mr-4 pr-4"> {/* Adjust padding for scrollbar */}
        {threads.map(thread => (
          <button
            key={thread.id}
            className="w-full p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200/80 text-left flex items-start gap-3"
          >
            <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-secondary mb-0.5 line-clamp-1">{thread.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{thread.preview}</p>
              {/* <span className="text-xs text-gray-400 mt-1 block">{thread.timestamp}</span> */}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanelSidebar;
