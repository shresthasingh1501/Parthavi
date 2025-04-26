import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import NextButton from '../components/NextButton';
import { 
  Briefcase, 
  GraduationCap, 
  Star, 
  Search, 
  MessageSquare,
  Sparkles
} from 'lucide-react';

const CareerTopicsPage: React.FC = () => {
  const { userName } = useUser();
  
  return (
    <PageTransition>
      <div className="min-h-screen p-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-8"
        >
          <h1 className="text-2xl md:text-3xl font-serif text-secondary">
            What should we talk <span className="inline-flex items-center">🗣️</span> about first, {userName}
          </h1>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/3153198/pexels-photo-3153198.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Career options"
                tagIcon={<Briefcase className="w-4 h-4 text-primary" />}
                tagColor="bg-accent/80"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/3184360/pexels-photo-3184360.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Interview tips"
                tagIcon={<Star className="w-4 h-4 text-amber-500" />}
                tagColor="bg-amber-100"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/3184338/pexels-photo-3184338.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Skill development"
                tagIcon={<GraduationCap className="w-4 h-4 text-emerald-600" />}
                tagColor="bg-emerald-100"
              />
            </motion.div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}>
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/3182826/pexels-photo-3182826.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Job search strategy"
                tagIcon={<Search className="w-4 h-4 text-blue-600" />}
                tagColor="bg-blue-100"
                size="large"
              />
            </motion.div>
            
            <div className="grid grid-cols-1 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}>
                <TopicCard 
                  imageUrl="https://images.pexels.com/photos/3862130/pexels-photo-3862130.jpeg?auto=compress&cs=tinysrgb&w=600"
                  title=""
                  tagText="Workplace challenges"
                  tagIcon={<Sparkles className="w-4 h-4 text-purple-600" />}
                  tagColor="bg-purple-100"
                  size="small"
                />
              </motion.div>
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>
                <TopicCard 
                  imageUrl="https://images.pexels.com/photos/3184423/pexels-photo-3184423.jpeg?auto=compress&cs=tinysrgb&w=600"
                  title=""
                  tagText="I've got my own topic"
                  tagIcon={<MessageSquare className="w-4 h-4 text-gray-600" />}
                  tagColor="bg-gray-100"
                  size="small"
                />
              </motion.div>
            </div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.7 }}
            className="mt-8 max-w-sm mx-auto"
          >
            <NextButton to="/skills-topics" />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default CareerTopicsPage;