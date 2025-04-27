import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { clsx } from 'clsx';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { Database } from '../../types/supabase';

type Thread = Database['public']['Tables']['threads']['Row'];

interface ThreadsPanelSidebarProps {
  onCloseMobileSidebar: () => void;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<void>;
  currentThreadId: string | null;
}

const ThreadsPanelSidebar: React.FC<ThreadsPanelSidebarProps> = ({
  onCloseMobileSidebar,
  onSelectThread,
  onNewThread,
  currentThreadId,
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { user, session } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]); // Start empty
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchThreads = async (userId: string) => {
    console.log("ThreadsPanel: Fetching threads for user:", userId);
    setError(null);
    setLoading(true);
    // Explicitly clear threads *before* fetching to prevent showing old ones
    setThreads([]);
    try {
        const { data, error: fetchError } = await supabase
            .from('threads')
            .select('*')
            .eq('user_id', userId)
            .order('updated_at', { ascending: false });

        if (fetchError) {
            throw fetchError;
        }

        console.log("ThreadsPanel: Fetched threads successfully:", data);
        // Set state correctly, defaulting to empty array if data is null/undefined
        setThreads(data || []);

    } catch (err) {
        console.error("ThreadsPanel: Error fetching threads:", err instanceof Error ? err.message : String(err));
        setError("Failed to load threads.");
        setThreads([]); // Ensure threads are empty on error
    } finally {
        // Only set loading false *after* fetch attempt is complete
        setLoading(false);
    }
  };


  useEffect(() => {
    const currentUserId = session?.user?.id;

    if (!currentUserId) {
      setThreads([]); // Clear state if no user
      setLoading(false); // Stop loading
      setError(null); // Clear error
      console.log("ThreadsPanel: No user session, clearing threads state.");
      return;
    }

    let isMounted = true;
    // Fetch initial threads for the current user
    fetchThreads(currentUserId);

    // Setup subscription
    const channel = supabase.channel(`public:threads:user_id=eq.${currentUserId}`)
      .on<Thread>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          console.log('Threads change received!', payload);
          // Re-fetch data when a change occurs for the current user
          if (isMounted && session?.user?.id === currentUserId) { // Ensure still same user
            fetchThreads(currentUserId);
          }
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('ThreadsPanel: Subscribed to thread changes');
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
              console.error(`ThreadsPanel: Subscription error - Status: ${status}`, err);
              if (isMounted) setError("Realtime connection error."); // Show error if mounted
          }
      });

     // Cleanup function
     return () => {
        isMounted = false;
        console.log("ThreadsPanel: Unsubscribing from threads channel");
        supabase.removeChannel(channel).catch(err => console.error("Error removing channel", err));
     };

  // Rerun effect ONLY when the user ID changes
  }, [session?.user?.id]);


  const handleThreadClick = (threadId: string) => {
    onSelectThread(threadId);
    if (isMobile) {
        onCloseMobileSidebar();
    }
  };

  const handleNewThreadClick = async () => {
     await onNewThread();
     if (isMobile) {
         onCloseMobileSidebar();
     }
  };

   const formatTimestamp = (timestamp: string | null): string => {
        if (!timestamp) return 'N/A';
        try {
            const date = new Date(timestamp);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - date.getTime());
            const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
            const diffHours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const diffMinutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));

            if (diffDays > 7) return date.toLocaleDateString();
            if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            if (diffMinutes > 0) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`; // Shorter 'min'
            return 'Just now';
        } catch (e) {
            console.error("Error formatting timestamp:", e);
            return 'Invalid date';
        }
    };


  return (
    <div className="p-4 h-full flex flex-col overflow-hidden">
      <div className="flex justify-between items-center mb-4 flex-shrink-0">
        <h2 className="text-xl font-semibold font-serif text-secondary">Threads</h2>
        <button
          onClick={handleNewThreadClick}
          className="flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 hover:bg-primary/20 px-3 py-1.5 rounded-lg transition-colors"
        >
          <Plus size={16} /> New Thread
        </button>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 -mr-1">
        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
        {/* Error State */}
        {error && !loading && (
           <p className="text-center text-sm text-red-600 py-4 px-2">{error}</p>
        )}
        {/* Empty State */}
        {!loading && !error && threads.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">No chat history yet.</p>
        )}
        {/* Threads List */}
        {!loading && !error && threads.length > 0 && threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            className={clsx(
              "w-full p-3 rounded-lg cursor-pointer transition-colors border text-left flex items-start gap-3",
              "max-w-md mx-auto",
              currentThreadId === thread.id
                ? 'bg-primary/10 border-primary/30 shadow-sm'
                : 'bg-white border-gray-200/80 hover:bg-gray-50/80'
            )}
          >
            <MessageSquare className={clsx(
                "w-4 h-4 mt-0.5 flex-shrink-0",
                 currentThreadId === thread.id ? 'text-primary/80' : 'text-gray-400'
                 )}
             />
            <div className="flex-1 overflow-hidden">
              <h3 className={clsx(
                  "text-sm font-medium mb-0.5 line-clamp-1 truncate",
                   currentThreadId === thread.id ? 'text-primary' : 'text-secondary'
                   )}
              >
                {thread.title || 'Untitled Chat'}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-1 truncate">
                 Last activity: {formatTimestamp(thread.updated_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanelSidebar;
