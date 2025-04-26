// src/components/TopicCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface TopicCardProps {
  imageUrl: string;
  title: string;
  prompt?: string; // Optional prompt line
  tagText?: string; // Keep for backward compatibility if needed elsewhere
  tagIcon?: React.ReactNode; // Keep for backward compatibility
  tagColor?: string; // Keep for backward compatibility
  overlayStyle?: 'gradient' | 'simple'; // New prop
  size?: 'small' | 'medium' | 'large' | 'custom';
  onClick?: () => void;
  className?: string;
}

const TopicCard: React.FC<TopicCardProps> = ({
  imageUrl,
  title,
  prompt,
  tagText, // unused in 'simple' style
  tagIcon, // unused in 'simple' style
  tagColor, // unused in 'simple' style
  overlayStyle = 'gradient', // Default to gradient
  size = 'medium',
  onClick,
  className,
}) => {
  const sizeClasses = {
    small: 'w-36 h-36 md:w-40 md:h-40',
    medium: 'w-44 h-44 md:w-56 md:h-56',
    large: 'w-56 h-56 md:w-72 md:h-72',
    custom: '',
  };

  return (
    <motion.div
      // Reduced hover effect to match target more closely
      whileHover={{ y: -2, boxShadow: '0 6px 15px rgba(0, 0, 0, 0.07)' }}
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative overflow-hidden shadow-sm cursor-pointer bg-white border border-gray-100/80',
        // Match target rounding more closely
        'rounded-2xl',
        size !== 'custom' && sizeClasses[size],
        className // className from parent controls dimensions in custom mode
      )}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
      />

      {/* Conditional Overlay Rendering */}
      {overlayStyle === 'simple' ? (
        // Simple white text overlay, bottom-left
        <div className="absolute bottom-0 left-0 p-3 w-full bg-gradient-to-t from-black/40 via-black/10 to-transparent">
           <h3 className="text-white font-serif text-sm md:text-base font-medium line-clamp-2 leading-tight">
               {title}
           </h3>
           {/* Optional second line for prompt */}
           {prompt && <p className="text-white/80 text-xs mt-0.5 line-clamp-2 leading-snug">{prompt}</p>}
        </div>
      ) : (
         // Original Gradient logic (using tag or title)
         <>
            {!tagText && title && (
             <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-3">
               <h3 className="text-white font-serif text-sm font-medium line-clamp-2">{title}</h3>
             </div>
           )}
            {tagText && (
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent flex flex-col justify-end p-3">
                <h3 className="text-white font-serif text-sm font-medium line-clamp-2 mb-1.5">{title}</h3>
                 <div className={clsx("topic-tag self-start", tagColor)} title={tagText}>
                    {tagIcon}
                    <span className="text-secondary text-xs font-medium">{tagText}</span>
                </div>
            </div>
          )}
         </>
      )}
    </motion.div>
  );
};

export default TopicCard;
