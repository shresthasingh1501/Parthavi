// src/components/sidebar_panels/DiscoverPanel.tsx
import React from 'react';
import TopicCard from '../TopicCard';
import { useUser } from '../../context/UserContext';
import { MessageSquare } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useMediaQuery } from 'react-responsive';
import MobileTopicButton from '../MobileTopicButton';
import { clsx } from 'clsx';
import {
    Search, FileText, GraduationCap, Users, ShieldCheck, Lightbulb, DollarSign, Clock // <-- Add Clock here
} from 'lucide-react';


interface DiscoverPanelProps {
    onCloseMobileSidebar: () => void;
}

// Structure for Discover items
interface DiscoverItem {
    id: string;
    title: string; // Main title on the card
    imageUrl: string; // Image for desktop card
    prompt: string; // The actual prompt text to send to chat
    // Properties for Mobile Button (used when isMobile is true)
    mobileButtonText?: string; // Shorter text for mobile button if needed, defaults to prompt
    mobileButtonIcon?: React.ReactNode; // Icon for mobile button, defaults to generic MessageSquare
    mobileButtonIconColorClass?: string; // Color for mobile icon, defaults to text-primary
    // Properties for Desktop Tag (used when isMobile is false and overlayStyle is 'gradient')
    desktopTagText: string; // Text inside the tag bubble
    desktopTagIcon: React.ReactNode; // Icon for the tag bubble
    desktopTagColorClass: string; // Background color class for the tag bubble
    className?: string; // For desktop grid layout (row-span etc.)
}


const DiscoverPanel: React.FC<DiscoverPanelProps> = ({ onCloseMobileSidebar }) => {
    const { userName } = useUser();
    const navigate = useNavigate();
    const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

    const currentHour = new Date().getHours();
    let greeting = "Hello";
    if (currentHour < 12) {
        greeting = "Good morning";
    } else if (currentHour < 18) {
        greeting = "Good afternoon";
    } else {
        greeting = "Good evening";
    }

    const itemVariants = {
        hidden: { opacity: 0, y: 15 },
        visible: (i: number) => ({
            opacity: 1,
            y: 0,
            transition: {
                delay: i * 0.08,
                duration: 0.4,
                ease: "easeOut"
            }
        }),
    };

    // Data for Discover Panel items - Updated with desktop tag properties
    const discoverItems: DiscoverItem[] = [
        {
            id: 'career-crossroads',
            title: "Navigate Your Career Crossroads",
            imageUrl: "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=800",
            prompt: "Help me figure out my next career move.",
            mobileButtonText: "Figure out my next career move", // Shorter mobile text
            desktopTagText: "Next Career Move", // Tag text for desktop bubble
            desktopTagIcon: <Lightbulb size={14} className="text-amber-500" />, // Example icon
            desktopTagColorClass: "bg-amber-100", // Example color
            className: 'row-span-1',
        },
        {
            id: 'interview-confidence',
            title: "Boost Your Interview Confidence",
            imageUrl: "https://images.pexels.com/photos/7688160/pexels-photo-7688160.jpeg?auto=compress&cs=tinysrgb&w=600",
            prompt: "Give me tips to boost my interview confidence.",
            mobileButtonText: "Tips to boost interview confidence",
            desktopTagText: "Interview Confidence",
            desktopTagIcon: <MessageSquare size={14} className="text-green-600" />,
            desktopTagColorClass: "bg-green-100",
            className: 'row-span-1',
        },
         {
            id: 'workplace-conversations',
            title: "Master Difficult Workplace Conversations",
            // Using a potentially more reliable image URL
            imageUrl: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=600", // <-- Updated Image URL
            prompt: "How can I master difficult conversations in the workplace?",
            mobileButtonText: "Master difficult workplace conversations",
            desktopTagText: "Workplace Conversations",
            desktopTagIcon: <ShieldCheck size={14} className="text-rose-500" />,
            desktopTagColorClass: "bg-rose-100",
            className: 'row-span-1',
        },
         {
            id: 'work-life-balance',
            title: "Find Your Ideal Work-Life Balance",
            imageUrl: "https://images.pexels.com/photos/4050315/pexels-photo-4050315.jpeg?auto=compress&cs=tinysrgb&w=800",
            prompt: "Help me find my ideal work-life balance.",
            mobileButtonText: "Find my ideal work-life balance",
            desktopTagText: "Work-Life Balance",
            desktopTagIcon: <Clock size={14} className="text-blue-600" />, // Example Icon
            desktopTagColorClass: "bg-blue-100", // Example Color
            className: 'col-span-3 h-40', // Adjusted for the 3/2 grid span
        },
         {
            id: 'creative-potential',
            title: "Unlock Your Creative Potential",
            imageUrl: "https://images.pexels.com/photos/1181354/pexels-photo-1181354.jpeg?auto=compress&cs=tinysrgb&w=600",
            prompt: "How do I unlock my creative potential in my career?",
            mobileButtonText: "Unlock my creative potential",
            desktopTagText: "Creative Potential",
            desktopTagIcon: <Lightbulb size={14} className="text-purple-500" />, // Example Icon
            desktopTagColorClass: "bg-purple-100", // Example Color
            className: 'col-span-2 h-40', // Adjusted for the 3/2 grid span
        },
         {
            id: 'professional-network',
            title: "Expand Your Professional Network",
            imageUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800",
            prompt: "What are the best ways to expand my professional network?",
            mobileButtonText: "Expand my professional network",
            desktopTagText: "Expand Network",
            desktopTagIcon: <Users size={14} className="text-primary" />,
            desktopTagColorClass: "bg-accent/80", // Using theme accent color
            className: 'row-span-1 w-full', // Full width row
        },
    ];

    // Handle click for any discover topic card/button
    const handleItemClick = (prompt: string) => {
        console.log(`Discover Item Clicked. Prompt to send: "${prompt}", Navigating to chat...`);
        navigate('/chat', { state: { initialPrompt: prompt } });
        if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar on mobile after navigating
        }
    };

     // Handle click for the "Start a new conversation" button
     const handleNewConversationClick = () => {
        console.log("Start new conversation clicked, navigating to chat...");
        navigate('/chat'); // Navigate without a prompt
         if (isMobile) {
            onCloseMobileSidebar(); // Close sidebar on mobile after navigating
        }
     };


  return (
    <div className="p-4 space-y-6 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-200 scrollbar-track-transparent -mr-1 pr-1">
        <motion.h2
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-xl font-semibold font-serif text-secondary pl-1"
        >
             {greeting}, {userName || 'there'}!
        </motion.h2>

        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            className="bg-white rounded-xl p-4 border border-gray-200/80 shadow-sm space-y-3 w-full max-w-md mx-auto"
        >
            <div className='flex items-center gap-3'>
                <div className="bg-purple-100 p-2 rounded-full">
                    <MessageSquare className="w-5 h-5 text-purple-600" />
                </div>
                <h3 className="font-semibold text-secondary text-base">Start a new conversation</h3>
            </div>
             <p className="text-sm text-gray-600">Explore career paths, get interview tips, or discuss work challenges.</p>
            <button
                 onClick={handleNewConversationClick}
                 className="text-sm font-medium text-primary hover:underline px-1"
             >
                Ask Parthavi anything
            </button>
        </motion.div>

        {isMobile ? (
            // Mobile: Vertical list of prompt buttons
            <div className="space-y-4">
                 {discoverItems.map((item, index) => (
                    <motion.div
                       key={item.id}
                       custom={index}
                       initial="hidden"
                       animate="visible"
                       variants={itemVariants}
                       className="w-full max-w-xs mx-auto"
                    >
                        <MobileTopicButton
                            title={item.title}
                            promptText={item.mobileButtonText || item.prompt}
                            icon={item.mobileButtonIcon || item.desktopTagIcon || <MessageSquare />}
                            iconColorClass={item.mobileButtonIconColorClass || item.desktopTagColorClass?.replace('bg-', 'text-') || 'text-primary'}
                            onClick={() => handleItemClick(item.prompt)}
                        />
                    </motion.div>
                 ))}
            </div>
        ) : (
            // Desktop: Grid layout with TopicCards
             <div className="grid grid-cols-3 gap-4 w-full max-w-4xl mx-auto">
              {/* Row 1: Full width card */}
              <motion.div key={discoverItems[0].id} custom={0} initial="hidden" animate="visible" variants={itemVariants} className="col-span-3">
                  <TopicCard
                    imageUrl={discoverItems[0].imageUrl}
                    title={discoverItems[0].title}
                    tagText={discoverItems[0].desktopTagText}
                    tagIcon={discoverItems[0].desktopTagIcon}
                    tagColor={discoverItems[0].desktopTagColorClass}
                    overlayStyle="gradient"
                    size="custom"
                    className="h-36 w-full rounded-2xl"
                    onClick={() => handleItemClick(discoverItems[0].prompt)}
                  />
              </motion.div>

              {/* Row 2: Two cards */}
              <motion.div key={`${discoverItems[1].id}-${discoverItems[2].id}`} custom={1} initial="hidden" animate="visible" variants={itemVariants} className="col-span-3 grid grid-cols-2 gap-4">
                 <TopicCard
                    imageUrl={discoverItems[1].imageUrl}
                    title={discoverItems[1].title}
                    tagText={discoverItems[1].desktopTagText}
                    tagIcon={discoverItems[1].desktopTagIcon}
                    tagColor={discoverItems[1].desktopTagColorClass}
                    overlayStyle="gradient"
                    size="custom"
                    className="h-48 rounded-2xl"
                    onClick={() => handleItemClick(discoverItems[1].prompt)}
                 />
                 <TopicCard
                    imageUrl={discoverItems[2].imageUrl}
                    title={discoverItems[2].title}
                    tagText={discoverItems[2].desktopTagText}
                    tagIcon={discoverItems[2].desktopTagIcon}
                    tagColor={discoverItems[2].desktopTagColorClass}
                    overlayStyle="gradient"
                    size="custom"
                    className="h-48 rounded-2xl"
                    onClick={() => handleItemClick(discoverItems[2].prompt)}
                 />
              </motion.div>

               {/* Row 3: Mixed - One wider, one narrower */}
              <motion.div key={`${discoverItems[3].id}-${discoverItems[4].id}`} custom={2} initial="hidden" animate="visible" variants={itemVariants} className="col-span-3 grid grid-cols-5 gap-4">
                  <div className={clsx("col-span-3", discoverItems[3].className)}>
                      <TopicCard
                         imageUrl={discoverItems[3].imageUrl}
                         title={discoverItems[3].title}
                         tagText={discoverItems[3].desktopTagText}
                         tagIcon={discoverItems[3].desktopTagIcon}
                         tagColor={discoverItems[3].desktopTagColorClass}
                         overlayStyle="gradient"
                         size="custom"
                         className="h-40 w-full rounded-2xl"
                         onClick={() => handleItemClick(discoverItems[3].prompt)}
                     />
                  </div>
                  <div className={clsx("col-span-2", discoverItems[4].className)}>
                      <TopicCard
                         imageUrl={discoverItems[4].imageUrl}
                         title={discoverItems[4].title}
                         tagText={discoverItems[4].desktopTagText}
                         tagIcon={discoverItems[4].desktopTagIcon}
                         tagColor={discoverItems[4].desktopTagColorClass}
                         overlayStyle="gradient"
                         size="custom"
                         className="h-40 w-full rounded-2xl"
                         onClick={() => handleItemClick(discoverItems[4].prompt)}
                      />
                  </div>
              </motion.div>

               {/* Row 4: Full width card */}
               <motion.div key={discoverItems[5].id} custom={3} initial="hidden" animate="visible" variants={itemVariants} className="col-span-3">
                   <TopicCard
                     imageUrl={discoverItems[5].imageUrl}
                     title={discoverItems[5].title}
                     tagText={discoverItems[5].desktopTagText}
                     tagIcon={discoverItems[5].desktopTagIcon}
                     tagColor={discoverItems[5].desktopTagColorClass}
                     overlayStyle="gradient"
                     size="custom"
                     className="h-44 w-full rounded-2xl"
                     onClick={() => handleItemClick(discoverItems[5].prompt)}
                  />
               </motion.div>

            </div>
        )}
    </div>
  );
};

export default DiscoverPanel;
