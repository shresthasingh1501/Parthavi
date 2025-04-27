// src/App.tsx
import React from 'react';
// Remove BrowserRouter import: import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Routes, Route, Navigate } from 'react-router-dom'; // Keep other imports
import { AnimatePresence } from 'framer-motion';

import SignInPage from './pages/SignInPage';
import WelcomePage from './pages/WelcomePage';
import IntroductionPage from './pages/IntroductionPage';
import CareerTopicsPage from './pages/CareerTopicsPage';
import ChatPage from './pages/ChatPage';
// --- Import New Pages ---
import AccountPage from './pages/AccountPage';
import ManageHistoryPage from './pages/ManageHistoryPage';
import LanguageSettingsPage from './pages/LanguageSettingsPage';
import FeedbackPage from './pages/FeedbackPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import TermsOfServicePage from './pages/TermsOfServicePage';

function App() {
  return (
    // Remove <BrowserRouter> from here
    <div className="min-h-screen bg-background font-sans text-secondary">
      <AnimatePresence mode="wait">
        <Routes>
          <Route path="/" element={<SignInPage />} />
          <Route path="/welcome" element={<WelcomePage />} />
          <Route path="/introduction" element={<IntroductionPage />} />
          <Route path="/career-topics" element={<CareerTopicsPage />} />
          <Route path="/chat" element={<ChatPage />} />
          {/* Add route for threadId if using URL params */}
          {/* <Route path="/chat/:threadId" element={<ChatPage />} /> */}
          {/* --- Add New Routes --- */}
          <Route path="/account" element={<AccountPage />} />
          <Route path="/history" element={<ManageHistoryPage />} />
          <Route path="/language-settings" element={<LanguageSettingsPage />} />
          <Route path="/feedback" element={<FeedbackPage />} />
          <Route path="/privacy" element={<PrivacyPolicyPage />} />
          <Route path="/terms" element={<TermsOfServicePage />} />
          {/* --- End New Routes --- */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AnimatePresence>
    </div>
    // No closing </BrowserRouter> needed here anymore
  );
}

export default App;
