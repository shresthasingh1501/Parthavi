// src/components/chat/NewThreadPlaceholder.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Sparkles } from 'lucide-react'; // Replaced icon

interface NewThreadPlaceholderProps {
    onPromptClick: (prompt: string) => void;
}

const examplePrompts = [
    "What are common interview questions?",
    "Draft a follow-up email after interview.",
    "How to handle difficult colleagues?",
    "Suggest ways to improve my resume.",
    "Explain work-life balance strategies.",
];

const NewThreadPlaceholder: React.FC<NewThreadPlaceholderProps> = ({ onPromptClick }) => {
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1, scale: 1,
            transition: { delay: 0.1, duration: 0.4, ease: "easeOut" }
        }
    };

     const promptVariants = {
        hidden: { opacity: 0, y: 5 },
        visible: (i: number) => ({
            opacity: 1, y: 0,
            transition: { delay: 0.2 + i * 0.07, duration: 0.4 } // Faster stagger
        }),
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            // Added max-width
            className="flex flex-col items-center justify-center text-center h-full py-10 px-4 max-w-lg mx-auto"
        >
            {/* Icon */}
            <div className="w-14 h-14 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5 shadow-sm"> {/* Smaller Icon */}
                <MessageSquare className="w-7 h-7 text-primary opacity-90" />
            </div>

            {/* Title */}
            <h2 className="text-xl md:text-2xl font-serif text-secondary mb-3"> {/* Reduced margin */}
                Ready for your brilliance!
            </h2>

            {/* Subtitle */}
            <p className="text-secondary/70 text-sm mb-8">
                What career challenge or question is on your mind today?
            </p>

            {/* Example Prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-xl mx-auto">
                {examplePrompts.map((prompt, index) => (
                     <motion.button
                        key={prompt}
                        custom={index}
                        variants={promptVariants}
                        initial="hidden"
                        animate="visible"
                        whileHover={{ scale: 1.03, backgroundColor: 'rgba(141, 70, 114, 0.1)' }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onPromptClick(prompt)}
                         className="bg-background border border-gray-300/60 text-secondary text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors duration-150 focus:outline-none focus:ring-1 focus:ring-primary/50" // Added focus ring
                    >
                        {prompt}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

export default NewThreadPlaceholder;
