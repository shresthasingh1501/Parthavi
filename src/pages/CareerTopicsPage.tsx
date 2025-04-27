// src/pages/CareerTopicsPage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext'; // Use context
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Search, MessageSquare, FileText, GraduationCap, Users, ShieldCheck, Lightbulb, DollarSign, Briefcase
} from 'lucide-react';
import { useMediaQuery } from 'react-responsive';
import MobileTopicButton from '../components/MobileTopicButton';

// Interface definition (keep as is)
interface CareerItem { /* ... */ }

const CareerTopicsPage: React.FC = () => {
  const { userName } = useUser(); // Get userName from context
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  // items array definition (keep as is)
  const items: CareerItem[] = [ /* ... your items ... */ ];

  // itemVariants definition (keep as is)
  const itemVariants = { /* ... */ };

  // handleItemClick function (keep as is)
  const handleItemClick = (item: CareerItem) => { /* ... */ };

  // handleOwnTopicClick function (keep as is)
  const handleOwnTopicClick = () => { /* ... */ };

  return (
    <PageTransition>
       {/* Ensure bg */}
      <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-background">

        {/* Central Title - Using userName with fallback */}
        <motion.h1
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            // Use secondary color, font-serif
            className="text-2xl md:text-3xl font-serif text-secondary mb-8 text-center"
        >
           {/* Use userName dynamically */}
          Welcome, {userName || 'there'}! How can I help today?
        </motion.h1>

        {/* Conditional Layout (Keep as is) */}
        {isMobile ? (
             // Mobile: Vertical list of buttons
            <div className="w-full max-w-md mx-auto space-y-4 mb-10">
                {items.map((item, index) => (
                    <motion.div
                       key={item.id}
                       custom={index}
                       initial="hidden"
                       animate="visible"
                       variants={itemVariants}
                    >
                        <MobileTopicButton
                            title={item.title}
                            promptText={item.promptTextMobile || item.tagText}
                            icon={item.iconMobile || item.tagIcon}
                            iconColorClass={item.iconColorClassMobile || item.tagColor.replace('bg-', 'text-')}
                            onClick={() => handleItemClick(item)}
                        />
                    </motion.div>
                ))}
            </div>
        ) : (
             // Desktop: Grid layout with TopicCards
             // Keep the existing grid structure from your previous code
            <div className="grid grid-cols-3 gap-4 w-full max-w-4xl mb-10">
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                  className={clsx(
                      "cursor-pointer",
                      item.className // Includes row-span etc.
                    )}
                  onClick={() => handleItemClick(item)}
                >
                   <TopicCard
                      imageUrl={item.imageUrl}
                      title={item.title}
                      tagText={item.tagText}
                      tagIcon={item.tagIcon}
                      tagColor={item.tagColor}
                      size="custom" // Assuming custom size based on screenshot
                       // Adjust aspect ratio if needed based on visual
                      className="w-full h-full aspect-[4/3] md:aspect-[3/2] rounded-2xl"
                   />
                </motion.div>
              ))}
            </div>
        )}


        {/* Bottom Button (Keep as is) */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + items.length * 0.07, duration: 0.5 }}
        >
             {/* Style matches screenshot - light bg, border, dark text */}
            <button
              onClick={handleOwnTopicClick}
              className="bg-white border border-gray-300/80 text-secondary font-medium py-3 px-8 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
            >
              I've got my own topic
            </button>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default CareerTopicsPage;
