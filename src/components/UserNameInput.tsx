import React, { useState } from 'react';
import { motion } from 'framer-motion';

interface UserNameInputProps {
  onSubmit: (name: string) => void;
}

const UserNameInput: React.FC<UserNameInputProps> = ({ onSubmit }) => {
  const [name, setName] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      onSubmit(name.trim());
    }
  };

  return (
    <motion.form 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
      className="w-full max-w-sm mx-auto"
      onSubmit={handleSubmit}
    >
      <div className="mb-4">
        <input
          type="text"
          placeholder="Enter your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="input-field"
          autoFocus
        />
      </div>
      <button 
        type="submit" 
        className="button-primary w-full"
        disabled={!name.trim()}
      >
        Continue
      </button>
    </motion.form>
  );
};

export default UserNameInput;