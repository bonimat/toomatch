import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, RefreshControl, ActivityIndicator, Dimensions, TouchableOpacity } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { getDetailedStats } from '../services/matchService';

const { width } = Dimensions.get('window');

export default function StatsScreen() {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState(null);
    const [showAllRivals, setShowAllRivals] = useState(false);

    const loadStats = async () => {
        setLoading(true);
        const data = await getDetailedStats();
        setStats(data);
        setLoading(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadStats();
        }, [])
    );

    // Filter Rivals based on toggle
    const displayedRivals = stats?.rivals
        ? (showAllRivals ? stats.rivals : stats.rivals.slice(0, 5))
        : [];

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#ccff00" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            <View style={styles.header}>
                <Text style={styles.headerTitle}>PERFORMANCE</Text>
            </View>

            <ScrollView
                contentContainerStyle={styles.content}
                refreshControl={<RefreshControl refreshing={loading} onRefresh={loadStats} tintColor="#ccff00" />}
            >

                {/* HERO STAT: WIN RATE */}
                <View style={styles.heroCard}>
                    <Text style={styles.heroLabel}>WIN RATE</Text>
                    <View style={styles.heroValueContainer}>
                        <Text style={styles.heroValue}>{stats?.winRate || 0}%</Text>
                        <Ionicons name={stats?.winRate >= 50 ? "trending-up" : "trending-down"} size={32} color={stats?.winRate >= 50 ? "#ccff00" : "#ff3b30"} />
                    </View>
                    <Text style={styles.heroSubtext}>
                        {stats?.wins} Wins - {stats?.losses} Losses
                    </Text>

                    {/* Visual Bar */}
                    <View style={styles.barContainer}>
                        <View style={[styles.barFill, { width: `${stats?.winRate}%` }]} />
                    </View>
                </View>

                {/* ROW: STREAK & TOTAL */}
                <View style={styles.row}>
                    <View style={styles.smallCard}>
                        <Ionicons name="flame" size={24} color={stats?.isWinStreak ? "#ccff00" : "#ff3b30"} />
                        <Text style={styles.smallCardValue}>{stats?.streak || 0}</Text>
                        <Text style={styles.smallCardLabel}>{stats?.isWinStreak ? 'WIN STREAK' : 'LOSS STREAK'}</Text>
                    </View>
                    <View style={styles.smallCard}>
                        <Ionicons name="tennisball" size={24} color="#666" />
                        <Text style={styles.smallCardValue}>{stats?.total || 0}</Text>
                        <Text style={styles.smallCardLabel}>MATCHES</Text>
                    </View>
                </View>

                {/* RECENT FORM */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>RECENT FORM</Text>
                    <View style={styles.formContainer}>
                        {stats?.recentHistory && stats.recentHistory.length > 0 ? (
                            stats.recentHistory.map((result, index) => (
                                <View key={index} style={[styles.formBadge, result === 'W' ? styles.winBadge : styles.lossBadge]}>
                                    <Text style={styles.formText}>{result}</Text>
                                </View>
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No matches yet.</Text>
                        )}
                    </View>
                </View>

                {/* ECONOMY */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>ECONOMY</Text>
                    <View style={styles.row}>
                        <View style={styles.smallCard}>
                            <Text style={[styles.smallCardValue, { color: '#ccff00' }]}>€{stats?.totalSpent || "0.00"}</Text>
                            <Text style={styles.smallCardLabel}>TOTAL SPENT</Text>
                        </View>
                        <View style={styles.smallCard}>
                            <Text style={styles.smallCardValue}>€{stats?.avgCost || "0.00"}</Text>
                            <Text style={styles.smallCardLabel}>AVG / MATCH</Text>
                        </View>
                    </View>
                </View>

                {/* RIVALS */}
                <View style={styles.section}>
                    <View style={styles.sectionHeaderRow}>
                        <Text style={styles.sectionTitle}>RIVALS</Text>
                        {stats?.rivals && stats.rivals.length > 5 && (
                            <TouchableOpacity onPress={() => setShowAllRivals(!showAllRivals)}>
                                <Text style={styles.viewAllBtn}>{showAllRivals ? 'Show Less' : 'View All'}</Text>
                            </TouchableOpacity>
                        )}
                    </View>

                    {displayedRivals.length > 0 ? (
                        displayedRivals.map((rival, index) => (
                            <View key={index} style={styles.listItem}>
                                <View style={styles.rivalInfo}>
                                    <View style={styles.rankBadge}><Text style={styles.rankText}>#{index + 1}</Text></View>
                                    <Text style={styles.rivalName}>{rival.name}</Text>
                                </View>
                                <View style={styles.rivalStats}>
                                    <Text style={styles.rivalRatio}>{rival.won} / {rival.played} Won</Text>
                                    <View style={styles.miniBarContainer}>
                                        <View style={[styles.miniBarFill, { width: `${(rival.won / rival.played) * 100}%` }]} />
                                    </View>
                                </View>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.emptyText}>Play more matches to see rival stats.</Text>
                    )}
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    loadingContainer: {
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center'
    },
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
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    content: {
        padding: 20,
    },
    // Hero Card
    heroCard: {
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 20,
        marginBottom: 15,
    },
    heroLabel: {
        color: '#888',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginBottom: 10,
    },
    heroValueContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    heroValue: {
        color: '#fff',
        fontSize: 48,
        fontWeight: '800',
    },
    heroSubtext: {
        color: '#666',
        fontSize: 14,
        marginBottom: 15,
    },
    barContainer: {
        height: 6,
        backgroundColor: '#333',
        borderRadius: 3,
        overflow: 'hidden',
    },
    barFill: {
        height: '100%',
        backgroundColor: '#ccff00',
    },
    // Small Cards
    row: {
        flexDirection: 'row',
        gap: 15,
        marginBottom: 25,
    },
    smallCard: {
        flex: 1,
        backgroundColor: '#1c1c1e',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    smallCardValue: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginVertical: 5,
    },
    smallCardLabel: {
        color: '#666',
        fontSize: 10,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },
    // Section
    section: {
        marginBottom: 25,
    },
    sectionHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
        paddingRight: 4,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginLeft: 4,
        marginBottom: 0, // Reset margin since it's in a row now
    },
    viewAllBtn: {
        color: '#ccff00',
        fontSize: 12,
        fontWeight: '600',
    },
    formContainer: {
        flexDirection: 'row',
        gap: 10,
    },
    formBadge: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
    },
    winBadge: {
        backgroundColor: 'rgba(204, 255, 0, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(204, 255, 0, 0.5)',
    },
    lossBadge: {
        backgroundColor: 'rgba(255, 59, 48, 0.2)',
        borderWidth: 1,
        borderColor: 'rgba(255, 59, 48, 0.5)',
    },
    formText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 16,
    },
    // List Items
    listItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: '#1c1c1e',
        padding: 15,
        borderRadius: 12,
        marginBottom: 10,
    },
    rivalInfo: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    rankBadge: {
        width: 24,
        height: 24,
        backgroundColor: '#333',
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    rankText: {
        color: '#888',
        fontSize: 10,
        fontWeight: 'bold',
    },
    rivalName: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
    rivalStats: {
        alignItems: 'flex-end',
        width: 100,
    },
    rivalRatio: {
        color: '#888',
        fontSize: 12,
        marginBottom: 6,
    },
    miniBarContainer: {
        width: '100%',
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
    },
    miniBarFill: {
        height: '100%',
        backgroundColor: '#ccff00',
    },
    emptyText: {
        color: '#555',
        fontStyle: 'italic',
        marginLeft: 5,
    }
});
