import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import PageTransition from '../components/PageTransition';
import TopicCard from '../components/TopicCard';
import NextButton from '../components/NextButton';
import { Pencil, MapPin, Music as MusicNote, PenTool, Sparkles, Brain } from 'lucide-react';

const WorkplaceTopicsPage = () => {
  const navigate = useNavigate();

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
            Create with Parthavi
          </h1>
        </motion.div>
        
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 mb-8">
            <div className="grid grid-cols-1 gap-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
                <TopicCard 
                  imageUrl="https://images.pexels.com/photos/3643048/pexels-photo-3643048.jpeg?auto=compress&cs=tinysrgb&w=600"
                  title=""
                  tagText="Name your dog"
                  tagIcon={<Sparkles className="w-4 h-4 text-amber-500" />}
                  tagColor="bg-amber-100"
                  size="small"
                />
              </motion.div>
              
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                <TopicCard 
                  imageUrl="https://images.pexels.com/photos/7096339/pexels-photo-7096339.jpeg?auto=compress&cs=tinysrgb&w=600"
                  title=""
                  tagText="Plan a trip"
                  tagIcon={<MapPin className="w-4 h-4 text-rose-500" />}
                  tagColor="bg-rose-100"
                  size="medium"
                />
              </motion.div>
            </div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/6326377/pexels-photo-6326377.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Write a text"
                tagIcon={<Pencil className="w-4 h-4 text-orange-500" />}
                tagColor="bg-orange-100"
                size="large"
              />
            </motion.div>
          </div>
          
          <div className="grid grid-cols-3 gap-4 md:gap-6 mb-8">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/4050318/pexels-photo-4050318.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Custom podcast"
                tagIcon={<MusicNote className="w-4 h-4 text-blue-500" />}
                tagColor="bg-blue-100"
                size="small"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/4050291/pexels-photo-4050291.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Write a story"
                tagIcon={<PenTool className="w-4 h-4 text-indigo-500" />}
                tagColor="bg-indigo-100"
                size="small"
              />
            </motion.div>
            
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="col-span-1">
              <TopicCard 
                imageUrl="https://images.pexels.com/photos/3861969/pexels-photo-3861969.jpeg?auto=compress&cs=tinysrgb&w=600"
                title=""
                tagText="Brainstorm ideas"
                tagIcon={<Brain className="w-4 h-4 text-purple-500" />}
                tagColor="bg-purple-100"
                size="small"
              />
            </motion.div>
          </div>
          
          <motion.div 
            initial={{ opacity: 0 }} 
            animate={{ opacity: 1 }} 
            transition={{ delay: 0.7 }}
            className="mt-10 max-w-sm mx-auto"
          >
            <button
              onClick={() => navigate('/chat')}
              className="button-primary w-full"
            >
              Start Chatting
            </button>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default WorkplaceTopicsPage;