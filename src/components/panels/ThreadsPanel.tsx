import React from 'react';
import { Search } from 'lucide-react';

interface Thread {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

const ThreadsPanel = () => {
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
    }
  ];

  return (
    <div className="space-y-4">
      <div className="relative">
        <input
          type="text"
          placeholder="Search conversations..."
          className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:border-primary"
        />
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
      </div>

      <div className="space-y-2">
        {threads.map(thread => (
          <div
            key={thread.id}
            className="p-4 bg-background rounded-lg cursor-pointer hover:bg-gray-100 transition-colors"
          >
            <div className="flex justify-between items-start mb-1">
              <h3 className="font-medium text-secondary">{thread.title}</h3>
              <span className="text-xs text-gray-500">{thread.timestamp}</span>
            </div>
            <p className="text-sm text-gray-600 line-clamp-2">{thread.preview}</p>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanel;