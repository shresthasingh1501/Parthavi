// src/components/chat/InitialPlaceholder.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowUp, Sparkles, Plus, Send } from 'lucide-react'; // Added Send

interface InitialPlaceholderProps {
    onPromptClick: (prompt: string) => void;
}

const examplePrompts = [
    "Help me identify my strengths.",
    "How can I ask for a promotion?",
    "Suggest negotiation techniques.",
    "Explore careers in Tech for women.",
    "How to build confidence at work?",
];

const InitialPlaceholder: React.FC<InitialPlaceholderProps> = ({ onPromptClick }) => {
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1, scale: 1,
            transition: { delay: 0.1, duration: 0.5, ease: "easeOut" }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

     const promptVariants = {
        hidden: { opacity: 0, y: 5 },
        visible: (i: number) => ({
            opacity: 1, y: 0,
            transition: { delay: 0.4 + i * 0.07, duration: 0.4 } // Stagger delay
        }),
    };

    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center text-center h-full py-10 px-4 max-w-lg mx-auto" // Constrain width
        >
            {/* Logo/Icon */}
            <motion.div
                variants={itemVariants} transition={{ delay: 0.2, duration: 0.4 }}
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 shadow-sm" // Added subtle shadow
            >
                <Sparkles className="w-8 h-8 text-primary opacity-90" /> {/* Changed Icon */}
            </motion.div>

            {/* Welcome Title */}
            <motion.h2
                 variants={itemVariants} transition={{ delay: 0.3, duration: 0.4 }}
                className="text-2xl md:text-3xl font-serif text-secondary mb-3"
            >
                Unlock Your Career Potential
            </motion.h2>

            {/* Description */}
            <motion.p
                 variants={itemVariants} transition={{ delay: 0.4, duration: 0.4 }}
                className="text-secondary/80 mb-8 text-sm md:text-base leading-relaxed"
            >
                Hi, I'm Parthavi, your AI guide for navigating the professional world.
                Ask me anything, explore topics, or try a suggestion below!
            </motion.p>

             {/* Interaction Guidance - Simplified */}
            <motion.div
                 variants={itemVariants} transition={{ delay: 0.5, duration: 0.4 }}
                className="text-xs text-secondary/60 space-y-2 mb-10"
            >
                <p className="flex items-center justify-center gap-1.5">
                    <Send size={14} /> Type your question below or tap a suggestion to start.
                </p>
                 <p className="flex items-center justify-center gap-1.5">
                    <Sparkles size={14} /> Use <span className='font-medium'>Discover</span> in the sidebar for more ideas.
                </p>
            </motion.div>


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

export default InitialPlaceholder;
