import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, Image, Platform, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext'; // Import Auth Context
import { useLanguage } from '../context/LanguageContext';

export default function AuthScreen({ navigation }) {
    const { login, register, resetPassword } = useAuth(); // Added resetPassword
    const { t } = useLanguage();

    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [nickname, setNickname] = useState(''); // Only for registration
    const [loading, setLoading] = useState(false);

    React.useEffect(() => {
        console.log("AuthScreen: MOUNTED");
    }, []);

    const handleAuth = async () => {
        if (!email || !password) {
            Alert.alert(t('ERROR'), t('FILL_ALL'));
            return;
        }

        if (!isLogin && !nickname) {
            Alert.alert(t('ERROR'), t('FILL_ALL')); // Needs "Nickname is required" translation eventually
            return;
        }

        setLoading(true);
        try {
            if (isLogin) {
                await login(email, password);
                // Navigation is handled by App.js state change, or we can force it
            } else {
                await register(email, password, { nickname });
            }
        } catch (error) {
            console.log("Auth Error:", error.code, error.message); // Use log, not error to avoid red screen
            let msg = error.message || "";
            if (msg.includes('auth/email-already-in-use')) msg = t('EMAIL_IN_USE') || "Email already in use";
            if (msg.includes('auth/invalid-email')) msg = t('INVALID_EMAIL') || "Invalid email";
            if (msg.includes('auth/weak-password')) msg = t('WEAK_PASSWORD') || "Password too weak";
            if (msg.includes('auth/user-not-found') || msg.includes('auth/wrong-password') || msg.includes('auth/invalid-credential')) {
                msg = t('LOGIN_FAILED') || "Invalid credentials";
            }
            if (msg.includes('auth/profile-not-found')) {
                msg = "Login successful but Profile not found. Please Register or contact support.";
            }

            Alert.alert(t('ERROR'), msg);
        } finally {
            setLoading(false);
        }
    };

    const handlePasswordReset = async () => {
        if (!email) {
            Alert.alert("Input Required", "Please enter your email address to reset password.");
            return;
        }
        setLoading(true);
        try {
            await resetPassword(email);
            Alert.alert("Success", "Password reset email sent! Check your inbox.");
        } catch (e) {
            console.log("Reset Error:", e);
            Alert.alert("Error", "Could not send reset email. Verify the email is correct.");
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

            <View style={styles.logoContainer}>
                {/* Placeholder Logo */}
                <Text style={styles.logoText}>TooMatch</Text>
                <Text style={styles.tagline}>{t('APP_TAGLINE') || "Track your tennis journey"}</Text>
            </View>

            <View style={styles.formContainer}>
                <Text style={styles.header}>{isLogin ? t('LOGIN') : t('REGISTER')}</Text>

                {!isLogin && (
                    <View style={styles.inputGroup}>
                        <Text style={styles.label}>{t('NICKNAME')}</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Display Name"
                            placeholderTextColor="#666"
                            value={nickname}
                            onChangeText={setNickname}
                            autoCapitalize="words"
                        />
                    </View>
                )}

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('EMAIL')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="you@example.com"
                        placeholderTextColor="#666"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>{t('PASSWORD')}</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="••••••••"
                        placeholderTextColor="#666"
                        value={password}
                        onChangeText={setPassword}
                        secureTextEntry
                    />
                </View>

                {isLogin && (
                    <TouchableOpacity
                        style={{ alignSelf: 'flex-end', marginTop: 10 }}
                        onPress={handlePasswordReset}
                    >
                        <Text style={{ color: '#888', textDecorationLine: 'underline', fontSize: 12 }}>
                            Forgot Password?
                        </Text>
                    </TouchableOpacity>
                )}

                <TouchableOpacity
                    style={styles.button}
                    onPress={handleAuth}
                    disabled={loading}
                >
                    <LinearGradient
                        colors={['#ccff00', '#99cc00']}
                        style={styles.gradient}
                    >
                        {loading ? (
                            <ActivityIndicator color="#000" />
                        ) : (
                            <Text style={styles.buttonText}>{isLogin ? t('LOGIN_BUTTON') : t('REGISTER_BUTTON')}</Text>
                        )}
                    </LinearGradient>
                </TouchableOpacity>

                <TouchableOpacity onPress={() => setIsLogin(!isLogin)} style={styles.switchButton}>
                    <Text style={styles.switchText}>
                        {isLogin ? (t('NO_ACCOUNT') || "Don't have an account? Sign up") : (t('HAVE_ACCOUNT') || "Already have an account? Log in")}
                    </Text>
                </TouchableOpacity>
            </View>



        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        paddingHorizontal: 20,
    },
    logoContainer: {
        alignItems: 'center',
        marginBottom: 50,
    },
    logoText: {
        fontSize: 48,
        fontWeight: '900',
        color: '#ccff00',
        letterSpacing: -2,
        fontStyle: 'italic',
    },
    tagline: {
        color: '#888',
        fontSize: 14,
        letterSpacing: 1,
        marginTop: 5,
    },
    formContainer: {
        backgroundColor: '#111',
        padding: 24,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#222',
    },
    header: {
        fontSize: 24,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 24,
        textAlign: 'center',
    },
    inputGroup: {
        marginBottom: 16,
    },
    label: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
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
    button: {
        borderRadius: 12,
        overflow: 'hidden',
        marginTop: 24,
    },
    gradient: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
    },
    switchButton: {
        marginTop: 20,
        alignItems: 'center',
        padding: 10,
    },
    switchText: {
        color: '#888',
        fontSize: 14,
    },
    // Error Modal Styles
    errorModalOverlay: {
        position: 'absolute',
        top: 0,
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 1000,
        padding: 20
    },
    errorModalContent: {
        backgroundColor: '#1c1c1e',
        borderRadius: 20,
        padding: 24,
        width: '100%',
        maxWidth: 340,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#333',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 10,
    },
    errorHeader: {
        marginBottom: 12,
    },
    errorTitle: {
        color: '#ff3b30', // System Red
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.5
    },
    errorMessage: {
        color: '#fff',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 24,
        lineHeight: 22,
        opacity: 0.9
    },
    errorButton: {
        backgroundColor: '#333',
        paddingVertical: 12,
        paddingHorizontal: 32,
        borderRadius: 30,
        minWidth: 120,
        alignItems: 'center'
    },
    errorButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700'
    }
});
