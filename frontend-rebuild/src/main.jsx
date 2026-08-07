import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import './index.css';
import App from './App.jsx';
import { ThemeProvider } from './context/ThemeContext.jsx';
import { LangProvider } from './context/LangContext.jsx';
import { AuthProvider } from './context/AuthContext.jsx'
import { PostsProvider } from './context/PostsContext.jsx'
import { FavoritesProvider } from './context/FavoritesContext.jsx';
import { CategoryProvider } from './context/CategoryContext.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <LangProvider>
        <AuthProvider>
          <FavoritesProvider>
            <CategoryProvider>
              <PostsProvider>
                <BrowserRouter>
                  <App />
                </BrowserRouter>
              </PostsProvider>
            </CategoryProvider>
          </FavoritesProvider>

        </AuthProvider>
      </LangProvider>
    </ThemeProvider>
  </StrictMode>
);