import React from 'react';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import NextButton from '../components/NextButton';
import { 
  BookOpen, 
  BarChart, 
  Code, 
  Gem,
  PenTool,
  Heart
} from 'lucide-react';

const SkillsTopicsPage: React.FC = () => {
  return (
    <PageTransition>
      <div className="min-h-screen p-6 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="text-center mb-10"
        >
          <h1 className="text-3xl md:text-4xl font-serif text-secondary">
            Grow with Parthavi
          </h1>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/7014337/pexels-photo-7014337.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Create habits"
                tagIcon={<BookOpen className="w-4 h-4 text-blue-500" />}
                tagColor="bg-blue-100"
                size="small"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/6147369/pexels-photo-6147369.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Balanced views"
                tagIcon={<Gem className="w-4 h-4 text-green-500" />}
                tagColor="bg-green-100"
                size="small"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/733856/pexels-photo-733856.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Explore emotions"
                tagIcon={<Heart className="w-4 h-4 text-rose-500" />}
                tagColor="bg-rose-100"
                size="small"
              />
            </motion.div>
          </div>
          
          <div className="grid grid-cols-12 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="col-span-4">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/8412414/pexels-photo-8412414.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Get philosophical"
                tagIcon={<Gem className="w-4 h-4 text-amber-600" />}
                tagColor="bg-amber-100"
                size="medium"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="col-span-4">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/5699456/pexels-photo-5699456.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Relationship advice"
                tagIcon={<Heart className="w-4 h-4 text-rose-500" />}
                tagColor="bg-rose-100"
                size="medium"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="col-span-4">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/267586/pexels-photo-267586.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Unbiased perspectives"
                tagIcon={<BarChart className="w-4 h-4 text-primary" />}
                tagColor="bg-accent/70"
                size="medium"
              />
            </motion.div>
          </div>
          
          <div className="grid grid-cols-2 gap-4 md:gap-6 mb-10">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/256417/pexels-photo-256417.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Learn a language"
                tagIcon={<BookOpen className="w-4 h-4 text-orange-500" />}
                tagColor="bg-orange-100"
                size="medium"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/7235651/pexels-photo-7235651.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Learn coding"
                tagIcon={<Code className="w-4 h-4 text-emerald-600" />}
                tagColor="bg-emerald-100"
                size="medium"
              />
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.9 }}
            className="mt-8 max-w-sm mx-auto"
          >
            <NextButton to="/workplace-topics" />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SkillsTopicsPage;