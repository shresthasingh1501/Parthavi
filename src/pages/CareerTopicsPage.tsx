// src/pages/CareerTopicsPage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import { useNavigate } from 'react-router-dom';
import { clsx } from 'clsx';
import {
  Search, MessageSquare, FileText, GraduationCap, Users, ShieldCheck, Lightbulb, DollarSign, Clock, Briefcase // Added Briefcase back for consistency
} from 'lucide-react';

// Interface now uses tag properties instead of prompt
interface CareerItem {
    id: string;
    // type: 'image'; // All are images now
    title: string; // Title shown above tag
    imageUrl: string;
    tagText: string; // Text inside the tag bubble
    tagIcon: React.ReactNode; // Icon for the tag bubble
    tagColor: string; // Background color class for the tag bubble
    className?: string; // For grid spanning etc.
}

const CareerTopicsPage: React.FC = () => {
  const { userName } = useUser();
  const navigate = useNavigate();

  const salaryImageUrl = "https://images.pexels.com/photos/7551668/pexels-photo-7551668.jpeg?auto=compress&cs=tinysrgb&w=600";

  // --- Define RELEVANT Career Items with TAG data ---
  const items: CareerItem[] = [
     {
         id: 'job-search',
         title: 'Job Search', // Shorter title for overlay
         imageUrl: 'https://images.pexels.com/photos/3182826/pexels-photo-3182826.jpeg?auto=compress&cs=tinysrgb&w=600',
         tagText: "Find Job Openings",
         tagIcon: <Search size={14} className="text-blue-600" />,
         tagColor: "bg-blue-100",
         className: 'row-span-1',
     },
     {
        id: 'interview-prep',
        title: 'Interviews',
        imageUrl: 'https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600',
        tagText: "Prepare for Interviews",
        tagIcon: <MessageSquare size={14} className="text-green-600" />,
        tagColor: "bg-green-100",
        className: 'row-span-1',
     },
     {
        id: 'resume-cv',
        title: 'Resume/CV',
        imageUrl: 'https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600',
        tagText: "Build Your Resume/CV",
        tagIcon: <FileText size={14} className="text-purple-600" />,
        tagColor: "bg-purple-100",
        className: 'row-span-1',
     },
      { // Keeping this larger one
        id: 'skill-dev',
        title: 'Skills',
        imageUrl: 'https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=800',
        tagText: "Develop Career Skills",
        tagIcon: <GraduationCap size={14} className="text-emerald-600" />,
        tagColor: "bg-emerald-100",
        className: 'row-span-2', // Spanning two rows
     },
     {
        id: 'salary-negotiation',
        title: 'Salary',
        imageUrl: salaryImageUrl,
        tagText: "Salary Negotiation",
        tagIcon: <DollarSign size={14} className="text-lime-600" />,
        tagColor: "bg-lime-100",
        className: 'row-span-1',
     },
     {
        id: 'mentorship-networking',
        title: 'Networking',
        imageUrl: 'https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=600',
        tagText: "Networking & Mentorship",
        tagIcon: <Users size={14} className="text-primary" />,
        tagColor: "bg-accent/80", // Using theme accent color
        className: 'row-span-1',
     },
     {
        id: 'workplace-challenges',
        title: 'Challenges',
        imageUrl: 'https://images.pexels.com/photos/3184339/pexels-photo-3184339.jpeg?auto=compress&cs=tinysrgb&w=600',
        tagText: "Handle Workplace Issues",
        tagIcon: <ShieldCheck size={14} className="text-rose-500" />,
        tagColor: "bg-rose-100",
        className: 'row-span-1',
     },
     {
        id: 'explore-paths',
        title: 'Career Paths',
        imageUrl: 'https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=600',
        tagText: "Explore Career Options",
        tagIcon: <Lightbulb size={14} className="text-amber-500" />,
        tagColor: "bg-amber-100",
        className: 'row-span-1',
     },
     // Removed 9th/10th items to match screenshot's 8 cards + button layout
  ];

  // Animation variants remain the same
  const itemVariants = {
      hidden: { opacity: 0, y: 20, scale: 0.95 },
      visible: (i: number) => ({
          opacity: 1,
          y: 0,
          scale: 1,
          transition: {
              delay: 0.1 + i * 0.07,
              duration: 0.4,
              ease: "easeOut"
          }
      }),
  };

  const handleItemClick = (item: CareerItem) => {
     // Send tagText as the prompt, as it's more descriptive now
     const chatPrompt = item.tagText;
     console.log(`Selected: ${item.title}, Prompt to send: "${chatPrompt}", Navigating to chat...`);
     navigate('/chat');
  }

  const handleOwnTopicClick = () => {
    console.log("User has own topic, navigating to chat...");
    navigate('/chat');
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 md:p-10 bg-background">

        {/* Central Title - Using userName with fallback */}
        <motion.h1
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="text-2xl md:text-3xl font-serif text-secondary mb-8 text-center"
        >
          {/* Added fallback for userName */}
          Welcome, {userName || 'there'}! How can I help today?
        </motion.h1>

        {/* Grid Container */}
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
              {/* Render TopicCard using tag properties */}
               <TopicCard
                  imageUrl={item.imageUrl}
                  title={item.title} // Title above tag
                  tagText={item.tagText} // Text in tag
                  tagIcon={item.tagIcon} // Icon in tag
                  tagColor={item.tagColor} // Bg color of tag
                  // overlayStyle="gradient" // Default, no need to set explicitly
                  size="custom"
                  className="w-full h-full aspect-[4/3] md:aspect-[3/2] rounded-2xl"
               />
            </motion.div>
          ))}
        </div>

        {/* Bottom Button */}
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + items.length * 0.07, duration: 0.5 }}
        >
            <button
              onClick={handleOwnTopicClick}
              className="bg-background border border-gray-300/80 text-secondary font-medium py-3 px-8 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary/30 transition-all duration-200"
            >
              I've got my own topic
            </button>
        </motion.div>
      </div>
    </PageTransition>
  );
};

export default CareerTopicsPage;
