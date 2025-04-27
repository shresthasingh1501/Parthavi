// src/pages/CareerTopicsPage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard'; // Ensure correct import
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import { useMediaQuery } from 'react-responsive';
import MobileTopicButton from '../components/MobileTopicButton';
// Import necessary icons
import {
  Search, MessageSquare, FileText, GraduationCap, Users, ShieldCheck, Briefcase, DollarSign, Lightbulb
} from 'lucide-react';

// Define the structure for the items, including new props
interface CareerItem {
  id: string;
  imageUrl: string;
  title: string;          // e.g., "Job Search"
  tagButtonText: string; // e.g., "Find Job Openings"
  tagButtonIcon: React.ReactNode; // e.g., <Search />
  prompt: string;         // Prompt for AI when clicked
  // Optional: For mobile view if different text/icon needed
  promptTextMobile?: string;
  iconMobile?: React.ReactNode;
  iconColorClassMobile?: string;
}

const CareerTopicsPage: React.FC = () => {
  const { userName } = useUser();
  const navigate = useNavigate();
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });

  // --- Define items based on the reference image ---
  const items: CareerItem[] = [
    {
      id: 'job-search',
      imageUrl: "https://images.pexels.com/photos/3760067/pexels-photo-3760067.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Job Search',
      tagButtonText: 'Find Job Openings',
      tagButtonIcon: <Search size={16} />, // Use Lucide icon directly
      prompt: 'Help me find relevant job openings.',
      promptTextMobile: 'Find relevant job openings', // Shorter for mobile button
      iconMobile: <Search />, // Reuse icon
      iconColorClassMobile: 'text-blue-600', // Example color
    },
    {
      id: 'interviews',
      imageUrl: "https://images.pexels.com/photos/7688160/pexels-photo-7688160.jpeg?auto=compress&cs=tinysrgb&w=600", // Example image
      title: 'Interviews',
      tagButtonText: 'Prepare for Interviews',
      tagButtonIcon: <MessageSquare size={16} />,
      prompt: 'Give me tips to prepare for job interviews.',
      promptTextMobile: 'Get interview preparation tips',
      iconMobile: <MessageSquare />,
      iconColorClassMobile: 'text-green-600',
    },
    {
      id: 'resume-cv',
      imageUrl: "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Resume/CV',
      tagButtonText: 'Build Your Resume/CV',
      tagButtonIcon: <FileText size={16} />,
      prompt: 'Help me build or improve my resume/CV.',
      promptTextMobile: 'Build or improve resume/CV',
      iconMobile: <FileText />,
      iconColorClassMobile: 'text-purple-600',
    },
    {
      id: 'skills',
      imageUrl: "https://images.pexels.com/photos/3184431/pexels-photo-3184431.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Skills',
      tagButtonText: 'Develop Career Skills',
      tagButtonIcon: <GraduationCap size={16} />,
      prompt: 'Suggest ways to develop important career skills.',
      promptTextMobile: 'Develop important career skills',
      iconMobile: <GraduationCap />,
      iconColorClassMobile: 'text-teal-600',
    },
     {
      id: 'salary',
      imageUrl: "https://images.pexels.com/photos/7792773/pexels-photo-7792773.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Salary',
      tagButtonText: 'Salary Negotiation',
      tagButtonIcon: <DollarSign size={16} />,
      prompt: 'How can I effectively negotiate my salary?',
      promptTextMobile: 'Learn salary negotiation techniques',
      iconMobile: <DollarSign />,
      iconColorClassMobile: 'text-yellow-600',
    },
     {
      id: 'networking',
      imageUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Networking',
      tagButtonText: 'Networking & Mentorship',
      tagButtonIcon: <Users size={16} />,
      prompt: 'Provide strategies for networking and finding mentorship.',
      promptTextMobile: 'Strategies for networking/mentorship',
      iconMobile: <Users />,
      iconColorClassMobile: 'text-pink-600', // Use primary or other color
    },
    {
      id: 'challenges',
      imageUrl: "https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Challenges',
      tagButtonText: 'Handle Workplace Issues',
      tagButtonIcon: <ShieldCheck size={16} />,
      prompt: 'Give advice on handling common workplace issues.',
      promptTextMobile: 'Handle common workplace issues',
      iconMobile: <ShieldCheck />,
      iconColorClassMobile: 'text-red-600',
    },
    {
      id: 'career-paths',
      imageUrl: "https://images.pexels.com/photos/1181271/pexels-photo-1181271.jpeg?auto=compress&cs=tinysrgb&w=800", // Example image
      title: 'Career Paths',
      tagButtonText: 'Explore Career Options',
      tagButtonIcon: <Lightbulb size={16} />, // Changed icon
      prompt: 'Help me explore different career options based on my interests.',
      promptTextMobile: 'Explore different career options',
      iconMobile: <Lightbulb />,
      iconColorClassMobile: 'text-orange-600',
    },
     // --- Add a filler item if needed to make grid even, or adjust col-span ---
     // Example: Could add a 9th item or make one span 2 columns on larger screens
     // For now, we'll let the grid handle uneven items.
  ];
  // --- End items definition ---

  const itemVariants = {
    hidden: { opacity: 0, y: 15, scale: 0.98 },
    visible: (i: number) => ({
        opacity: 1,
        y: 0,
        scale: 1,
        transition: {
            delay: i * 0.06, // Slightly faster stagger
            duration: 0.4,
            ease: "easeOut"
        }
    }),
  };

  const handleItemClick = (prompt: string) => {
    console.log(`Career topic clicked. Prompt: "${prompt}"`);
    // Navigate to chat page and pass the prompt as state
    navigate('/chat', { state: { initialPrompt: prompt } });
  };

  const handleOwnTopicClick = () => {
     console.log("Own topic clicked. Navigating to chat without initial prompt.");
    // Navigate to chat page without any specific prompt
    navigate('/chat');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center p-6 md:p-10 bg-background"> {/* Center content vertically too */}

        {/* Central Title */}
        <motion.h1
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl md:text-3xl font-serif text-secondary mb-8 md:mb-10 text-center" // Increased bottom margin
        >
          Welcome, {userName || 'there'}! How can I help today?
        </motion.h1>

        {/* Conditional Layout */}
        {isMobile ? (
            // Mobile: Vertical list of buttons
            <div className="w-full max-w-md mx-auto space-y-3 mb-8"> {/* Reduced spacing */}
                {items.map((item, index) => (
                    <motion.div
                       key={item.id}
                       custom={index}
                       initial="hidden"
                       animate="visible"
                       variants={itemVariants}
                    >
                        <MobileTopicButton
                            // Use specific mobile properties if available, otherwise fall back
                            title={item.title} // Use main title for the button heading
                            promptText={item.promptTextMobile || item.prompt} // Use mobile prompt or main prompt
                            icon={item.iconMobile || item.tagButtonIcon} // Use mobile icon or tag button icon
                            iconColorClass={item.iconColorClassMobile || 'text-primary'} // Use mobile color or default
                            onClick={() => handleItemClick(item.prompt)}
                        />
                    </motion.div>
                ))}
            </div>
        ) : (
             // Desktop: Grid layout with TopicCards
             // Use grid, define columns (e.g., 3), and add gap
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-5 w-full max-w-6xl mb-10"> {/* Responsive columns & wider max-width */}
              {items.map((item, index) => (
                <motion.div
                  key={item.id}
                  custom={index}
                  initial="hidden"
                  animate="visible"
                  variants={itemVariants}
                >
                   <TopicCard
                      imageUrl={item.imageUrl}
                      title={item.title}
                      tagButtonText={item.tagButtonText}
                      tagButtonIcon={item.tagButtonIcon}
                      overlayStyle="title-with-tag-button" // Use the new style
                      size="medium" // Let aspect ratio control height
                      className="w-full h-full" // Ensure it fills the grid cell
                      onClick={() => handleItemClick(item.prompt)}
                   />
                </motion.div>
              ))}
            </div>
        )}


        {/* Bottom Button */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + items.length * 0.06, duration: 0.5 }}
            className="mt-auto pt-6" // Push button towards bottom if content is short
        >
            <button
              onClick={handleOwnTopicClick}
              // Style matching reference image button
              className="bg-white border border-gray-300/80 text-secondary font-medium py-2.5 px-6 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200 text-sm md:text-base"
            >
              I've got my own topic
            </button>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default CareerTopicsPage;
