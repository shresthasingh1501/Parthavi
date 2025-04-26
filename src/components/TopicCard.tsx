import React from 'react';
import { motion } from 'framer-motion';

interface TopicCardProps {
  imageUrl: string;
  title: string;
  tagText?: string;
  tagIcon?: React.ReactNode;
  tagColor?: string;
  size?: 'small' | 'medium' | 'large';
  onClick?: () => void;
}

const TopicCard: React.FC<TopicCardProps> = ({
  imageUrl,
  title,
  tagText,
  tagIcon,
  tagColor = 'bg-accent',
  size = 'medium',
  onClick,
}) => {
  const sizeClasses = {
    small: 'w-36 h-36 md:w-40 md:h-40',
    medium: 'w-44 h-44 md:w-56 md:h-56',
    large: 'w-56 h-56 md:w-72 md:h-72',
  };

  return (
    <motion.div
      whileHover={{ y: -5 }}
      whileTap={{ scale: 0.98 }}
      className={`topic-card relative rounded-xl overflow-hidden shadow-md ${sizeClasses[size]} cursor-pointer`}
      onClick={onClick}
    >
      <img 
        src={imageUrl} 
        alt={title} 
        className="w-full h-full object-cover"
      />
      {tagText && (
        <div className={`absolute bottom-3 left-3 topic-tag ${tagColor}`}>
          {tagIcon}
          <span className="text-secondary">{tagText}</span>
        </div>
      )}
      {!tagText && title && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent flex items-end p-4">
          <h3 className="text-white font-serif text-lg">{title}</h3>
        </div>
      )}
    </motion.div>
  );
};

export default TopicCard;