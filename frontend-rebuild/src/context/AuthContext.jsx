import { createContext, useContext, useState } from "react";
import { login as loginRequest, register as RegisterRequest } from "../api/auth"
const AuthContext = createContext(null);
export function AuthProvider({ children }) {

    const [token, setToken] = useState(() => localStorage.getItem('fwm-token'));
    const [user, setUser] = useState(() => {
        try {
            return JSON.parse(localStorage.getItem('fwm-user') || 'null');
        }
        catch {
            return null;
        }
    })

    const persist = (data) => {
        setToken(data.token);
        setUser(data.user);
        localStorage.setItem('fwm-token', data.token);
        localStorage.setItem('fwm-user', JSON.stringify(data.user));
        return data.user;
    }

    const login = async (email, password) => persist(await loginRequest({email, password}));

    const register = async (name, email, password) =>{
        const data = await RegisterRequest({name, email, password});
        return persist(data);
    }

    const logout = ()=>{
        setToken(null);
        setUser(null);
        localStorage.removeItem('fwm-token');
        localStorage.removeItem('fwm-user');
    }

    const setFavorites = (favorites) =>{
        setUser((prev)=>{
            if (!prev) return prev;
            const next = {...prev, favorites};
            localStorage.setItem('fwm-user',JSON.stringify(next));
            return next;
        })
    }

    const updateUser = (fields) =>{
        setUser((prev)=>{
            if (!prev) return prev;
            const next = {...prev, ...fields};
            localStorage.setItem('fwm-user',JSON.stringify(next));
            return next;
        })
    }
 
    return (
        <AuthContext.Provider value={{token, user, isAdmin: user?.role === 'admin',login, register, logout, setFavorites, updateUser}} >
            {children}
        </AuthContext.Provider>
    )

}

export function useAuth() {
    return useContext(AuthContext);
}