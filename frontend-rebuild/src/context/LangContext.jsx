import { dict } from '../i18n/dict'
import { createContext, useContext, Children, useState } from "react"

const LangContext = createContext(null);

export function LangProvider({ children }) {

    const [lang, setLang] = useState(() => localStorage.getItem('fwm-lang') || 'vi')

    const toggleLang = () => {
        setLang((l) => {
            const next = l === 'vi' ? 'en' : 'vi';
            localStorage.setItem('fwm-lang',next);
            return next;
        })
    }

    const t = dict[lang];

    return (
        <LangContext.Provider value={{ lang, toggleLang, t }}>
            {children}
        </LangContext.Provider>
    )
}

export function useLang() {
    return useContext(LangContext);
}