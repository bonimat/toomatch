import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, KeyboardAvoidingView, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getOrCreateUser } from '../services/userService';
import { updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useLanguage } from '../context/LanguageContext';

export default function OnboardingScreen({ navigation }) {
    const { t } = useLanguage();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [nickname, setNickname] = useState('');
    const [isNicknameManuallyEdited, setIsNicknameManuallyEdited] = useState(false);
    const [loading, setLoading] = useState(false);

    const handleFirstNameChange = (text) => {
        setFirstName(text);
        if (!isNicknameManuallyEdited) {
            setNickname(text);
        }
    };

    const handleNicknameChange = (text) => {
        setNickname(text);
        setIsNicknameManuallyEdited(true);
    };

    const handleStart = async () => {
        if (!firstName.trim() || !lastName.trim() || !nickname.trim()) {
            Alert.alert(t('MISSING_FIELDS'), t('FILL_ALL'));
            return;
        }

        setLoading(true);
        try {
            // 1. Create User in Firestore (using logic similar to our service)
            // We use nickname as the main "key" for now in getOrCreate, but ideally we should have a cleaner "CreateMe" function.
            // Reusing getOrCreateUser for simplicity, then updating full fields.
            const userDoc = await getOrCreateUser(nickname);

            // 2. Update with full real name details
            await updateDoc(doc(db, 'users', userDoc.id), {
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                isRegistered: true, // Mark as the "Owner" user if we wanted logic for that
            });

            // 3. Save to Local Storage to remember session
            const userData = {
                uuid: userDoc.uuid,
                id: userDoc.id, // Standardize on 'id'
                firstName: firstName.trim(),
                lastName: lastName.trim(),
                nickname: nickname.trim()
            };

            await AsyncStorage.setItem('user_session', JSON.stringify(userData));

            // 4. Navigate Home
            navigation.replace('Main');

        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not create profile. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <StatusBar style="light" />

            <View style={styles.content}>
                <Text style={styles.title}>{t('WHO_ARE_YOU')}</Text>
                <Text style={styles.subtitle}>{t('CREATE_PROFILE')}</Text>

                <View style={styles.form}>
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('FIRST_NAME')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Jannik"
                            placeholderTextColor="#555"
                            value={firstName}
                            onChangeText={handleFirstNameChange}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('LAST_NAME')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Sinner"
                            placeholderTextColor="#555"
                            value={lastName}
                            onChangeText={setLastName}
                        />
                    </View>

                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('NICKNAME')}</Text>
                        <Text style={styles.helper}>This will be displayed in match history.</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="TheFox"
                            placeholderTextColor="#555"
                            value={nickname}
                            onChangeText={handleNicknameChange}
                            autoCapitalize="none"
                        />
                    </View>
                </View>

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleStart}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#ccff00', '#99cc00']}
                        style={styles.gradient}
                    >
                        <Text style={styles.buttonText}>{loading ? t('CREATING_MATCH') : t('START_PLAYING')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    content: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: 30,
    },
    title: {
        fontSize: 32,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 2,
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 16,
        color: '#888',
        textAlign: 'center',
        marginBottom: 50,
    },
    form: {
        marginBottom: 40,
    },
    inputGroup: {
        marginBottom: 25,
    },
    label: {
        color: '#ccff00',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 10,
    },
    helper: {
        color: '#555',
        fontSize: 10,
        marginBottom: 8,
        fontStyle: 'italic',
    },
    input: {
        backgroundColor: '#1c1c1e',
        color: '#fff',
        padding: 15,
        borderRadius: 12,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    button: {
        borderRadius: 30,
        overflow: 'hidden',
        marginTop: 20,
    },
    gradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    }
});
