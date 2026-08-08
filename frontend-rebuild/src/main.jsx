import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import '@fortawesome/fontawesome-free/css/all.min.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx'
import { PostsProvider } from './context/PostsContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { CategoryProvider } from './context/CategoryContext.jsx'
import { SettingsProvider } from './context/SettingsContext.jsx'
import { HelmetProvider } from 'react-helmet-async';

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <HelmetProvider>
      <ThemeProvider>
        <LangProvider>
          <AuthProvider>
            <FavoritesProvider>
              <CategoryProvider>
                <SettingsProvider>
                  <PostsProvider>
                    <BrowserRouter>
                      <App />
                    </BrowserRouter>
                  </PostsProvider>
                </SettingsProvider>
              </CategoryProvider>
            </FavoritesProvider>

          </AuthProvider>
        </LangProvider>
      </ThemeProvider>
    </HelmetProvider>
  </StrictMode>
);