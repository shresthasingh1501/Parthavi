// src/components/sidebar_panels/ThreadsPanelSidebar.tsx
import React from 'react';
import { Plus, MessageSquare } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { clsx } from 'clsx'; // Import clsx if not already

interface Thread {
  id: string;
  title: string;
  preview: string;
  timestamp: string;
}

interface ThreadsPanelSidebarProps {
    onCloseMobileSidebar: () => void;
}

const ThreadsPanelSidebar: React.FC<ThreadsPanelSidebarProps> = ({ onCloseMobileSidebar }) => {
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

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

    const handleThreadClick = (threadId: string) => {
        console.log(`Clicked thread: ${threadId}. Navigating/loading thread...`);
        // Implement thread loading logic here
        // For now, just close the sidebar on mobile
        if (isMobile) {
            onCloseMobileSidebar();
        }
    };

     const handleNewThreadClick = () => {
        console.log("Clicked New Thread.");
        // Implement new thread logic here
         if (isMobile) {
            onCloseMobileSidebar();
        }
     };


  return (
    <div className="p-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent -mr-1 pr-1">
      <div className="flex justify-between items-center mb-4">
         <h2 className="text-xl font-semibold font-serif text-secondary">Threads</h2>
         <button
            onClick={handleNewThreadClick}
            className="flex items-center gap-1 text-sm font-medium text-primary hover:bg-primary/10 p-2 rounded-lg transition-colors"
            >
            <Plus size={16} />
            New Thread
         </button>
      </div>

      <div className="flex-1 space-y-2">
        {threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            // Added max-w-md mx-auto for centering and width constraint
            className={clsx(
                "w-full p-3 bg-white rounded-lg cursor-pointer hover:bg-gray-50 transition-colors border border-gray-200/80 text-left flex items-start gap-3",
                "max-w-md mx-auto" // <-- Add centering and max-width here
            )}
          >
            <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-secondary mb-0.5 line-clamp-1">{thread.title}</h3>
              <p className="text-xs text-gray-500 line-clamp-2">{thread.preview}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanelSidebar;
