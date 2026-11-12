import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { GoogleOAuthProvider } from '@react-oauth/google';
import App from './App.tsx';
import './index.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {GOOGLE_CLIENT_ID ? (
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <App />
      </GoogleOAuthProvider>
    ) : (
      <div className="p-6 text-red-500 bg-red-950/20 border border-red-800 rounded-xl m-8 font-mono text-xs">
        <h3 className="font-bold text-sm mb-2">⚠️ Missing Google Client ID</h3>
        <p>VITE_GOOGLE_CLIENT_ID is undefined in your environment.</p>
        <p className="mt-2 text-neutral-400">Please check your .env file location and restart the Vite server.</p>
      </div>
    )}
  </StrictMode>,
);