import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Alert, ActivityIndicator, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';

// Services
import { deleteAllUsers } from '../services/userService';
import { deleteAllMatches } from '../services/matchService';
import { deleteAllVenues } from '../services/venueService';
import { seedDatabase } from '../services/seedService';
import { deleteUser } from 'firebase/auth';
import { auth, db } from '../../firebaseConfig';
import { doc, deleteDoc } from 'firebase/firestore';

export default function AdminScreen() {
    const navigation = useNavigation();
    const { logout, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [statusLog, setStatusLog] = useState([]);

    const log = (msg) => setStatusLog(prev => [...prev, `> ${msg}`]);

    const handleResetAll = () => {
        Alert.alert(
            "RESET EVERYTHING",
            "DANGER: This will wipe ALL USERS, ALL MATCHES, ALL VENUES and your current account. App will reset to factory state.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "NUKE IT ALL",
                    style: "destructive",
                    onPress: async () => {
                        setLoading(true);
                        setStatusLog([]);
                        log("Starting Full Reset...");

                        try {
                            // 1. Collections
                            log("Deleting Matches...");
                            await deleteAllMatches();
                            log("Matches deleted.");

                            log("Deleting Venues...");
                            await deleteAllVenues();
                            log("Venues deleted.");

                            log("Deleting Users...");
                            await deleteAllUsers();
                            log("Users deleted.");

                            // 2. Auth & Self
                            if (auth.currentUser) {
                                log("Deleting Authentication...");
                                try {
                                    await deleteUser(auth.currentUser);
                                    log("Auth User deleted.");
                                } catch (e) {
                                    log("Auth Delete Error: " + e.message);
                                    if (e.code === 'auth/requires-recent-login') {
                                        Alert.alert("Security", "Please re-login to delete account.");
                                    }
                                }
                            }

                            // 3. Storage
                            log("Clearing Local Storage...");
                            await AsyncStorage.clear();
                            log("Storage cleared.");

                            Alert.alert("Reset Complete", "App has been wiped. Please restart.");
                            // ideally restart or logout
                            logout();

                        } catch (e) {
                            log("ERROR: " + e.message);
                            console.error(e);
                        } finally {
                            setLoading(false);
                        }
                    }
                }
            ]
        );
    };

    const handleSeedData = async () => {
        if (!user) {
            Alert.alert("Error", "You must be logged in to seed data (so specific matches are assigned to you).");
            return;
        }

        setLoading(true);
        setStatusLog([]);
        log("Starting Seeding Process...");

        try {
            const result = await seedDatabase();
            if (result.success) {
                log("Seeding Complete!");
                Alert.alert("Success", "Database populated with test data.");
            } else {
                log("Seeding Failed: " + result.error);
                Alert.alert("Error", "Seeding failed. Check logs.");
            }
        } catch (e) {
            log("Critical Error: " + e.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>ADMIN AREA</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                <View style={styles.warningBox}>
                    <Ionicons name="warning" size={32} color="#ffcc00" />
                    <Text style={styles.warningText}>
                        This area is for developers/testing only. Actions here are destructive and irreversible.
                    </Text>
                </View>

                {/* SEED SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>TEST DATA</Text>
                    <TouchableOpacity style={styles.actionBtn} onPress={handleSeedData} disabled={loading}>
                        <Ionicons name="leaf" size={20} color="#000" style={{ marginRight: 10 }} />
                        <Text style={styles.btnText}>SEED DATABASE (Populate)</Text>
                    </TouchableOpacity>
                    <Text style={styles.description}>
                        Generates ~15 Users, ~5 Venues, ~30 Matches linked to YOU.
                    </Text>
                </View>

                {/* RESET SECTION */}
                <View style={[styles.section, { borderColor: '#ff3b30' }]}>
                    <Text style={[styles.sectionTitle, { color: '#ff3b30' }]}>DANGER ZONE</Text>
                    <TouchableOpacity
                        style={[styles.actionBtn, { backgroundColor: '#ff3b30' }]}
                        onPress={handleResetAll}
                        disabled={loading}
                    >
                        <Ionicons name="trash" size={20} color="#fff" style={{ marginRight: 10 }} />
                        <Text style={[styles.btnText, { color: '#fff' }]}>RESET EVERYTHING (Factory Wipe)</Text>
                    </TouchableOpacity>
                    <Text style={styles.description}>
                        Deletes ALL matches, users, venues, and your account. Resets app to clean install state.
                    </Text>
                </View>

                {/* LOGS */}
                <View style={styles.console}>
                    <Text style={styles.consoleTitle}>Console Output:</Text>
                    <ScrollView style={{ height: 150 }} nestedScrollEnabled>
                        {statusLog.length === 0 && <Text style={{ color: '#555', fontStyle: 'italic' }}>Ready...</Text>}
                        {statusLog.map((line, i) => (
                            <Text key={i} style={styles.logLine}>{line}</Text>
                        ))}
                    </ScrollView>
                </View>

                {loading && (
                    <View style={styles.loadingOverlay}>
                        <ActivityIndicator size="large" color="#ccff00" />
                        <Text style={{ color: '#fff', marginTop: 10, fontWeight: 'bold' }}>PROCESSING...</Text>
                    </View>
                )}

            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#111',
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
        borderBottomColor: '#222',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    warningBox: {
        backgroundColor: 'rgba(255, 204, 0, 0.1)',
        borderWidth: 1,
        borderColor: '#ffcc00',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 30,
    },
    warningText: {
        color: '#ffcc00',
        fontSize: 12,
        flex: 1,
    },
    section: {
        marginBottom: 30,
        backgroundColor: '#1c1c1e',
        padding: 20,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#333',
    },
    sectionTitle: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 15,
    },
    actionBtn: {
        backgroundColor: '#ccff00',
        padding: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 10,
    },
    btnText: {
        color: '#000',
        fontWeight: 'bold',
    },
    description: {
        color: '#666',
        fontSize: 11,
        fontStyle: 'italic',
        textAlign: 'center',
    },
    console: {
        backgroundColor: '#000',
        padding: 15,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#333',
        height: 200,
    },
    consoleTitle: {
        color: '#4cd964',
        fontSize: 12,
        marginBottom: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    },
    logLine: {
        color: '#ccc',
        fontSize: 10,
        fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
        marginBottom: 2,
    },
    loadingOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 100,
    }
});
