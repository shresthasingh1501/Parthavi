import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import NextButton from '../components/NextButton';

const IntroductionPage: React.FC = () => {
  const { userName } = useUser();

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full mx-auto text-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="mb-4"
          >
            <span className="inline-block bg-accent/50 text-primary px-4 py-1 rounded-full text-sm font-medium">
              {userName}
            </span>
          </motion.div>
          
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-3xl md:text-4xl font-serif text-secondary mb-6"
          >
            Nice to meet you {userName} 🌸
          </motion.h1>
          
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-lg font-serif text-secondary mb-12"
          >
            I'm delighted to be chatting with you!
          </motion.p>
          
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <NextButton to="/career-topics" />
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default IntroductionPage;