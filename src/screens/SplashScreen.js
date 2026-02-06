import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';

import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
    const navigation = useNavigation();

    // Animation Values
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textScale = useRef(new Animated.Value(0.9)).current;

    // Additional decorative element opacity
    const glowOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Simple elegant Fade In
        Animated.parallel([
            Animated.timing(textOpacity, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.timing(textScale, {
                toValue: 1,
                duration: 1200,
                useNativeDriver: true,
            }),
            Animated.timing(glowOpacity, {
                toValue: 1,
                duration: 1500,
                useNativeDriver: true,
            }),
        ]).start();

        // Check Session & Navigate
        const checkSession = async () => {
            try {
                const session = await AsyncStorage.getItem('user_session');
                // Wait a bit for animation sake
                setTimeout(() => {
                    if (session) {
                        navigation.replace('Main');
                    } else {
                        navigation.replace('Onboarding');
                    }
                }, 2000);
            } catch (e) {
                navigation.replace('Onboarding');
            }
        };

        checkSession();

    }, []);

    return (
        <View style={styles.container}>
            <LinearGradient
                colors={['#1a1a1a', '#000000']}
                style={styles.background}
            />

            {/* Subtle Ambient Glow */}
            <Animated.View style={[styles.glow, { opacity: glowOpacity }]} />

            {/* Text UI */}
            <Animated.View style={[styles.textContainer, { opacity: textOpacity, transform: [{ scale: textScale }] }]}>
                <Text style={styles.title}>TooMatch</Text>
                <Text style={styles.subtitle}>SERVE IT</Text>
            </Animated.View>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
    },
    background: {
        position: 'absolute',
        left: 0, right: 0, top: 0, bottom: 0,
    },
    glow: {
        position: 'absolute',
        width: width * 1.5,
        height: width * 1.5,
        borderRadius: width,
        backgroundColor: 'rgba(204, 255, 0, 0.03)', // Very subtle
        top: '20%',
    },
    textContainer: {
        alignItems: 'center',
        zIndex: 20,
    },
    title: {
        fontSize: 52,
        fontWeight: '900',
        fontStyle: 'italic',
        color: '#fff',
        letterSpacing: -2,
        textTransform: 'uppercase',
    },
    subtitle: {
        color: '#ccff00',
        fontSize: 14,
        fontWeight: '600',
        letterSpacing: 6,
        marginTop: 10,
        textTransform: 'uppercase',
    }
});

export default SplashScreen;
