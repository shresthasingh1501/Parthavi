import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';

import SignInPage from './pages/SignInPage';
import WelcomePage from './pages/WelcomePage';
import IntroductionPage from './pages/IntroductionPage';
import CareerTopicsPage from './pages/CareerTopicsPage';
import ChatPage from './pages/ChatPage';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-secondary">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/introduction" element={<IntroductionPage />} />
            <Route path="/career-topics" element={<CareerTopicsPage />} />
            <Route path="/chat" element={<ChatPage />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </AnimatePresence>
      </div>
    </BrowserRouter>
  );
}

export default App;
