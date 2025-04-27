// ================================================
// FILE: src/pages/SignInPage.tsx
// ================================================
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import PageTransition from '../components/PageTransition';
// Import necessary Lucide icons
import { MessageSquare, Loader2, Chrome, Linkedin } from 'lucide-react';
import { useUser } from '../context/UserContext';
import { clsx } from 'clsx';

const SignInPage = () => {
  const { session, signInWithOAuth, loading, authError } = useUser();
  const navigate = useNavigate(); // Keep navigate if you have other links, though not used in this specific flow

  const handleSignIn = async (provider: 'google' | 'linkedin_oidc') => {
    await signInWithOAuth(provider);
  };

  // Display loading state while checking session/auth status
  if (loading && !session) {
    return (
        <div className="flex items-center justify-center h-screen text-secondary bg-background">
            <Loader2 className="w-6 h-6 animate-spin mr-3" />
            Loading...
        </div>
    );
  }

  // If session exists, UserProvider handles navigation, render nothing here
  if (session) {
    return null;
  }

  // Render the Sign-In page if no session and not loading
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

          {/* Display Auth Error if present */}
           {authError && (
             <motion.p
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="text-red-600 mb-4 text-center text-sm p-2 bg-red-100 rounded-md"
             >
               {authError}
             </motion.p>
           )}

          {/* Authentication Buttons */}
          <div className="space-y-4">
            {/* Google Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              onClick={() => handleSignIn('google')}
              disabled={loading}
              className={clsx(
                  "w-full flex items-center justify-center gap-3 bg-white text-gray-700 px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200",
                  loading && "opacity-60 cursor-not-allowed" // Apply disabled styles
              )}
            >
              {/* Use Lucide Chrome icon */}
              <Chrome size={20} className="text-gray-700" />
              <span className="font-medium">Continue with Google</span>
            </motion.button>

            {/* LinkedIn Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              onClick={() => handleSignIn('linkedin_oidc')} // Ensure provider name is correct
              disabled={loading}
              className={clsx(
                "w-full flex items-center justify-center gap-3 bg-[#0A66C2] text-white px-6 py-3 rounded-full shadow-md hover:shadow-lg transition-all duration-200",
                 loading && "opacity-60 cursor-not-allowed" // Apply disabled styles
              )}
            >
              {/* Use Lucide Linkedin icon */}
              <Linkedin size={20} className="text-white" />
              <span className="font-medium">Continue with LinkedIn</span>
            </motion.button>
          </div>

          {/* Terms/Policy Links */}
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
