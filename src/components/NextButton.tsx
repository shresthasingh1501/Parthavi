import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

interface NextButtonProps {
  to: string;
  text?: string;
}

const NextButton: React.FC<NextButtonProps> = ({ to, text = 'Next' }) => {
  const navigate = useNavigate();

  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.98 }}
      className="button-primary w-full max-w-sm mx-auto block"
      onClick={() => navigate(to)}
    >
      {text}
    </motion.button>
  );
};

export default NextButton;