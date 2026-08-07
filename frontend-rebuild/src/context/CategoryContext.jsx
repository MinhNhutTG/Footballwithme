import { createContext, useCallback, useContext, useState, useEffect } from "react";
import { fetchCategories } from '../api/categories'

const categoryContext = createContext(null);

export function CategoryProvider({ children }) {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const refetch = useCallback(() => {
        setLoading(true);
        return fetchCategories()
            .then((data) => setCategories(data))
            .catch((err) => setError(err.message))
            .finally(() => { setLoading(false) })
    }, [])

    useEffect(() => {
        refetch();
    }, [refetch]);

    return (
        <categoryContext.Provider value={{ categories, loading, error, refetch }}>
            {children}
        </categoryContext.Provider>
    )
}

export function useCategories() {
    return useContext(categoryContext);
}
