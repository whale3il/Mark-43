import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@/src/index.css';
import { StaffApp } from './StaffApp';

const rootEl = document.getElementById('staff-root');
if (rootEl) {
  createRoot(rootEl).render(
    <StrictMode>
      <StaffApp />
    </StrictMode>
  );
}
