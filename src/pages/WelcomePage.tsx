import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../context/UserContext';
import PageTransition from '../components/PageTransition';
import UserNameInput from '../components/UserNameInput';
import { MessageSquare } from 'lucide-react';

const WelcomePage: React.FC = () => {
  const { setUserName } = useUser();
  const navigate = useNavigate();
  const [showNameInput, setShowNameInput] = useState(false);

  const handleNameSubmit = (name: string) => {
    setUserName(name);
    navigate('/introduction');
  };

  return (
    <PageTransition>
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        <div className="text-center max-w-2xl mx-auto mb-10">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
            <MessageSquare className="w-8 h-8 text-primary" />
          </div>
          
          <h1 className="text-4xl md:text-5xl font-serif text-secondary mb-6">
            Let's Get Started
          </h1>
          
          <p className="text-lg mb-8 max-w-lg mx-auto">
            Your personal career guidance assistant for Indian women. Let's start your journey to professional growth together.
          </p>
          
          {!showNameInput ? (
            <button 
              onClick={() => setShowNameInput(true)}
              className="button-primary"
            >
              Continue
            </button>
          ) : (
            <UserNameInput onSubmit={handleNameSubmit} />
          )}
        </div>
      </div>
    </PageTransition>
  );
};

export default WelcomePage;