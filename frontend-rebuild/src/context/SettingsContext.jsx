import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { fetchSettings } from '../api/settings'

const settingsContext = createContext(null);

export function SettingsProvider({ children }) {
    const [settings, setSettings] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchSettings()
            .then((data) => setSettings(data))
            .catch((err) => setError(err.message))
            .finally(() => { setLoading(false) })
    }, [])

    useEffect(() => {
        refetch();
    }, [refetch]);

    return (
        <settingsContext.Provider value={{ settings, loading, error, refetch }}>
            {children}
        </settingsContext.Provider>
    )
}

export function useSettings() {
    return useContext(settingsContext);
}
