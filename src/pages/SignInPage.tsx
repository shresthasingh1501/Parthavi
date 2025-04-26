import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { MessageSquare } from 'lucide-react';

const SignInPage = () => {
  const navigate = useNavigate();

  const handleSignIn = (provider: string) => {
    // For now, just redirect to welcome page to start onboarding
    navigate('/welcome');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="w-full max-w-md mx-auto">
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            
            <h1 className="text-4xl md:text-5xl font-serif text-secondary mb-6">
              Welcome to Parthavi
            </h1>
            
            <p className="text-lg text-secondary/80 mb-8">
              Your personal career guidance assistant for Indian women
            </p>
          </div>

          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSignIn('google')}
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <img 
                src="https://www.google.com/favicon.ico" 
                alt="Google" 
                className="w-5 h-5"
              />
              <span className="font-medium">Continue with Google</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleSignIn('linkedin')}
              className="w-full flex items-center justify-center gap-3 bg-[#0A66C2] text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <img 
                src="https://www.linkedin.com/favicon.ico" 
                alt="LinkedIn" 
                className="w-5 h-5"
              />
              <span className="font-medium">Continue with LinkedIn</span>
            </motion.button>
          </div>

          <div className="mt-8 text-center text-sm text-secondary/60">
            <p>By continuing, you agree to our Terms of Service and Privacy Policy</p>
          </div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SignInPage;