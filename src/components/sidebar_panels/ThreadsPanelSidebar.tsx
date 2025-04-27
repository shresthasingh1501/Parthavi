// src/components/sidebar_panels/ThreadsPanelSidebar.tsx
import React, { useState, useEffect } from 'react';
import { Plus, MessageSquare, Loader2 } from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import { clsx } from 'clsx';
import { useUser } from '../../context/UserContext'; // Import useUser
import { supabase } from '../../lib/supabaseClient'; // Import supabase
import { Database } from '../../types/supabase'; // Import generated types

type Thread = Database['public']['Tables']['threads']['Row']; // Type for DB thread

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
  // Initialize state as empty array explicitly
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loading, setLoading] = useState(true); // Start loading true

  // Fetch threads when user session becomes available or changes
  useEffect(() => {
    // Ensure we only fetch if there's a valid user session
    if (!session?.user?.id) {
      setThreads([]); // Clear threads if user logs out
      setLoading(false);
      console.log("ThreadsPanel: No user session, clearing threads.");
      return;
    }

    let isMounted = true; // Prevent state updates after unmount
    setLoading(true); // Set loading true at the start of fetch attempt
    setThreads([]); // Clear previous threads before fetching new ones

    const fetchThreads = async () => {
      console.log("ThreadsPanel: Fetching threads for user:", session.user.id);
      const { data, error } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', session.user.id)
        .order('updated_at', { ascending: false });

      if (!isMounted) return; // Exit if component unmounted during fetch

      if (error) {
        console.error("ThreadsPanel: Error fetching threads:", error.message);
        setThreads([]); // Ensure threads are empty on error
      } else {
        console.log("ThreadsPanel: Fetched threads successfully:", data);
        setThreads(data || []); // Set state with fetched data or empty array if null
      }
      setLoading(false); // Stop loading after fetch completes or fails
    };

    fetchThreads();

    // Setup real-time subscription
    const channel = supabase.channel(`public:threads:user_id=eq.${session.user.id}`)
      .on<Thread>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `user_id=eq.${session.user.id}` },
        (payload) => {
          console.log('Threads change received!', payload);
          // Re-fetch for simplicity, consider smarter updates for performance later
          if (isMounted) { // Check mount status before re-fetching
            fetchThreads();
          }
        }
      )
      .subscribe((status, err) => {
          if (status === 'SUBSCRIBED') {
              console.log('ThreadsPanel: Subscribed to thread changes');
          }
          if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
              console.error(`ThreadsPanel: Subscription error - ${status}`, err);
          }
      });

     // Cleanup function
     return () => {
        isMounted = false; // Mark as unmounted
        console.log("ThreadsPanel: Unsubscribing from threads channel");
        supabase.removeChannel(channel).catch(err => console.error("Error removing channel", err));
     };

  // Rerun effect if the user session ID changes
  }, [session?.user?.id]);


  const handleThreadClick = (threadId: string) => {
    onSelectThread(threadId);
  };

  const handleNewThreadClick = () => {
     onNewThread();
  };

  const formatTimestamp = (timestamp: string): string => { /* ... keep formatting function ... */ };

  return (
    <div className="p-4 h-full flex flex-col overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent -mr-1 pr-1">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold font-serif text-secondary">Threads</h2>
        <button onClick={handleNewThreadClick} /* ... */ > <Plus size={16} /> New Thread </button>
      </div>

      <div className="flex-1 space-y-2">
        {/* --- Show Loader ONLY when loading --- */}
        {loading && (
          <div className="flex justify-center items-center p-4">
            <Loader2 className="w-5 h-5 text-gray-400 animate-spin" />
          </div>
        )}
        {/* --- Show "No history" ONLY when not loading AND threads array is empty --- */}
        {!loading && threads.length === 0 && (
          <p className="text-center text-sm text-gray-500 py-4">No chat history yet.</p>
        )}
        {/* --- Show Threads ONLY when not loading AND threads array has items --- */}
        {!loading && threads.length > 0 && threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            className={clsx(
              "w-full p-3 rounded-lg cursor-pointer transition-colors border border-gray-200/80 text-left flex items-start gap-3",
              "max-w-md mx-auto",
              currentThreadId === thread.id
                ? 'bg-primary/10 border-primary/30'
                : 'bg-white hover:bg-gray-50'
            )}
          >
            <MessageSquare className="w-4 h-4 text-gray-400 mt-1 flex-shrink-0" />
            <div className="flex-1 overflow-hidden">
              <h3 className="text-sm font-medium text-secondary mb-0.5 line-clamp-1 truncate">
                {thread.title || 'Untitled'}
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
