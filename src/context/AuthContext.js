import React, { createContext, useState, useEffect, useContext, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { auth, db } from '../../firebaseConfig';
import { onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, setDoc, updateDoc, Timestamp, collection, getDocs, query, where } from 'firebase/firestore';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Global variable to track first load across re-renders
let globalFirstLoad = true;

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userProfile, setUserProfile] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!auth) {
            console.error("AuthContext: Auth object is undefined! Firebase verification failed.");
            setLoading(false);
            return;
        }

        console.log("AuthContext: Setting up onAuthStateChanged listener...");

        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            console.log("AuthContext: Auth state changed. User:", firebaseUser ? firebaseUser.uid : "null");

            if (firebaseUser) {
                // User is signed in
                setUser(firebaseUser);
                await loadUserProfile(firebaseUser.uid);
            } else {
                // User is signed out
                setUser(null);
                setUserProfile(null);
            }

            // Enforce 2-second delay ONLY on the very first load
            if (globalFirstLoad) {
                console.log("AuthContext: First load - verifying Splash Screen delay...");
                setTimeout(() => {
                    console.log("AuthContext: Delay over - Hiding Splash Screen.");
                    setLoading(false);
                    globalFirstLoad = false;
                }, 2000);
            } else {
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const loadUserProfile = async (uid) => {
        try {
            const userDocRef = doc(db, "users", uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                const userData = { id: userDoc.id, ...userDoc.data() };
                setUserProfile(userData);
                await AsyncStorage.setItem('user_session', JSON.stringify(userData));
            } else {
                console.log("No user profile found for uid:", uid, "- Creating skeleton profile...");

                // Create a skeleton profile with EMPTY nickname to trigger forced update
                const skeletonData = {
                    id: uid,
                    email: auth.currentUser?.email || "",
                    nickname: "", // EMPTY to force profile screen
                    firstName: "",
                    lastName: "",
                    createdAt: Timestamp.now(),
                    isSkeleton: true
                };

                await setDoc(userDocRef, skeletonData);
                setUserProfile(skeletonData);
                await AsyncStorage.setItem('user_session', JSON.stringify(skeletonData));
                console.log("Skeleton profile created (Nickname empty).");
            }
        } catch (e) {
            console.error("Error loading/creating user profile:", e);
        }
    };

    const login = async (email, password) => {
        console.log(`AuthContext: Attempting login with email: '${email}'`);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        // User profile loading is handled by onAuthStateChanged
        return userCredential;
    };

    const register = async (email, password, additionalData = {}) => {
        try {
            let userCredential;
            try {
                userCredential = await createUserWithEmailAndPassword(auth, email, password);
            } catch (createError) {
                if (createError.code === 'auth/email-already-in-use') {
                    // Check for Ghost Account (Auth exists but Profile missing)
                    console.log("AuthContext: Email in use. Checking for ghost account...");
                    try {
                        userCredential = await signInWithEmailAndPassword(auth, email, password);
                        const userDocTest = await getDoc(doc(db, "users", userCredential.user.uid));
                        if (userDocTest.exists()) {
                            throw new Error('auth/email-already-in-use'); // Real user exists
                        }
                        console.log("AuthContext: Ghost account detected. Proceeding with registration/repair.");
                    } catch (signInError) {
                        // If sign in fails (wrong password) or real user exists, throw original error
                        throw createError;
                    }
                } else {
                    throw createError;
                }
            }

            const { user } = userCredential;

            // Create user profile in Firestore
            const userData = {
                id: user.uid,
                email: user.email,
                createdAt: Timestamp.now(),
                ...additionalData
            };

            await setDoc(doc(db, "users", user.uid), userData);

            // Fix: immediately set session for UI responsiveness
            await AsyncStorage.setItem('user_session', JSON.stringify(userData));

            setUserProfile(userData);
            return user;
        } catch (e) {
            throw e;
        }
    };

    const logout = async () => {
        await AsyncStorage.removeItem('user_session');
        return signOut(auth);
    };

    const resetPassword = async (email) => {
        if (!email) throw new Error("Email required");
        console.log("AuthContext: Reset password for:", email);
        return sendPasswordResetEmail(auth, email);
    };

    const value = {
        user,
        userProfile,
        loading,
        login,
        register,
        register,
        logout,
        resetPassword
    };

    return (
        <AuthContext.Provider value={value}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
