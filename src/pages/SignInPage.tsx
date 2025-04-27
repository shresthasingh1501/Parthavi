// src/pages/SignInPage.tsx
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
import { MessageSquare } from 'lucide-react';
import { useUser } from '../context/UserContext';

const SignInPage = () => {
  const { session, signInWithOAuth, loading } = useUser();
  const navigate = useNavigate(); // Keep for potential link navigation

  // Update the type for the provider parameter
  const handleSignIn = async (provider: 'google' | 'linkedin_oidc') => {
    await signInWithOAuth(provider);
  };

  // Show loading indicator while checking session/profile
  if (loading) {
    return <div className="flex items-center justify-center h-screen text-secondary">Loading...</div>;
  }

  // If session exists, UserProvider is handling navigation, render nothing here
  if (session) {
    return null;
  }

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background">
        <div className="w-full max-w-md mx-auto">
          {/* Welcome Section */}
          <div className="text-center mb-10">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <MessageSquare className="w-8 h-8 text-primary" />
            </div>
            <motion.h1
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="text-4xl md:text-5xl font-serif text-secondary mb-4"
            >
              Welcome to Parthavi
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="text-lg text-secondary/80 mb-8"
            >
              Empowering Women in Their Careers
            </motion.p>
          </div>

          {/* Authentication Buttons */}
          <div className="space-y-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => handleSignIn('google')} // Google provider name is correct
              className="w-full flex items-center justify-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <img
                src="https://www.google.com/favicon.ico"
                alt="Google"
                className="w-5 h-5"
                referrerPolicy="no-referrer"
              />
              <span className="font-medium">Continue with Google</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => handleSignIn('linkedin_oidc')} // *** USE 'linkedin_oidc' ***
              className="w-full flex items-center justify-center gap-3 bg-[#0A66C2] text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200"
            >
              <img
                src="https://www.linkedin.com/favicon.ico"
                alt="LinkedIn"
                className="w-5 h-5"
                 referrerPolicy="no-referrer"
              />
              <span className="font-medium">Continue with LinkedIn</span>
            </motion.button>
          </div>

          {/* Terms/Policy */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
            className="mt-8 text-center text-sm text-secondary/60"
          >
            <p>By continuing, you agree to our <a href="/terms" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Terms of Service</a> and <a href="/privacy" target="_blank" rel="noopener noreferrer" className="underline hover:text-primary">Privacy Policy</a></p>
          </motion.div>
        </div>
      </div>
    </PageTransition>
  );
};

export default SignInPage;
