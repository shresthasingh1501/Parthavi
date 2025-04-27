// src/pages/WelcomePage.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import UserNameInput from '../components/UserNameInput';
import { MessageSquare, Loader2 } from 'lucide-react'; // Import Loader2
import { supabase } from '../lib/supabaseClient'; // Import supabase
import { motion } from 'framer-motion'; // Import motion

const WelcomePage: React.FC = () => {
  const { user, refreshProfile } = useUser();
  const navigate = useNavigate();
  const [showNameInput, setShowNameInput] = useState(false); // State to control input visibility
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleNameSubmit = async (name: string) => {
    if (!user) {
      setError("User not found. Please try signing in again.");
      return;
    }
    if (!name.trim()) {
      setError("Please enter a name.");
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      console.log(`Updating profile for user ${user.id} with name: ${name}`);
      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          full_name: name.trim(),
          onboarding_complete: true
        })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      console.log("Profile updated successfully.");
      await refreshProfile(); // Refresh context state
      navigate('/introduction'); // Navigate to next step

    } catch (err) {
      console.error("Error updating profile:", err);
      setError(err instanceof Error ? `Failed to save name: ${err.message}` : "An unknown error occurred.");
      setIsSaving(false); // Only stop saving indicator on error
    }
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background"> {/* Ensure bg */}
        <div className="text-center max-w-2xl mx-auto mb-10">
          {/* Icon */}
          <motion.div
             initial={{ scale: 0.8, opacity: 0 }}
             animate={{ scale: 1, opacity: 1 }}
             transition={{ delay: 0.1, duration: 0.4 }}
             className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6"
           >
            <MessageSquare className="w-8 h-8 text-primary" />
          </motion.div>

          {/* Heading */}
          <motion.h1
             initial={{ y: -10, opacity: 0 }}
             animate={{ y: 0, opacity: 1 }}
             transition={{ delay: 0.2, duration: 0.5 }}
             className="text-4xl md:text-5xl font-serif text-secondary mb-4"
           >
            Let's Get Started
          </motion.h1>

          {/* Original Subtitle */}
          <motion.p
            initial={{ y: 10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="text-lg text-secondary/80 mb-8 max-w-lg mx-auto"
          >
            Parthavi is your partner for personalized career guidance. Let's begin your journey to professional growth.
          </motion.p>

           {/* Display Error if any */}
           {error && (
             <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="text-red-600 mb-4"
              >
                {error}
              </motion.p>
            )}

          {/* --- Conditional Rendering: Button or Input --- */}
          <motion.div
             key={showNameInput ? 'input' : 'button'} // Add key for animation swap
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             transition={{ duration: 0.4, delay: 0.4 }}
             className="w-full max-w-sm mx-auto" // Center content
           >
             {isSaving ? (
                // Saving Indicator
                <div className="flex justify-center items-center p-4 text-secondary">
                   <Loader2 className="w-5 h-5 animate-spin mr-2" /> Saving...
                </div>
             ) : !showNameInput ? (
                // Initial "Continue" Button (Mauve)
                <button
                  onClick={() => {
                      setShowNameInput(true);
                      setError(null); // Clear error when showing input
                  }}
                  // Use the button-brand class from index.css
                  className="button-brand w-full max-w-xs mx-auto" // Ensure width/centering
                >
                  Continue
                </button>
             ) : (
                // UserName Input Component
                 <>
                  {/* Add prompt text */}
                   <p className="text-md text-secondary/90 mb-4">
                       What name should Parthavi call you?
                   </p>
                   <UserNameInput onSubmit={handleNameSubmit} />
                 </>
             )}
          </motion.div>
          {/* --- End Conditional Rendering --- */}

        </div>
      </div>
    </PageTransition>
  );
};

export default WelcomePage;
