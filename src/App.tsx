// src/App.tsx
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
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
    <BrowserRouter>
      <div className="min-h-screen bg-background font-sans text-secondary">
        <AnimatePresence mode="wait">
          <Routes>
            <Route path="/" element={<SignInPage />} />
            <Route path="/welcome" element={<WelcomePage />} />
            <Route path="/introduction" element={<IntroductionPage />} />
            <Route path="/career-topics" element={<CareerTopicsPage />} />
            <Route path="/chat" element={<ChatPage />} />
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
    </BrowserRouter>
  );
}

export default App;
