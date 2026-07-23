import { createContext, useContext, useState } from 'react';
import { dict } from '../i18n/dict';

const LangContext = createContext(null);

export function LangProvider({ children }) {
  const [lang, setLang] = useState(
    () => localStorage.getItem('fwm-lang') || 'vi'
  );

  const toggleLang = () =>
    setLang((l) => {
      const next = l === 'vi' ? 'en' : 'vi';
      localStorage.setItem('fwm-lang', next);
      return next;
    });

  const t = dict[lang];

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang() {
  return useContext(LangContext);
}
