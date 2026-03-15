import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { NotificationProvider } from './contexts/NotificationContext';
import { ErrorBoundary } from './components/ErrorBoundary';
import { ThemeProvider } from './contexts/ThemeContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <ThemeProvider>
      <AuthProvider>
        <OrganizationProvider>
          <NotificationProvider position="top-right">
            <App />
          </NotificationProvider>
        </OrganizationProvider>
      </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  </StrictMode>
);
