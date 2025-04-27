// src/components/TopicCard.tsx
import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface TopicCardProps {
  imageUrl: string;
  title: string; // Main title text (e.g., "Job Search")
  prompt?: string; // Prompt for 'simple' style or AI interaction
  tagText?: string; // For original 'gradient' style tag bubble
  tagIcon?: React.ReactNode; // For original 'gradient' style tag bubble
  tagColor?: string; // For original 'gradient' style tag bubble

  // --- New props for the specific style in the reference image ---
  tagButtonText?: string; // Text inside the button (e.g., "Find Job Openings")
  tagButtonIcon?: React.ReactNode; // Icon for the button (e.g., <Search />)
  // --- End new props ---

  overlayStyle?: 'gradient' | 'simple' | 'title-with-tag-button'; // Added new style
  size?: 'small' | 'medium' | 'large' | 'custom';
  onClick?: () => void;
  className?: string;
}

const TopicCard: React.FC<TopicCardProps> = ({
  imageUrl,
  title,
  prompt,
  tagText,
  tagIcon,
  tagColor,
  tagButtonText, // Destructure new props
  tagButtonIcon,  // Destructure new props
  overlayStyle = 'gradient', // Default to gradient
  size = 'medium',
  onClick,
  className,
}) => {
  const sizeClasses = {
    small: 'w-36 h-36 md:w-40 md:h-40', // Adjust sizes if needed
    medium: 'w-full aspect-[4/3]', // Default to aspect ratio for grid items
    large: 'w-full aspect-[3/2]', // Example large aspect ratio
    custom: '',
  };

  return (
    <motion.div
      whileHover={{ y: -3, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)' }} // Slightly enhanced hover
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'relative overflow-hidden shadow-md cursor-pointer bg-white border border-gray-100/50',
        'rounded-2xl', // Match reference image rounding
        size !== 'custom' ? sizeClasses[size] : '',
        size === 'custom' && className // Apply parent className if size is custom
      )}
      onClick={onClick}
      style={{ willChange: 'transform, box-shadow' }} // Optimize animation
    >
      <img
        src={imageUrl}
        alt={title}
        className="absolute inset-0 w-full h-full object-cover" // Use absolute positioning for img
        loading="lazy" // Add lazy loading
      />

      {/* Overlay Container */}
      <div className="absolute inset-0 flex flex-col justify-end p-3 md:p-4 bg-gradient-to-t from-black/60 via-black/30 to-transparent">
        {/* Conditional Overlay Content */}
        {overlayStyle === 'title-with-tag-button' && tagButtonText && (
          <>
            {/* Main Title */}
            <h3 className="text-white font-serif text-sm md:text-base font-medium line-clamp-2 mb-1.5 md:mb-2">
                {title}
            </h3>
            {/* Tag Button Element */}
            <div className="inline-flex items-center gap-1.5 bg-white/20 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs md:text-sm font-medium self-start cursor-pointer hover:bg-white/30 transition-colors">
                 {tagButtonIcon && React.isValidElement(tagButtonIcon) ? React.cloneElement(tagButtonIcon, {
                     // Clone icon to add consistent styling
                     className: "w-3.5 h-3.5 md:w-4 md:h-4 opacity-90"
                  }) : tagButtonIcon}
                 <span>{tagButtonText}</span>
            </div>
          </>
        )}

        {overlayStyle === 'simple' && (
          <>
             <h3 className="text-white font-serif text-sm md:text-base font-medium line-clamp-2 leading-tight">
                 {title}
             </h3>
             {prompt && <p className="text-white/80 text-xs mt-0.5 line-clamp-2 leading-snug">{prompt}</p>}
          </>
        )}

         {overlayStyle === 'gradient' && tagText && (
             <>
                <h3 className="text-white font-serif text-sm md:text-base font-medium line-clamp-2 mb-1.5">{title}</h3>
                 <div className={clsx("topic-tag self-start", tagColor)} title={tagText}>
                    {tagIcon}
                    <span className="text-secondary text-xs font-medium">{tagText}</span>
                </div>
            </>
         )}

         {overlayStyle === 'gradient' && !tagText && title && (
              <h3 className="text-white font-serif text-sm md:text-base font-medium line-clamp-2">{title}</h3>
         )}
      </div>
    </motion.div>
  );
};

export default TopicCard;
