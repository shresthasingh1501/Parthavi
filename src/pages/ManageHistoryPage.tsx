// ================================================
// FILE: src/pages/ManageHistoryPage.tsx
// ================================================
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, DownloadCloud, HeartHandshake, Loader2 } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { supabase } from '../lib/supabaseClient';
import { clsx } from 'clsx';

const ManageHistoryPage: React.FC = () => {
    const navigate = useNavigate();
    const { user } = useUser();
    const [isDownloading, setIsDownloading] = useState(false);
    const [downloadError, setDownloadError] = useState<string | null>(null);

    const escapeCsvField = (field: string | null | undefined): string => {
        if (field === null || field === undefined) return '';
        const stringField = String(field);
        if (stringField.includes(',') || stringField.includes('"') || stringField.includes('\n')) {
            return `"${stringField.replace(/"/g, '""')}"`;
        }
        return stringField;
    };

    const handleDownload = async () => {
        if (!user?.id) {
            setDownloadError("User not found. Please sign in again.");
            return;
        }

        setIsDownloading(true);
        setDownloadError(null);

        try {
            const { data: messages, error: fetchError } = await supabase
                .from('messages')
                .select('created_at, role, content')
                .eq('user_id', user.id)
                .order('created_at', { ascending: true });

            if (fetchError) throw fetchError;

            if (!messages || messages.length === 0) {
                alert("No messages found to download.");
                setIsDownloading(false);
                return;
            }

            const headers = ['Timestamp', 'Role', 'Message'];
            const csvRows = messages.map(msg => {
                const timestamp = new Date(msg.created_at).toLocaleString(); // Format timestamp
                return [
                    escapeCsvField(timestamp),
                    escapeCsvField(msg.role),
                    escapeCsvField(msg.content)
                ].join(',');
            });

            const csvContent = [headers.join(','), ...csvRows].join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            const filename = `parthavi_history_${user.id.substring(0, 8)}_${new Date().toISOString().split('T')[0]}.csv`;
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);

        } catch (err) {
            console.error("Error downloading history:", err);
            setDownloadError(err instanceof Error ? `Download failed: ${err.message}` : "An unknown error occurred during download.");
        } finally {
            setIsDownloading(false);
        }
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Manage history</h1>
                </div>

                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <HeartHandshake size={50} className="text-yellow-500 mb-6" strokeWidth={1.5}/>

                    <p className="text-secondary/90 mb-4 leading-relaxed">
                        Parthavi is proud to support the <span className="font-medium">Data Transfer Initiative</span> framework for portability and interoperability of conversational AI chat histories.
                    </p>

                    <p className="text-secondary/80 mb-8 leading-relaxed">
                        You can download your entire chat history with Parthavi in a standard CSV format that you can read easily and bring with you.
                    </p>

                    {downloadError && (
                        <p className="text-red-600 mb-4 text-sm">{downloadError}</p>
                    )}

                    <button
                        onClick={handleDownload}
                        disabled={isDownloading}
                        className={clsx(
                            "flex items-center gap-2 bg-secondary text-white font-medium py-3 px-8 rounded-full shadow-md hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 transition-colors",
                            isDownloading && "opacity-70 cursor-not-allowed"
                        )}
                    >
                        {isDownloading ? (
                            <>
                                <Loader2 size={18} className="animate-spin" />
                                Downloading...
                            </>
                        ) : (
                            <>
                                <DownloadCloud size={18} />
                                Download your Parthavi history (CSV)
                            </>
                        )}
                    </button>
                </div>
            </div>
        </PageTransition>
    );
};

export default ManageHistoryPage;
