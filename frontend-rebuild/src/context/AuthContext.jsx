import { createContext, useContext, useState, useEffect } from "react";
import { login as loginRequest, register as RegisterRequest, googleAuth as googleAuthRequest } from "../api/auth"
import {getMe} from "../api/users"

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

    useEffect(()=>{
        if (!token) return ;
        getMe(token)
        .then((freshUser)=>{
            setUser(freshUser);
            localStorage.setItem('fwm-user', JSON.stringify(freshUser))
        })
        .catch(()=>{
            logout();
        })
    },[token])

    const login = async (email, password) => persist(await loginRequest({email, password}));

    const register = async (name, email, password) => RegisterRequest({name, email, password});

    const loginWithGoogle = async (credential) => persist(await googleAuthRequest(credential));

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
        <AuthContext.Provider value={{token, user, isAdmin: user?.role === 'admin',login, register, logout, setFavorites, updateUser, loginWithGoogle}} >
            {children}
        </AuthContext.Provider>
    )

}

export function useAuth() {
    return useContext(AuthContext);
}