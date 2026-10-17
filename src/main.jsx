import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AuthGate from './components/AuthGate.jsx';
import PwaStatus from './components/PwaStatus.jsx';
import './pwa/installPrompt.js';
import './styles.css';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PwaStatus>
      <AuthGate>
        <App />
      </AuthGate>
    </PwaStatus>
  </StrictMode>,
);
