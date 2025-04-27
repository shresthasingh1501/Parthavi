import React, { useState, useEffect, useCallback } from 'react';
import { Plus, MessageSquare, Loader2, AlertCircle } from 'lucide-react'; // Added AlertCircle
import { useMediaQuery } from 'react-responsive';
import { clsx } from 'clsx';
import { useUser } from '../../context/UserContext';
import { supabase } from '../../lib/supabaseClient';
import { Database } from '../../types/supabase';

type Thread = Database['public']['Tables']['threads']['Row'];

interface ThreadsPanelSidebarProps {
  onCloseMobileSidebar: () => void;
  onSelectThread: (threadId: string) => void;
  onNewThread: () => Promise<string | null>; // Ensure return type matches usage
  currentThreadId: string | null;
}

const ThreadsPanelSidebar: React.FC<ThreadsPanelSidebarProps> = ({
  onCloseMobileSidebar,
  onSelectThread,
  onNewThread,
  currentThreadId,
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const { user, session, loading: userLoading } = useUser(); // Use userLoading state
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true); // Specific loading state for threads
  const [error, setError] = useState<string | null>(null);

  // Separate fetch function for better control and logging
  const fetchThreads = useCallback(async (userId: string) => {
    console.log("ThreadsPanel: Fetching threads for user:", userId);
    setError(null);
    setLoadingThreads(true);
    setThreads([]); // Clear existing threads before fetching

    try {
      // **IMPORTANT**: Ensure RLS policy exists on `threads` table:
      // `CREATE POLICY "Allow authenticated users to see their own threads" ON threads FOR SELECT USING (auth.uid() = user_id);`
      const { data, error: fetchError } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        // Check for specific errors, e.g., RLS violation (though Supabase might not expose specific codes easily)
        console.error("ThreadsPanel: Supabase fetch error:", fetchError);
        throw new Error(`Failed to load threads. (${fetchError.message})`); // Provide more context
      }

      console.log("ThreadsPanel: Fetched threads successfully:", data?.length || 0);
      setThreads(data || []); // Set state correctly

    } catch (err: any) {
      console.error("ThreadsPanel: Exception during fetchThreads:", err);
      setError(err.message || "An unknown error occurred while fetching threads.");
      setThreads([]); // Ensure threads are empty on error
    } finally {
      console.log("ThreadsPanel: fetchThreads finished.");
      setLoadingThreads(false); // Ensure loading is set to false
    }
  }, []); // No dependencies needed for the function itself

  // Effect for handling user changes and subscriptions
  useEffect(() => {
    const currentUserId = session?.user?.id;

    if (userLoading) {
        console.log("ThreadsPanel: User context loading, waiting...");
        setLoadingThreads(true); // Show loading while user context resolves
        setThreads([]);
        setError(null);
        return; // Don't proceed if user context is still loading
    }

    if (!currentUserId) {
      console.log("ThreadsPanel: No user session, clearing threads state.");
      setThreads([]);
      setLoadingThreads(false); // Stop loading if no user
      setError(null);
      return; // Exit if no user
    }

    console.log("ThreadsPanel: User detected, initializing threads fetch and subscription for:", currentUserId);
    let isMounted = true;
    fetchThreads(currentUserId); // Initial fetch

    // Setup subscription
    const channel = supabase.channel(`public:threads:user_id=eq.${currentUserId}`)
      .on<Thread>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          console.log('ThreadsPanel: Realtime change received!', payload.eventType);
          // Re-fetch data when a change occurs for the current user
          if (isMounted && session?.user?.id === currentUserId) { // Double check user hasn't changed
             console.log("ThreadsPanel: Re-fetching threads due to realtime event.");
            // Consider potential optimization: Update state directly based on payload?
            // For simplicity and robustness, re-fetching is often safer.
            fetchThreads(currentUserId);
          } else if (!isMounted) {
              console.log("ThreadsPanel: Realtime event ignored, component unmounted or user changed.");
          }
        }
      )
      .subscribe((status, err) => {
        if (!isMounted) return; // Ignore if unmounted
        if (status === 'SUBSCRIBED') {
          console.log('ThreadsPanel: Successfully subscribed to thread changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`ThreadsPanel: Subscription error - Status: ${status}`, err);
          setError("Realtime connection issue. Updates may be delayed."); // Inform user about potential issue
        } else {
            console.log(`ThreadsPanel: Subscription status changed: ${status}`);
        }
      });

    // Cleanup function
    return () => {
      isMounted = false;
      console.log("ThreadsPanel: Unsubscribing from threads channel");
      supabase.removeChannel(channel).catch(err => console.error("ThreadsPanel: Error removing channel", err));
    };

  // Rerun effect ONLY when the user ID changes or userLoading state finishes
  }, [session?.user?.id, userLoading, fetchThreads]);

  const handleThreadClick = (threadId: string) => {
    onSelectThread(threadId);
    if (isMobile) {
      onCloseMobileSidebar();
    }
  };

  const handleNewThreadClick = async () => {
    const newThreadId = await onNewThread(); // Await the promise
    if (newThreadId && isMobile) { // Close only if successful and on mobile
        onCloseMobileSidebar();
    } else if (!newThreadId) {
        // Handle error? Maybe show a toast notification?
        console.error("ThreadsPanel: Failed to create new thread from button click.");
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
        if (diffMinutes > 0) return `${diffMinutes} min${diffMinutes > 1 ? 's' : ''} ago`;
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
          disabled={loadingThreads || userLoading} // Disable if loading anything
        >
          <Plus size={16} /> New Thread
        </button>
      </div>

      {/* Scrollable Area */}
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 -mr-1">
        {/* Loading State */}
        {loadingThreads && (
          <div className="flex justify-center items-center p-4 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading threads...
          </div>
        )}
        {/* Error State */}
        {error && !loadingThreads && (
          <div className="flex flex-col items-center text-center text-red-600 py-4 px-2 bg-red-50 rounded-lg border border-red-200">
             <AlertCircle className="w-6 h-6 mb-2 text-red-500"/>
             <p className="text-sm font-medium mb-1">Loading Failed</p>
             <p className="text-xs">{error}</p>
             <p className='text-xs mt-1'>Please check your connection or try again later. Make sure RLS policies are set in Supabase.</p>
          </div>
        )}
        {/* Empty State */}
        {!loadingThreads && !error && threads.length === 0 && !userLoading && session?.user && (
          <p className="text-center text-sm text-gray-500 py-4 px-2">No chat history yet. Start a new conversation!</p>
        )}
         {/* No User State */}
         {!loadingThreads && !error && !userLoading && !session?.user && (
          <p className="text-center text-sm text-gray-500 py-4 px-2">Please sign in to see your threads.</p>
        )}
        {/* Threads List */}
        {!loadingThreads && !error && threads.length > 0 && threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            className={clsx(
              "w-full p-3 rounded-lg cursor-pointer transition-colors border text-left flex items-start gap-3",
              currentThreadId === thread.id
                ? 'bg-primary/10 border-primary/30 shadow-sm'
                : 'bg-white border-gray-200/80 hover:bg-gray-50/80'
            )}
            aria-current={currentThreadId === thread.id ? 'page' : undefined}
          >
            <MessageSquare className={clsx(
              "w-4 h-4 mt-0.5 flex-shrink-0",
              currentThreadId === thread.id ? 'text-primary/80' : 'text-gray-400'
            )} />
            <div className="flex-1 overflow-hidden">
              <h3 className={clsx(
                "text-sm font-medium mb-0.5 line-clamp-1 truncate",
                currentThreadId === thread.id ? 'text-primary' : 'text-secondary'
              )}>
                {thread.title || 'Untitled Chat'}
              </h3>
              <p className="text-xs text-gray-500 line-clamp-1 truncate">
                {formatTimestamp(thread.updated_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanelSidebar;
