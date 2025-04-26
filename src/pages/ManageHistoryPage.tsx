// src/pages/ManageHistoryPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, DownloadCloud, HeartHandshake } from 'lucide-react'; // Example icon

const ManageHistoryPage: React.FC = () => {
    const navigate = useNavigate();

    const handleDownload = () => {
        console.log("Downloading history...");
        // Add actual download logic here (e.g., fetch data, create file)
        alert("Download functionality not implemented yet.");
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                {/* Back Button and Title */}
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate(-1)} // Go back to previous page
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Manage history</h1>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-lg mx-auto">
                    <HeartHandshake size={50} className="text-yellow-500 mb-6" strokeWidth={1.5}/>

                    <p className="text-secondary/90 mb-4 leading-relaxed">
                        Parthavi is proud to support the <span className="font-medium">Data Transfer Initiative</span> framework for portability and interoperability of conversational AI chat histories.
                    </p>

                    <p className="text-secondary/80 mb-8 leading-relaxed">
                        You can download your entire chat history with Parthavi in a format you can read easily and bring with you.
                    </p>

                    <button
                        onClick={handleDownload}
                        className="flex items-center gap-2 bg-secondary text-white font-medium py-3 px-8 rounded-full shadow-md hover:bg-secondary/90 focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-opacity-50 transition-colors"
                    >
                        <DownloadCloud size={18} />
                        Download your Parthavi history
                    </button>
                </div>
            </div>
        </PageTransition>
    );
};

export default ManageHistoryPage;
