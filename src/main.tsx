import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { initRippleEffect } from './services/rippleEffect';
import { registerServiceWorker } from './services/registerServiceWorker';

// Initialize global tactile button animations
initRippleEffect();

// Initialize PWA Service Worker
registerServiceWorker();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
