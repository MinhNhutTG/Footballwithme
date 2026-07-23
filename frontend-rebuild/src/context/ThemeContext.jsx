import { Children, createContext, useContext, useEffect, useState } from "react";

const  ThemeContext = createContext();
export function ThemeProvider({children}){

    const [theme,setTheme] = useState(()=> localStorage.getItem('fwm-theme')|| 'dark');

    useEffect(()=>{
        document.documentElement.setAttribute('data-theme', theme);
        localStorage.setItem('fwm-theme',theme)
    },[theme])

    const toggleTheme = ()=>{
        setTheme((t)=> t === 'dark' ? 'light' : 'dark');
    }

    return (
        <ThemeContext.Provider value={{theme,toggleTheme}}>
            {children}
        </ThemeContext.Provider>
    )
}

export function useTheme(){
    return useContext(ThemeContext);
}