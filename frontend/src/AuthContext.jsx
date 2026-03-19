// src/AuthContext.jsx
import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [role, setRole] = useState("user");

    const decodeJwtRole = (token) => {
        try {
            const payload = token.split('.')[1];
            const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
            const obj = JSON.parse(decoded);
            return obj?.role || "user";
        } catch {
            return "user";
        }
    };

    useEffect(() => {
        const checkAuth = async () => {
            const token = localStorage.getItem('jwt');
            if (token) {
                setIsAuthenticated(true);
                setRole(decodeJwtRole(token));
            } else {
                setIsAuthenticated(false);
                setRole("user");
            }
        };

        checkAuth();
    }, []);

    const login = (token) => {
        localStorage.setItem('jwt', token);
        setIsAuthenticated(true);
        setRole(decodeJwtRole(token));
    };

    const logout = () => {
        localStorage.removeItem('jwt');
        setIsAuthenticated(false);
        setRole("user");
    };

    return (
        <AuthContext.Provider value={{ isAuthenticated, role, login, logout }}>
            {children}
        </AuthContext.Provider>
    );
};
