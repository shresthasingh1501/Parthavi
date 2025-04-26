// src/pages/FeedbackPage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import { ArrowLeft, MessageSquare } from 'lucide-react';

const FeedbackPage: React.FC = () => {
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!feedback.trim()) {
            alert("Please enter your feedback before submitting.");
            return;
        }
        alert("Thank you for your feedback! (Submission not implemented yet).");
        console.log("Feedback submitted:", feedback);
        setFeedback('');
    };

    return (
        <PageTransition>
            <div className="min-h-screen flex flex-col p-6 md:p-10 bg-background">
                {/* Header */}
                 <div className="flex items-center mb-8">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 rounded-full hover:bg-gray-100 mr-3"
                        aria-label="Back"
                    >
                        <ArrowLeft size={20} className="text-secondary" />
                    </button>
                    <h1 className="text-xl font-semibold font-serif text-secondary">Give feedback</h1>
                </div>

                {/* Main Content Area - Centered */}
                <div className="flex-1 flex flex-col items-center justify-center text-center max-w-xl mx-auto w-full">
                    {/* Icon uses new primary (mauve) in new accent bg */}
                     <div className="p-3 bg-accent/60 rounded-full mb-6 inline-block">
                         <MessageSquare size={32} className="text-primary" />
                     </div>

                     {/* Text uses new secondary */}
                     <p className="text-secondary/85 mb-8 text-base leading-relaxed">
                        Your feedback helps us improve Parthavi! Let us know what you think, report issues, or suggest new features.
                    </p>
                    <form onSubmit={handleSubmit} className="w-full space-y-6">
                        <div>
                            {/* Textarea focus uses new primary */}
                            <textarea
                                id="feedback-text"
                                rows={8}
                                placeholder="Share your thoughts here..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="w-full px-4 py-3 border border-gray-300/80 rounded-xl focus:ring-2 focus:ring-primary/50 focus:border-primary/80 text-base bg-white shadow-sm placeholder-gray-400"
                            />
                        </div>
                        <button
                            type="submit"
                            // Use new action button (green)
                            className="button-action w-full max-w-xs mx-auto !py-3.5 text-base"
                            disabled={!feedback.trim()}
                        >
                            Submit Feedback
                        </button>
                    </form>
                </div>
            </div>
        </PageTransition>
    );
};

export default FeedbackPage;
