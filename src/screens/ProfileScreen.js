import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, TextInput, Alert, ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as ImagePicker from 'expo-image-picker';
import { updateUser, deleteAllUsers } from '../services/userService'; // Note: deleteAllUsers is currently in userService
import { deleteAllVenues } from '../services/venueService';
import { deleteAllMatches } from '../services/matchService'; // Correct import
import { useLanguage } from '../context/LanguageContext';
import { deleteUser } from 'firebase/auth'; // Import deleteUser
import { doc, deleteDoc } from 'firebase/firestore'; // Import firestore delete
import { auth, db } from '../../firebaseConfig'; // Import auth and db

import { useAuth } from '../context/AuthContext';

export default function ProfileScreen({ navigation, route }) {
    const { t, language, setLanguage } = useLanguage();
    const { user: authUser, logout } = useAuth(); // Get auth user from context
    const [loading, setLoading] = useState(false);
    const [user, setUser] = useState(null);

    // Form State
    const [nickname, setNickname] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [avatar, setAvatar] = useState(null);

    useEffect(() => {
        loadUser();
    }, []);

    const loadUser = async () => {
        setLoading(true);
        try {
            const session = await AsyncStorage.getItem('user_session');
            if (session) {
                const userData = JSON.parse(session);
                // Fix for mismatch where Onboarding saved it as 'firestoreId'
                if (!userData.id && userData.firestoreId) {
                    userData.id = userData.firestoreId;
                }
                setUser(userData);
                setNickname(userData.nickname || '');
                setFirstName(userData.firstName || '');
                setLastName(userData.lastName || '');
                setAvatar(userData.avatar || null);
            } else if (authUser) {
                // FALLBACK: Authenticated but no local session (e.g. after reset)
                console.log("ProfileScreen: No local session, using Auth User:", authUser.uid);
                const fallbackUser = {
                    id: authUser.uid,
                    email: authUser.email,
                    nickname: '', // Force update
                };
                setUser(fallbackUser);
            } else {
                // No session, no auth user -> Redirect or handle
                console.log("ProfileScreen: No user found at all. Logging out.");
                // navigation.replace('Auth'); // ERROR: The action 'REPLACE' with payload {"name":"Auth"} was not handled by any navigator.
                logout();
            }
        } catch (e) {
            console.error("Error loading profile:", e);
        } finally {
            setLoading(false); // Valid stop
        }
    };

    const pickImage = async () => {
        // Request permission
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert(t('ERROR'), t('PERMISSION_NEEDED') || "Permission Needed");
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ImagePicker.MediaTypeOptions.Images,
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.5,
        });

        if (!result.canceled) {
            setAvatar(result.assets[0].uri);
        }
    };

    const handleSave = async () => {
        if (!user) return;
        let finalNickname = nickname.trim();
        const finalFirstName = firstName.trim();
        const finalLastName = lastName.trim();

        // Auto-fill Nickname from Name if empty
        if (!finalNickname) {
            if (finalFirstName) {
                finalNickname = finalFirstName;
                setNickname(finalNickname); // Update UI state
            } else {
                Alert.alert(t('ERROR'), t('NICKNAME_REQUIRED') || "Nickname (or First Name) is required.");
                return;
            }
        }

        setLoading(true);
        try {
            const updatedData = {
                ...user,
                nickname: finalNickname,
                firstName: finalFirstName,
                lastName: finalLastName,
                avatar: avatar
            };

            // 1. Update Firestore
            const success = await updateUser(user.id, {
                nickname: updatedData.nickname,
                firstName: updatedData.firstName,
                lastName: updatedData.lastName,
                avatar: updatedData.avatar
            });

            if (success) {
                // 2. Update Local Storage
                await AsyncStorage.setItem('user_session', JSON.stringify(updatedData));
                setUser(updatedData);
                await AsyncStorage.setItem('user_session', JSON.stringify(updatedData));
                setUser(updatedData);
                Alert.alert(t('SUCCESS'), t('SUCCESS_UPDATE'));
                navigation.goBack(); // Return to Home to see changes
            } else {
                Alert.alert(t('ERROR'), "Failed to update profile online.");
            }
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "An unexpected error occurred.");
        } finally {
            setLoading(false);
        }
    };

    const handleLogout = () => {
        // Different behavior if we are in Force Update mode (incomplete profile)
        if (route.params?.forceUpdate) {
            Alert.alert(
                t('CANCEL_REGISTRATION') || "Cancel Registration",
                t('CANCEL_REGISTRATION_CONFIRM') || "Do you want to cancel the registration process? Your account will be deleted.",
                [
                    { text: t('NO'), style: "cancel" },
                    {
                        text: t('YES_DELETE'),
                        style: "destructive",
                        onPress: async () => {
                            setLoading(true);
                            try {
                                if (auth.currentUser) {
                                    console.log("Cancelling registration - Deleting user:", auth.currentUser.uid);

                                    // 1. Delete Firestore Profile
                                    if (user && user.id) {
                                        const userRef = doc(db, "users", user.id);
                                        await deleteDoc(userRef);
                                        console.log("Firestore profile deleted.");
                                    }

                                    // 2. Delete Auth User
                                    await deleteUser(auth.currentUser);
                                    console.log("Auth user deleted.");

                                    // 3. Clear local storage
                                    await AsyncStorage.clear();

                                } else {
                                    await logout();
                                }
                            } catch (e) {
                                console.error("Error deleting user:", e);
                                if (e.code === 'auth/requires-recent-login') {
                                    Alert.alert("Security Issue", "To delete your account, you must log in again. Logging you out now...");
                                } else {
                                    Alert.alert("Error", "Could not delete account fully. Check your connection.");
                                }
                                await logout();
                            } finally {
                                setLoading(false);
                            }
                        }
                    }
                ]
            );
            return;
        }

        // Standard Logout for normal users
        Alert.alert(
            t('LOGOUT'),
            t('LOGOUT_CONFIRM'),
            [
                { text: t('CANCEL'), style: "cancel" },
                {
                    text: t('LOGOUT'),
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        await logout();
                    }
                }
            ]
        );
    };

    if (!user) {
        return <View style={styles.container}><ActivityIndicator color="#ccff00" /></View>;
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                {!route.params?.forceUpdate && (
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                        <Ionicons name="close" size={28} color="#fff" />
                    </TouchableOpacity>
                )}
                {route.params?.forceUpdate && <View style={{ width: 28 }} />}

                <Text style={styles.headerTitle}>{t('EDIT_PROFILE')}</Text>
                <View style={{ width: 28 }} />
            </View>

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.content}>

                    {/* Avatar Selection */}
                    <View style={styles.avatarSection}>
                        <TouchableOpacity onPress={pickImage} activeOpacity={0.8}>
                            {avatar ? (
                                <Image source={{ uri: avatar }} style={styles.avatarLarge} />
                            ) : (
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarInitials}>
                                        {(firstName ? firstName[0] : nickname[0] || '?').toUpperCase()}
                                    </Text>
                                </View>
                            )}
                            <View style={styles.editBadge}>
                                <Ionicons name="camera" size={16} color="#000" />
                            </View>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => setAvatar(null)}>
                            <Text style={styles.removeAvatarText}>{t('REMOVE_PHOTO')}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Language Selector */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{t('LANGUAGE')}</Text>
                        <View style={{ flexDirection: 'row', gap: 10 }}>
                            <TouchableOpacity
                                style={[styles.langBtn, language === 'IT' && styles.langBtnActive]}
                                onPress={() => setLanguage('IT')}
                            >
                                <Text style={[styles.langText, language === 'IT' && styles.langTextActive]}>🇮🇹 Italiano</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.langBtn, language === 'EN' && styles.langBtnActive]}
                                onPress={() => setLanguage('EN')}
                            >
                                <Text style={[styles.langText, language === 'EN' && styles.langTextActive]}>🇬🇧 English</Text>
                            </TouchableOpacity>
                        </View>
                    </View>

                    {/* Form Fields */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{t('NICKNAME')}</Text>
                        <TextInput
                            style={styles.input}
                            value={nickname}
                            onChangeText={setNickname}
                            placeholder="Your Nickname"
                            placeholderTextColor="#555"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{t('FIRST_NAME')}</Text>
                        <TextInput
                            style={styles.input}
                            value={firstName}
                            onChangeText={setFirstName}
                            placeholder="First Name"
                            placeholderTextColor="#555"
                        />
                    </View>

                    <View style={styles.formGroup}>
                        <Text style={styles.label}>{t('LAST_NAME')}</Text>
                        <TextInput
                            style={styles.input}
                            value={lastName}
                            onChangeText={setLastName}
                            placeholder="Last Name"
                            placeholderTextColor="#555"
                        />
                    </View>

                    <View style={{ height: 40 }} />

                    {/* Actions */}
                    <TouchableOpacity
                        style={[styles.saveBtn, loading && styles.disabledBtn]}
                        onPress={handleSave}
                        disabled={loading}
                    >
                        {loading ? <ActivityIndicator color="#000" /> : <Text style={styles.saveBtnText}>{t('SAVE_CHANGES')}</Text>}
                    </TouchableOpacity>

                    <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                        <Text style={styles.logoutText}>{t('LOGOUT')}</Text>
                    </TouchableOpacity>

                    {/* DELETE ACCOUNT BUTTON - Accessible to ALL users */}
                    <TouchableOpacity
                        style={[styles.logoutBtn, { borderColor: '#ff0000', backgroundColor: 'rgba(255, 0, 0, 0.2)', marginTop: -20 }]}
                        onPress={() => {
                            Alert.alert(
                                t('DELETE_ACCOUNT') || "Delete Account",
                                t('DELETE_ACCOUNT_CONFIRM') || "Are you sure? This will permanently delete your account and data.",
                                [
                                    { text: t('CANCEL'), style: "cancel" },
                                    {
                                        text: t('YES_DELETE'),
                                        style: "destructive",
                                        onPress: async () => {
                                            // Re-use the deletion logic
                                            setLoading(true);
                                            try {
                                                if (auth.currentUser) {
                                                    // 1. Delete Firestore Profile
                                                    if (user && user.id) {
                                                        const userRef = doc(db, "users", user.id);
                                                        await deleteDoc(userRef);
                                                    }
                                                    // 2. Delete Auth User
                                                    await deleteUser(auth.currentUser);
                                                    // 3. Clear local storage
                                                    await AsyncStorage.clear();
                                                } else {
                                                    await logout();
                                                }
                                            } catch (e) {
                                                console.error("Error deleting user:", e);
                                                if (e.code === 'auth/requires-recent-login') {
                                                    Alert.alert("Security Issue", "To delete your account, you must log in again. Logging you out now...");
                                                } else {
                                                    Alert.alert("Error", "Could not delete account fully.");
                                                }
                                                await logout();
                                            } finally {
                                                setLoading(false);
                                            }
                                        }
                                    }
                                ]
                            );
                        }}
                    >
                        <Text style={[styles.logoutBtn, { color: '#ff0000' }]}>{t('DELETE_ACCOUNT') || "DELETE ACCOUNT"}</Text>
                    </TouchableOpacity>

                    <Text style={styles.versionText}>v1.0.0 • TooMatch</Text>

                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 50,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: '#0a0a0a',
        borderBottomWidth: 1,
        borderBottomColor: '#1c1c1e',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    // Avatar
    avatarSection: {
        alignItems: 'center',
        marginBottom: 40,
        marginTop: 10,
    },
    avatarLarge: {
        width: 120,
        height: 120,
        borderRadius: 60,
        borderWidth: 2,
        borderColor: '#333',
    },
    avatarPlaceholder: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#1c1c1e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#333',
    },
    avatarInitials: {
        color: '#888',
        fontSize: 48,
        fontWeight: 'bold',
    },
    editBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#ccff00',
        width: 36,
        height: 36,
        borderRadius: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 3,
        borderColor: '#000',
    },
    removeAvatarText: {
        color: '#ff3b30',
        fontSize: 12,
        marginTop: 15,
        fontWeight: '600',
    },
    // Form
    formGroup: {
        marginBottom: 20,
    },
    label: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 8,
        letterSpacing: 1,
    },
    input: {
        backgroundColor: '#1c1c1e',
        color: '#fff',
        padding: 16,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    // Buttons
    saveBtn: {
        backgroundColor: '#ccff00',
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1,
    },
    logoutBtn: {
        padding: 18,
        borderRadius: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ff3b30',
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        marginBottom: 40,
    },
    logoutText: {
        color: '#ff3b30',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    versionText: {
        color: '#333',
        textAlign: 'center',
        fontSize: 10,
        marginBottom: 20,
    },
    // Language
    langBtn: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        backgroundColor: '#1c1c1e',
        borderWidth: 1,
        borderColor: '#333',
        alignItems: 'center',
    },
    langBtnActive: {
        borderColor: '#ccff00',
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
    },
    langText: {
        color: '#666',
        fontWeight: '600',
    },
    langTextActive: {
        color: '#ccff00',
        fontWeight: '700',
    }
});
