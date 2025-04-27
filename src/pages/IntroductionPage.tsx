// src/pages/IntroductionPage.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { useUser } from '../context/UserContext'; // Use context
import PageTransition from '../components/PageTransition';
import NextButton from '../components/NextButton'; // Use NextButton which applies 'button-action'

const IntroductionPage: React.FC = () => {
  const { userName } = useUser(); // Get userName from context

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background"> {/* Ensure bg */}
        <div className="max-w-md w-full mx-auto text-center">
          {/* Username Tag */}
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="mb-4"
          >
            {userName && ( // Only show if userName exists
                <span className="inline-block bg-accent/50 text-primary px-4 py-1 rounded-full text-sm font-medium">
                {userName}
                </span>
            )}
          </motion.div>

          {/* Title with userName */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-3xl md:text-4xl font-serif text-secondary mb-6"
          >
            {/* Use userName dynamically, provide fallback */}
            Nice to meet you{userName ? ` ${userName}` : ''} 🌸
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="text-lg text-secondary/80 mb-12" // Use secondary color, adjusted font/margin
          >
            I'm delighted to be chatting with you!
          </motion.p>

          {/* Next Button (Green - uses button-action via NextButton component) */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <NextButton to="/career-topics" text="Next"/>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default IntroductionPage;
