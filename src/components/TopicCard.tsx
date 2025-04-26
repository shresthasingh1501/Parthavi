import React from 'react';
import { motion } from 'framer-motion';
import { clsx } from 'clsx';

interface TopicCardProps {
  imageUrl: string;
  title: string;
  tagText?: string;
  tagIcon?: React.ReactNode;
  tagColor?: string;
  size?: 'small' | 'medium' | 'large' | 'custom';
  onClick?: () => void;
  className?: string;
}

const TopicCard: React.FC<TopicCardProps> = ({
  imageUrl,
  title,
  tagText,
  tagIcon,
  tagColor = 'bg-accent',
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
      whileHover={{ y: -4, boxShadow: '0 8px 20px rgba(0, 0, 0, 0.08)' }} // Slightly increased hover effect
      whileTap={{ scale: 0.98 }}
      className={clsx(
        'topic-card relative rounded-xl overflow-hidden shadow-sm cursor-pointer bg-white border border-gray-100', // Added border
        size !== 'custom' && sizeClasses[size],
        className
      )}
      onClick={onClick}
    >
      <img
        src={imageUrl}
        alt={title}
        className="w-full h-full object-cover"
      />
      {/* Render Title Overlay OR Tag Overlay */}
      {!tagText && title && (
         <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/30 to-transparent flex flex-col justify-end p-3">
           <h3 className="text-white font-serif text-sm font-medium line-clamp-2">{title}</h3>
         </div>
       )}
      {tagText && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/20 to-transparent flex flex-col justify-end p-3">
            {/* Title can still exist even with tag */}
             <h3 className="text-white font-serif text-sm font-medium line-clamp-2 mb-1.5">{title}</h3>
             <div className={clsx(
                "topic-tag self-start", // Aligned tag to start
                tagColor,
                )}
                 title={tagText}
            >
                {tagIcon}
                <span className="text-secondary text-xs font-medium">{tagText}</span>
            </div>
        </div>
      )}
    </motion.div>
  );
};

export default TopicCard;
