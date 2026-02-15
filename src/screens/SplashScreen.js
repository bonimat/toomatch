import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Dimensions, TouchableOpacity, Alert } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const SplashScreen = () => {
    // Animation Values
    const textOpacity = useRef(new Animated.Value(0)).current;
    const textScale = useRef(new Animated.Value(0.9)).current;

    // Additional decorative element opacity
    const glowOpacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        console.log("SplashScreen: MOUNTED and Animating...");
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
    }, []);

    const emergencyReset = async () => {
        try {
            await AsyncStorage.clear();
            Alert.alert("App Reset!", "All local data cleared. Please restart the app manually to finish.");
        } catch (e) {
            console.error("Failed to clear AsyncStorage:", e);
            Alert.alert("Error", "Failed to reset app data.");
        }
    };

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

            {/* EMERGENCY RESET BUTTON - For stuck users */}
            <TouchableOpacity onPress={emergencyReset} style={{ marginTop: 50, padding: 20 }}>
                <Text style={{ color: 'red', fontWeight: 'bold' }}>EMERGENCY RESET (Click if stuck)</Text>
            </TouchableOpacity>
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
