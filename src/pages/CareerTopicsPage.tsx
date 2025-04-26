import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import NextButton from '../components/NextButton';
import {
  Briefcase,
  GraduationCap,
  Search,
  MessageSquare,
  Users,
  FileText,
  ShieldCheck,
  Lightbulb
} from 'lucide-react';
import { useNavigate } from 'react-router-dom'; // Ensure useNavigate is imported

const CareerTopicsPage: React.FC = () => {
  const { userName } = useUser();
  const navigate = useNavigate(); // Hook for navigation

  const careerTopics = [
    {
      id: 'job-search',
      imageUrl: "https://images.pexels.com/photos/3182826/pexels-photo-3182826.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Job Search & Listings",
      tagIcon: <Search className="w-4 h-4 text-blue-600" />,
      tagColor: "bg-blue-100",
      size: 'medium' as const
    },
    {
      id: 'interview-prep',
      imageUrl: "https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Interview Preparation",
      tagIcon: <MessageSquare className="w-4 h-4 text-green-600" />,
      tagColor: "bg-green-100",
      size: 'medium' as const
    },
    {
      id: 'resume-cv',
      imageUrl: "https://images.pexels.com/photos/590016/pexels-photo-590016.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Resume/CV Building",
      tagIcon: <FileText className="w-4 h-4 text-purple-600" />,
      tagColor: "bg-purple-100",
      size: 'medium' as const
    },
    {
      id: 'skill-dev',
      imageUrl: "https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Career Skill Development",
      tagIcon: <GraduationCap className="w-4 h-4 text-emerald-600" />,
      tagColor: "bg-emerald-100",
      size: 'medium' as const
    },
    {
      id: 'mentorship-networking',
      imageUrl: "https://images.pexels.com/photos/3184418/pexels-photo-3184418.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Mentorship & Networking",
      tagIcon: <Users className="w-4 h-4 text-primary" />,
      tagColor: "bg-accent/80",
      size: 'medium' as const
    },
    {
      id: 'workplace-challenges',
      imageUrl: "https://images.pexels.com/photos/7721702/pexels-photo-7721702.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Workplace Challenges",
      tagIcon: <ShieldCheck className="w-4 h-4 text-rose-500" />,
      tagColor: "bg-rose-100",
      size: 'medium' as const
    },
     {
      id: 'explore-paths',
      imageUrl: "https://images.pexels.com/photos/1181298/pexels-photo-1181298.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "Exploring Career Paths",
      tagIcon: <Lightbulb className="w-4 h-4 text-amber-500" />,
      tagColor: "bg-amber-100",
      size: 'medium' as const
    },
    {
      id: 'ask-anything',
      imageUrl: "https://images.pexels.com/photos/3184423/pexels-photo-3184423.jpeg?auto=compress&cs=tinysrgb&w=600",
      tagText: "General Career Advice",
      tagIcon: <Briefcase className="w-4 h-4 text-gray-600" />,
      tagColor: "bg-gray-100",
      size: 'medium' as const
    },
  ];

  const handleTopicClick = (topicId: string) => {
     // You could navigate here and pass the topic, e.g.:
     // navigate(`/chat?topic=${encodeURIComponent(topicId)}`);
     console.log(`Selected topic: ${topicId}, navigating to chat...`);
     navigate('/chat'); // Navigate directly to chat for simplicity now
  }

  return (
    <PageTransition>
      <div className="min-h-screen p-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-serif text-secondary mb-2">
            Welcome, {userName}!
          </h1>
          <p className="text-lg text-secondary/80 max-w-xl mx-auto">
            How can I assist you with your career journey today? Select a starting point or ask me anything in the chat.
          </p>
        </motion.div>

        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6 mb-10">
            {careerTopics.map((topic, index) => (
              <motion.div
                key={topic.id}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.1 + index * 0.05 }}
              >
                <TopicCard
                  imageUrl={topic.imageUrl}
                  title=""
                  tagText={topic.tagText}
                  tagIcon={topic.tagIcon}
                  tagColor={topic.tagColor}
                  size={topic.size}
                  onClick={() => handleTopicClick(topic.id)}
                />
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 + careerTopics.length * 0.05 }}
            className="mt-8 max-w-sm mx-auto"
          >
            <NextButton to="/chat" text="Start Chatting" />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CareerTopicsPage;
