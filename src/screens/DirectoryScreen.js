import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator, Linking } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { Ionicons } from '@expo/vector-icons';
import { seedMatches, getDetailedStats } from '../services/matchService'; // Import getDetailedStats
import { useLanguage } from '../context/LanguageContext';

export default function DirectoryScreen({ navigation }) {
    const { t, language } = useLanguage();
    const [users, setUsers] = useState([]);
    const [venues, setVenues] = useState([]);
    const [activeTab, setActiveTab] = useState('players');
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);
    const [rivalStats, setRivalStats] = useState({}); // Store stats map
    const [seeding, setSeeding] = useState(false);
    const [currentUserId, setCurrentUserId] = useState(null);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [activeTab])
    );

    const handleSeed = async () => {
        setSeeding(true);
        await seedMatches();
        setSeeding(false);
        alert("Added 13+ test matches! Refresh Stats.");
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            // Get Current User ID for highlighting
            const session = await AsyncStorage.getItem('user_session');
            if (session) {
                const user = JSON.parse(session);
                setCurrentUserId(user.firestoreId || user.id);
            }

            // Fetch Stats if in players tab
            if (activeTab === 'players') {
                const detailedStats = await getDetailedStats();
                const statsMap = {};
                if (detailedStats.rivals) {
                    detailedStats.rivals.forEach(r => {
                        statsMap[r.name.toUpperCase()] = r;
                    });
                }
                setRivalStats(statsMap);
            }

            const collectionName = activeTab === 'players' ? 'users' : 'venues';
            const sortField = activeTab === 'players' ? 'nickname' : 'name';

            // Allow basic alphabetical sorting (might require index, but usually fine for small lists)
            const q = query(collection(db, collectionName), orderBy(sortField, 'asc'));

            const snapshot = await getDocs(q);
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            setData(items);
        } catch (e) {
            console.error("Error fetching directory:", e);
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }) => {
        // Calculate Stats for Player
        let statContent = null;

        if (activeTab === 'players') {
            const key = item.nickname?.toUpperCase();
            const stat = rivalStats[key] || { won: 0, played: 0 };
            const losses = stat.played - stat.won;
            const total = stat.played;

            // Labels based on language
            const winLabel = language === 'IT' ? 'V' : 'W';
            const lossLabel = language === 'IT' ? 'P' : 'L';
            const totLabel = 'Tot';

            // Always show structure or dashed if 0
            // Colors: Win=Green, Loss=Red
            statContent = (
                <View style={styles.statsRow}>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabelHeader}>{winLabel}</Text>
                        <Text style={[styles.statValue, total > 0 ? styles.statWin : styles.statDim]}>{total > 0 ? stat.won : '-'}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabelHeader}>{lossLabel}</Text>
                        <Text style={[styles.statValue, total > 0 ? styles.statLoss : styles.statDim]}>{total > 0 ? losses : '-'}</Text>
                    </View>
                    <View style={styles.statCol}>
                        <Text style={styles.statLabelHeader}>{totLabel}</Text>
                        <Text style={[styles.statValue, total > 0 ? null : styles.statDim]}>{total > 0 ? total : '-'}</Text>
                    </View>
                </View>
            );
        }

        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EntityDetail', { type: activeTab === 'players' ? 'player' : 'venue', id: item.id })}
            >
                <View style={[styles.card, item.id === currentUserId && activeTab === 'players' && styles.currentUserCard]}>
                    {activeTab === 'players' ? (
                        <>
                            <View style={styles.rowLeft}>
                                <View style={styles.avatarPlaceholder}>
                                    <Text style={styles.avatarText}>{item.nickname?.charAt(0).toUpperCase()}</Text>
                                </View>
                                <View>
                                    <Text style={styles.name}>{item.nickname}</Text>
                                    {/* Name Surname Row */}
                                    {(item.firstName || item.lastName) && (
                                        <Text style={styles.fullName}>
                                            {item.firstName} {item.lastName}
                                        </Text>
                                    )}
                                    <Text style={styles.subtext}>Player</Text>
                                </View>
                            </View>

                            {/* Right Side Stats Columns */}
                            <View style={styles.statsContainer}>
                                {statContent}
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={styles.rowLeft}>
                                {/* Map Link */}
                                <TouchableOpacity
                                    onPress={() => {
                                        if (item.address) {
                                            const query = encodeURIComponent(item.address);
                                            Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                                        }
                                    }}
                                    activeOpacity={0.6}
                                >
                                    <View style={[styles.avatarPlaceholder, styles.venueAvatar]}>
                                        <Ionicons name="location" size={20} color="#ccff00" />
                                    </View>
                                </TouchableOpacity>

                                <View style={{ flex: 1, marginRight: 10 }}>
                                    {/* Row: Name (Left) + Phone (Right) */}
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                                        <Text style={[styles.name, { flex: 1, marginRight: 8 }]} numberOfLines={1}>{item.name}</Text>

                                        {item.phoneNumber ? (
                                            <TouchableOpacity
                                                activeOpacity={0.7}
                                                onPress={() => Linking.openURL(`tel:${item.phoneNumber}`)}
                                                style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(204,255,0,0.1)', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12 }}
                                            >
                                                <Ionicons name="call" size={12} color="#ccff00" style={{ marginRight: 4 }} />
                                                <Text style={{ color: '#ccff00', fontSize: 10, fontWeight: 'bold' }}>{item.phoneNumber}</Text>
                                            </TouchableOpacity>
                                        ) : null}
                                    </View>

                                    {/* Address (Larger Font) */}
                                    <TouchableOpacity
                                        onPress={() => {
                                            if (item.address) {
                                                const query = encodeURIComponent(item.address);
                                                Linking.openURL(`https://www.google.com/maps/search/?api=1&query=${query}`);
                                            }
                                        }}
                                        disabled={!item.address}
                                    >
                                        <Text style={[styles.subtext, { fontSize: 13, color: '#bbb' }]} numberOfLines={2}>
                                            {item.address || "No address"}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </>
                    )}
                </View>
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar style="light" />
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.headerTitle}>{t('CLUBHOUSE')}</Text>

                {/* TEMP: Test Data Button */}
                <TouchableOpacity onPress={handleSeed} disabled={seeding} style={{ marginRight: 10, padding: 5, backgroundColor: '#333', borderRadius: 5 }}>
                    <Text style={{ color: 'white', fontSize: 10 }}>{seeding ? '...' : 'Seed Data'}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => navigation.navigate('EntityDetail', { type: activeTab === 'players' ? 'player' : 'venue', id: null })}
                >
                    <Ionicons name="add" size={24} color="white" />
                </TouchableOpacity>
            </View>

            {/* Toggle Switch */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'players' && styles.activeBtn]}
                    onPress={() => setActiveTab('players')}
                >
                    <Text style={[styles.toggleText, activeTab === 'players' && styles.activeText]}>{language === 'IT' ? 'GIOCATORI' : 'PLAYERS'}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'venues' && styles.activeBtn]}
                    onPress={() => setActiveTab('venues')}
                >
                    <Text style={[styles.toggleText, activeTab === 'venues' && styles.activeText]}>{language === 'IT' ? 'CAMPI' : 'VENUES'}</Text>
                </TouchableOpacity>
            </View>

            {/* List */}
            {loading ? (
                <ActivityIndicator size="large" color="#ccff00" style={{ marginTop: 50 }} />
            ) : (
                <FlatList
                    data={data}
                    renderItem={renderItem}
                    keyExtractor={item => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <Text style={styles.emptyText}>No {activeTab} found yet.</Text>
                    }
                />
            )}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: '#0a0a0a',
        borderBottomWidth: 1,
        borderBottomColor: '#1c1c1e',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    addButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    toggleContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        backgroundColor: '#111',
    },
    activeBtn: {
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        borderColor: '#ccff00',
    },
    toggleText: {
        color: '#666',
        fontWeight: '700',
        fontSize: 12,
        letterSpacing: 1,
    },
    activeText: {
        color: '#ccff00',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    card: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between', // Changed to split left/right
        padding: 16,
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        marginBottom: 10,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    rowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    currentUserCard: {
        borderColor: '#ccff00',
        backgroundColor: 'rgba(204, 255, 0, 0.05)',
    },
    avatarPlaceholder: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#333',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 15,
    },
    venueAvatar: {
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(204, 255, 0, 0.3)',
    },
    avatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    name: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    fullName: {
        color: '#aaa',
        fontSize: 12,
        fontWeight: '500',
    },
    subtext: {
        color: '#666',
        fontSize: 10,
        marginTop: 2,
    },
    statsContainer: {
        justifyContent: 'center',
    },
    statsRow: {
        flexDirection: 'row',
        gap: 12,
    },
    statCol: {
        alignItems: 'center',
        minWidth: 24,
    },
    statLabelHeader: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        marginBottom: 2,
    },
    statValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    statWin: {
        color: '#4cd964',
    },
    statLoss: {
        color: '#ff3b30',
    },
    statDim: {
        color: '#444',
    },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 40,
        fontStyle: 'italic',
    }
});
