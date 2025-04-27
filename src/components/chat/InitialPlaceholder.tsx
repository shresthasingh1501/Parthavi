import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, ArrowUp, Sparkles, Plus } from 'lucide-react';

interface InitialPlaceholderProps {
    onPromptClick: (prompt: string) => void;
}

const examplePrompts = [
    "Help me prepare for a job interview.",
    "How can I negotiate a higher salary?",
    "Suggest career paths based on my skills.",
    "How to handle workplace conflicts?",
];

const InitialPlaceholder: React.FC<InitialPlaceholderProps> = ({ onPromptClick }) => {
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { delay: 0.2, duration: 0.5, ease: "easeOut" }
        }
    };

    const itemVariants = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0 }
    };

    const promptVariants = {
        hidden: { opacity: 0, y: 5 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.5 + i * 0.08, duration: 0.4 }
        }),
    };


    return (
        <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex flex-col items-center justify-center text-center h-full py-10 px-4"
        >
            {/* Logo/Icon */}
            <motion.div
                variants={itemVariants} transition={{ delay: 0.3, duration: 0.4 }}
                className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
            >
                <MessageSquare className="w-8 h-8 text-primary" />
            </motion.div>

            {/* Welcome Title */}
            <motion.h2
                 variants={itemVariants} transition={{ delay: 0.4, duration: 0.4 }}
                className="text-2xl md:text-3xl font-serif text-secondary mb-3"
            >
                Hi I'm Parthavi!
            </motion.h2>

            {/* Description */}
            <motion.p
                 variants={itemVariants} transition={{ delay: 0.5, duration: 0.4 }}
                className="text-secondary/80 mb-8 max-w-lg mx-auto text-sm md:text-base leading-relaxed"
            >
                I am your partner for career guidance,
                Ask questions, explore topics, or get advice to navigate your professional journey.
            </motion.p>

             {/* Interaction Guidance */}
            <motion.div
                 variants={itemVariants} transition={{ delay: 0.6, duration: 0.4 }}
                className="text-xs text-secondary/60 space-y-2 mb-10 max-w-md mx-auto"
            >
                <p className="flex items-center justify-center gap-1.5">
                    <ArrowUp size={14} /> Type your message below to start chatting.
                </p>
                 <p className="flex items-center justify-center gap-1.5">
                    <Sparkles size={14} /> Use the <span className='font-medium'>Discover</span> panel for topic ideas.
                </p>
                 <p className="flex items-center justify-center gap-1.5">
                    <Plus size={14} /> Start a <span className='font-medium'>New Thread</span> anytime from the Threads panel.
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
                        whileHover={{ scale: 1.03, backgroundColor: 'rgba(141, 70, 114, 0.1)' }} // primary/10
                        whileTap={{ scale: 0.98 }}
                        onClick={() => onPromptClick(prompt)}
                        className="bg-background border border-gray-300/60 text-secondary text-xs sm:text-sm px-3 py-1.5 rounded-full transition-colors duration-150"
                    >
                        {prompt}
                    </motion.button>
                ))}
            </div>
        </motion.div>
    );
};

export default InitialPlaceholder;
