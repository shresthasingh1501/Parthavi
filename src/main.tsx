// src/main.tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom'; // Import BrowserRouter here
import App from './App.tsx';
import { UserProvider } from './context/UserContext';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* Move BrowserRouter to wrap UserProvider */}
    <BrowserRouter>
      <UserProvider>
        <App />
      </UserProvider>
    </BrowserRouter>
  </StrictMode>
);
