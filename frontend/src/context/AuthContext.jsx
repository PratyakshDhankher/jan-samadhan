import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null); // { name, email, role }
    const [token, setToken] = useState(null);

    useEffect(() => {
        const savedToken = localStorage.getItem('js_token');
        const savedUser = localStorage.getItem('js_user');
        if (savedToken && savedUser) {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
        }
    }, []);

    const login = (accessToken, role, name, email = '') => {
        const userData = { name, role, email };
        setToken(accessToken);
        setUser(userData);
        localStorage.setItem('js_token', accessToken);
        localStorage.setItem('js_user', JSON.stringify(userData));
    };

    const logout = () => {
        setToken(null);
        setUser(null);
        localStorage.removeItem('js_token');
        localStorage.removeItem('js_user');
    };

    return (
        <AuthContext.Provider value={{ user, token, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    return useContext(AuthContext);
}
