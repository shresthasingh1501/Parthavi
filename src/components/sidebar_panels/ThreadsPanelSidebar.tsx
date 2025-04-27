// src/components/sidebar_panels/ThreadsPanelSidebar.tsx
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
  // Updated return type to match the ChatPage function signature
  onNewThread: () => Promise<string | null>;
  currentThreadId: string | null;
}

const ThreadsPanelSidebar: React.FC<ThreadsPanelSidebarProps> = ({
  onCloseMobileSidebar,
  onSelectThread,
  onNewThread,
  currentThreadId,
}) => {
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  // Use userLoading state from context
  const { user, session, loading: userLoading } = useUser();
  const [threads, setThreads] = useState<Thread[]>([]);
  const [loadingThreads, setLoadingThreads] = useState(true); // Specific loading state for threads fetch
  const [error, setError] = useState<string | null>(null);

  // Separate fetch function for better control and logging
  const fetchThreads = useCallback(async (userId: string) => {
    console.log("ThreadsPanel: Fetching threads for user:", userId);
    setError(null); // Clear previous errors
    setLoadingThreads(true); // Start loading
    setThreads([]); // Clear existing threads immediately before fetching

    try {
      // **IMPORTANT**: Ensure RLS policy exists on `threads` table:
      // `CREATE POLICY "Allow authenticated users to see their own threads" ON threads FOR SELECT USING (auth.uid() = user_id);`
      const { data, error: fetchError } = await supabase
        .from('threads')
        .select('*')
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (fetchError) {
        // Check for specific errors
        console.error("ThreadsPanel: Supabase fetch error:", fetchError);
        // Provide a more user-friendly message for common issues
         throw new Error(`Failed to load threads. Check connection or try again. ${fetchError.message}`);
      }

      console.log("ThreadsPanel: Fetched threads successfully:", data?.length || 0);
      // Set state correctly, defaulting to empty array if data is null/undefined
      setThreads(data || []);

    } catch (err: any) {
      console.error("ThreadsPanel: Exception during fetchThreads:", err);
      setError(err.message || "An unknown error occurred while fetching threads.");
      setThreads([]); // Ensure threads are empty on error
    } finally {
      console.log("ThreadsPanel: fetchThreads finished.");
      setLoadingThreads(false); // Ensure loading is set to false
    }
  }, []); // fetchThreads itself doesn't depend on anything external

  // Effect for handling user changes and subscriptions
  useEffect(() => {
    const currentUserId = session?.user?.id;

    // If user context is loading, just show thread loading indicator
    if (userLoading) {
        console.log("ThreadsPanel: User context loading, waiting...");
        setLoadingThreads(true); // Show loading while user context resolves
        setThreads([]); // Clear threads while loading user
        setError(null); // Clear error while loading user
        return; // Don't proceed if user context is still loading
    }

    // If user context finished loading and there's no user, clear state and stop loading
    if (!currentUserId) {
      console.log("ThreadsPanel: No user session after loading, clearing threads state.");
      setThreads([]);
      setLoadingThreads(false); // Stop loading if no user
      setError(null);
      return; // Exit if no user
    }

    // User is present, proceed with fetching and subscription
    console.log("ThreadsPanel: User detected, initializing threads fetch and subscription for:", currentUserId);
    let isMounted = true;
    fetchThreads(currentUserId); // Initial fetch

    // Setup subscription for the current user's threads
    const channel = supabase.channel(`public:threads:user_id=eq.${currentUserId}`)
      .on<Thread>(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'threads', filter: `user_id=eq.${currentUserId}` },
        (payload) => {
          console.log('ThreadsPanel: Realtime change received!', payload.eventType);
          // Re-fetch data when a change occurs for the current user
          // Check if component is still mounted and if the user ID is still the same
          if (isMounted && session?.user?.id === currentUserId) {
             console.log("ThreadsPanel: Re-fetching threads due to realtime event.");
            // Simple re-fetch is often sufficient to keep list in sync
            fetchThreads(currentUserId);
          } else if (!isMounted) {
              console.log("ThreadsPanel: Realtime event ignored, component unmounted.");
          } else if (session?.user?.id !== currentUserId) {
              console.log("ThreadsPanel: Realtime event ignored, user changed since subscription started.");
          }
        }
      )
      .subscribe((status, err) => {
        if (!isMounted) return; // Ignore status updates if component unmounted
        if (status === 'SUBSCRIBED') {
          console.log('ThreadsPanel: Successfully subscribed to thread changes');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || err) {
          console.error(`ThreadsPanel: Subscription error - Status: ${status}`, err);
           // Show a real-time error message if the subscription fails
           // This error is separate from the initial fetch error
           if (isMounted) setError(prev => prev || "Realtime connection issue. Updates may be delayed."); // Only set if no fetch error already
        } else {
            console.log(`ThreadsPanel: Subscription status changed: ${status}`);
        }
      });

    // Cleanup function: Unsubscribe when the component unmounts or user changes
    return () => {
      isMounted = false;
      console.log("ThreadsPanel: Unsubscribing from threads channel");
      // Use removeChannel for cleaner cleanup
      supabase.removeChannel(channel).catch(err => console.error("ThreadsPanel: Error removing channel", err));
    };

  // Rerun effect ONLY when the user ID or userLoading state changes.
  // fetchThreads is memoized with useCallback, so it doesn't cause re-runs unless its deps change (it has none).
  // session?.user?.id changes when sign in/out happens. userLoading changes when auth state is resolving.
  }, [session?.user?.id, userLoading, fetchThreads]); // Added fetchThreads as dependency for useCallback best practice

  const handleThreadClick = (threadId: string) => {
    onSelectThread(threadId);
    if (isMobile) {
      onCloseMobileSidebar();
    }
  };

  const handleNewThreadClick = async () => {
     // Disabled button handles loading state, but good to check defensively
     if (loadingThreads || userLoading) return;
     console.log("ThreadsPanel: New thread button clicked.");
     // Call the onNewThread function provided by the parent (ChatPage)
     const newThreadId = await onNewThread(); // Await the promise return value
     if (newThreadId && isMobile) { // Close only if successful and on mobile
         onCloseMobileSidebar();
     } else if (!newThreadId) {
         console.error("ThreadsPanel: Failed to create new thread from button click.");
         // Error state should be set by the onNewThread function in ChatPage
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
          // Disable button while user is loading or threads are loading
          className={clsx(
              "flex items-center gap-1.5 text-sm font-medium text-primary bg-primary/10 px-3 py-1.5 rounded-lg transition-colors",
              (loadingThreads || userLoading) ? 'opacity-50 cursor-not-allowed' : 'hover:bg-primary/20'
          )}
          disabled={loadingThreads || userLoading} // Disable if loading anything
        >
          {/* Show a mini spinner if threads are loading */}
          {(loadingThreads && !userLoading) ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          New Thread
        </button>
      </div>

      {/* Scrollable Area */}
      {/* Added pb-4 to ensure last item isn't hidden by scrollbar */ }
      <div className="flex-1 space-y-2 overflow-y-auto scrollbar-thin pr-1 -mr-1 pb-4">
        {/* Loading State */}
        {(loadingThreads || userLoading) && (
          <div className="flex justify-center items-center p-4 text-gray-500">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Loading history...
          </div>
        )}
        {/* Error State (Show if fetch or subscription failed AND we're not currently loading) */}
        {error && !loadingThreads && !userLoading && (
          <div className="flex flex-col items-center text-center text-red-600 py-4 px-2 bg-red-50 rounded-lg border border-red-200">
             <AlertCircle className="w-6 h-6 mb-2 text-red-500"/>
             <p className="text-sm font-medium mb-1">Loading Failed</p>
             <p className="text-xs">{error}</p>
             {/* Consider adding a "Retry" button if the error is likely transient */}
          </div>
        )}
        {/* No User State (Show if user context finished loading and no user is present) */}
        {!loadingThreads && !error && !userLoading && !session?.user && (
          <p className="text-center text-sm text-gray-500 py-4 px-2">Please sign in to see your threads.</p>
        )}
        {/* Empty State (Show if user context finished loading, user is present, no error, and no threads were fetched) */}
        {!loadingThreads && !error && threads.length === 0 && !userLoading && session?.user && (
          <p className="text-center text-sm text-gray-500 py-4 px-2">No chat history yet. Start a new conversation!</p>
        )}
        {/* Threads List (Only show if not loading, no error, and there are threads) */}
        {!loadingThreads && !error && threads.length > 0 && threads.map(thread => (
          <button
            key={thread.id}
            onClick={() => handleThreadClick(thread.id)}
            className={clsx(
              "w-full p-3 rounded-lg cursor-pointer transition-colors border text-left flex items-start gap-3",
              "max-w-md mx-auto", // Added centering styles just in case
              currentThreadId === thread.id
                ? 'bg-primary/10 border-primary/30 shadow-sm'
                : 'bg-white border-gray-200/80 hover:bg-gray-50/80'
            )}
            // ARIA attribute for current selection
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
                 {/* Use formatTimestamp on updated_at or created_at */}
                 Last activity: {formatTimestamp(thread.updated_at || thread.created_at)}
              </p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};

export default ThreadsPanelSidebar;
