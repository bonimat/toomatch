import React, { createContext, useState, useEffect, useContext } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { TRANSLATIONS } from '../constants/translations';

const LanguageContext = createContext();

export const LanguageProvider = ({ children }) => {
    const [language, setLanguage] = useState('IT'); // Default to Italian

    useEffect(() => {
        loadLanguage();
    }, []);

    const loadLanguage = async () => {
        try {
            const savedLanguage = await AsyncStorage.getItem('user_language');
            if (savedLanguage) {
                setLanguage(savedLanguage);
            }
        } catch (e) {
            console.error("Failed to load language", e);
        }
    };

    const changeLanguage = async (lang) => {
        try {
            await AsyncStorage.setItem('user_language', lang);
            setLanguage(lang);
        } catch (e) {
            console.error("Failed to save language", e);
        }
    };

    // Helper function to get text
    const t = (key) => {
        return TRANSLATIONS[language][key] || key;
    };

    return (
        <LanguageContext.Provider value={{ language, setLanguage: changeLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => useContext(LanguageContext);
