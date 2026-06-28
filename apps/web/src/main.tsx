import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { registerPreloadErrorHandler } from './lib/chunk-reload';
import './index.css';

// First line of stale-chunk defense: recover from a failed modulepreload before
// React Router renders, behind the shared reload-loop guard.
registerPreloadErrorHandler();

const rootElement = document.getElementById('root');
if (!rootElement) throw new Error('Failed to find the root element');

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
