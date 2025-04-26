// src/components/sidebar_panels/DiscoverPanel.tsx
import React from 'react';
import TopicCard from '../TopicCard';
import { useUser } from '../../context/UserContext';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion'; // Import motion

const DiscoverPanel = () => {
    const { userName } = useUser();
    const currentHour = new Date().getHours();
    let greeting = "Hello";
    if (currentHour < 12) {
        greeting = "Good morning";
    } else if (currentHour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

    // Animation variants for list items
    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: (i: number) => ({ // Custom function to stagger delay
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.08, // Stagger delay based on index
                duration: 0.4,
                ease: "easeOut"
            }
        }),
    };

  return (
    // Added custom scrollbar styling class if needed globally or locally
    <div className="p-4 space-y-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent -mr-1 pr-1">
        <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xl font-semibold font-serif text-secondary pl-1" // Added padding for alignment
        >
             {greeting}, {userName || 'there'}!
        </motion.h2>

        {/* Start a new conversation box - remains similar */}
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm space-y-3"
        >
            <div className='flex items-center gap-3'>
                <div className="bg-purple-100 p-2 rounded-full">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-secondary text-base">Start a new conversation</h3>
            </div>
             <p className="text-sm text-gray-600">Explore career paths, get interview tips, or discuss work challenges.</p>
            <button className="text-sm font-medium text-primary hover:underline px-1">
                Ask Parthavi anything
            </button>
        </motion.div>

        {/* New Dynamic Topic Layout */}
        <div className="space-y-4">
            {/* Section 1: Wide Card */}
            <motion.div custom={0} initial="hidden" animate="visible" variants={itemVariants}>
                 <TopicCard
                    imageUrl="https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=800"
                    title="Navigate Your Career Crossroads"
                    size="custom"
                    className="h-36 w-full" // Full width, specific height
                 />
            </motion.div>

            {/* Section 2: Two medium cards side-by-side */}
            <div className="grid grid-cols-2 gap-4">
                <motion.div custom={1} initial="hidden" animate="visible" variants={itemVariants}>
                    <TopicCard
                        imageUrl="https://images.pexels.com/photos/7688160/pexels-photo-7688160.jpeg?auto=compress&cs=tinysrgb&w=600"
                        title="Boost Your Interview Confidence"
                        size="custom"
                        className="h-48" // Taller card
                    />
                </motion.div>
                 <motion.div custom={2} initial="hidden" animate="visible" variants={itemVariants}>
                    <TopicCard
                        imageUrl="https://images.pexels.com/photos/5668858/pexels-photo-5668858.jpeg?auto=compress&cs=tinysrgb&w=600"
                        title="Master Difficult Workplace Conversations"
                        size="custom"
                        className="h-48" // Matching height
                    />
                </motion.div>
            </div>

            {/* Section 3: Mixed - One larger, one smaller */}
             <div className="grid grid-cols-5 gap-4">
                <motion.div className="col-span-3" custom={3} initial="hidden" animate="visible" variants={itemVariants}>
                     <TopicCard
                        imageUrl="https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=800"
                        title="Find Your Ideal Work-Life Balance"
                        size="custom"
                        className="h-40" // Medium height, wider span
                    />
                </motion.div>
                 <motion.div className="col-span-2" custom={4} initial="hidden" animate="visible" variants={itemVariants}>
                    <TopicCard
                        imageUrl="https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=600"
                        title="Unlock Your Creative Potential"
                        size="custom"
                        className="h-40" // Same height, narrower span
                    />
                 </motion.div>
            </div>

             {/* Section 4: Another Wide Card */}
             <motion.div custom={5} initial="hidden" animate="visible" variants={itemVariants}>
                 <TopicCard
                    imageUrl="https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800"
                    title="Expand Your Professional Network"
                    size="custom"
                    className="h-44 w-full" // Different height, full width
                 />
            </motion.div>

        </div>
    </div>
  );
};

export default DiscoverPanel;
