// src/pages/AccountPage.tsx
import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import { ArrowLeft } from 'lucide-react';

const AccountPage: React.FC = () => {
    const { userName } = useUser();
    const navigate = useNavigate();
    const messageCount = 2; // Dummy data

    const handleSignOut = () => {
        console.log("Signing out...");
        // Add actual sign out logic here
        navigate('/');
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                {/* Back Button and Title */}
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate('/chat')} // Navigate back to chat or use history.back()
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Account</h1>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-md mx-auto">
                    <p className="text-sm text-secondary/70 mb-4">
                        Signed in as {userName || 'User'}
                    </p>

                    <h2 className="text-3xl md:text-4xl font-serif text-secondary mb-3">
                        We've exchanged {messageCount} messages!
                    </h2>

                    <Link
                        to="/history"
                        className="text-primary hover:underline font-medium mb-10 text-sm"
                    >
                        Manage history
                    </Link>

                    <button
                        onClick={handleSignOut}
                        className="px-6 py-2.5 border border-gray-300 rounded-full text-secondary hover:bg-gray-50 transition-colors text-sm font-medium"
                    >
                        Sign out
                    </button>
                </div>
            </div>
        </PageTransition>
    );
};

export default AccountPage;
