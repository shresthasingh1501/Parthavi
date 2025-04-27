import React from 'react';
import { motion } from 'framer-motion';
import { MessageSquare } from 'lucide-react';

interface NewThreadPlaceholderProps {
    onPromptClick: (prompt: string) => void;
}

const examplePrompts = [
    "What are my career options?",
    "Give me interview tips.",
    "Help me write a cover letter.",
    "How to ask for a promotion?",
];

const NewThreadPlaceholder: React.FC<NewThreadPlaceholderProps> = ({ onPromptClick }) => {
    const containerVariants = {
        hidden: { opacity: 0, scale: 0.95 },
        visible: {
            opacity: 1,
            scale: 1,
            transition: { delay: 0.1, duration: 0.4, ease: "easeOut" }
        }
    };

     const promptVariants = {
        hidden: { opacity: 0, y: 5 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: { delay: 0.2 + i * 0.08, duration: 0.4 }
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
            <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-5">
                <MessageSquare className="w-6 h-6 text-primary" />
            </div>

            {/* Welcome Title */}
            <h2 className="text-xl md:text-2xl font-serif text-secondary mb-6">
                Ready for your questions!
            </h2>

            {/* Example Prompts */}
            <div className="flex flex-wrap justify-center gap-2 max-w-lg mx-auto">
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

export default NewThreadPlaceholder;
