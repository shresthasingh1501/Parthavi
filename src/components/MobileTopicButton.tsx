// src/components/MobileTopicButton.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface MobileTopicButtonProps {
  title: string; // Title of the topic
  promptText: string; // The text to display and use as the prompt
  onClick: () => void;
  icon?: React.ReactNode; // Optional icon
  iconColorClass?: string; // Tailwind class for icon color
}

const MobileTopicButton: React.FC<MobileTopicButtonProps> = ({
    title,
    promptText,
    onClick,
    icon,
    iconColorClass
}) => {
  return (
    <motion.button
      whileTap={{ scale: 0.98 }}
      className="w-full text-left p-4 bg-white rounded-lg shadow-sm hover:bg-gray-50 transition-colors border border-gray-200/80 focus:outline-none focus:ring-2 focus:ring-primary/50"
      onClick={onClick}
    >
        <div className="flex items-center gap-3 mb-1">
            {icon && (
                <div className={clsx("p-1.5 rounded-full", iconColorClass ? `${iconColorClass}/10` : 'bg-primary/10')}>
                     {/* Clone icon to add color class */}
                     {React.isValidElement(icon) ? React.cloneElement(icon, {
                         className: clsx("w-4 h-4", iconColorClass || 'text-primary')
                      }) : icon}
                </div>
            )}
             <h3 className="text-sm font-semibold text-secondary">{title}</h3>
        </div>

       <p className="text-xs text-gray-600 leading-snug pl-8">{promptText}</p> {/* Indent text slightly */}
    </motion.button>
  );
};

export default MobileTopicButton;
