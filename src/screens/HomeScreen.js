import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Dimensions, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { getDashboardStats } from '../services/matchService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
    const [loading, setLoading] = useState(true);
    const [dashboardData, setDashboardData] = useState({
        stats: { wins: 0, losses: 0, winRate: 0, streak: 0 },
        recentMatches: []
    });

    // Fetch data whenever screen comes into focus
    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const loadData = async () => {
        // setLoading(true); // Can skip full loader on refresh for smoother feel
        try {
            const data = await getDashboardStats();
            setDashboardData(data);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const { stats, recentMatches } = dashboardData;

    const renderMatchItem = (match) => {
        // Extract date data
        const d = new Date(match.date);
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();

        // Format Score (e.g. "6-4 6-2")
        const scoreString = match.sets.map(s => `${s.s1}-${s.s2}`).join(', ');

        return (
            <View key={match.id} style={styles.matchCard}>
                <View style={[styles.indicator, match.userWon ? styles.winIndicator : styles.lossIndicator]} />
                <View style={styles.matchDate}>
                    <Text style={styles.day}>{day}</Text>
                    <Text style={styles.month}>{month}</Text>
                </View>
                <View style={styles.matchInfo}>
                    <Text style={styles.opponent}>vs {match.player2}</Text>
                    <Text style={styles.location}>{match.location || "Unknown Court"}</Text>
                </View>
                <View style={styles.matchScore}>
                    <Text style={styles.scoreText}>{scoreString}</Text>
                    <Text style={[styles.outcomeText, match.userWon ? styles.textWin : styles.textLoss]}>
                        {match.userWon ? 'WIN' : 'LOSS'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar style="light" />
                <ActivityIndicator size="large" color="#ccff00" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <StatusBar style="light" />

            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Stats Overview,</Text>
                    <Text style={styles.username}>CHAMPION</Text>
                </View>
                <Image
                    source={{ uri: 'https://ui-avatars.com/api/?name=Champion&background=333&color=fff' }}
                    style={styles.avatar}
                />
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>

                {/* HERO CARD (Stats) */}
                <LinearGradient
                    colors={['#1c1c1e', '#111']}
                    style={styles.heroCard}
                >
                    <View style={styles.heroHeader}>
                        <Text style={styles.heroTitle}>WIN RATE</Text>
                        <Text style={styles.heroBadge}>LIFETIME</Text>
                    </View>

                    <View style={styles.heroMain}>
                        <Text style={styles.percentage}>{stats.winRate}<Text style={styles.percentSign}>%</Text></Text>

                        <View style={styles.statsRow}>
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{stats.wins}</Text>
                                <Text style={styles.statLabel}>WINS</Text>
                            </View>
                            <View style={[styles.statItem, styles.statBorder]}>
                                <Text style={styles.statVal}>{stats.losses}</Text>
                                <Text style={styles.statLabel}>LOSSES</Text>
                            </View>
                            <View style={styles.statItem}>
                                <Text style={styles.statVal}>{stats.streak}</Text>
                                <Text style={styles.statLabel}>STREAK</Text>
                            </View>
                        </View>
                    </View>

                    {/* Simple visuals based on Win Rate */}
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${stats.winRate}%` }]} />
                    </View>
                </LinearGradient>

                <Text style={styles.sectionTitle}>RECENT MATCHES</Text>

                {/* RECENT MATCH LIST */}
                <View style={styles.matchesList}>
                    {recentMatches.length === 0 ? (
                        <Text style={styles.emptyText}>No matches recorded yet. Tap + to add one!</Text>
                    ) : (
                        recentMatches.map(renderMatchItem)
                    )}
                </View>

                <View style={{ height: 100 }} />
            </ScrollView>

            {/* FAB - New Match */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('NewMatch')}
                activeOpacity={0.8}
            >
                <Text style={styles.fabIcon}>+</Text>
            </TouchableOpacity>

        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    greeting: {
        color: '#666',
        fontSize: 14,
        textTransform: 'uppercase',
        letterSpacing: 1,
        fontWeight: '600',
    },
    username: {
        color: '#fff',
        fontSize: 24,
        fontWeight: '800',
        marginTop: 4,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#333',
    },
    scrollContent: {
        padding: 20,
    },
    heroCard: {
        borderRadius: 24,
        padding: 24,
        marginBottom: 30,
        borderWidth: 1,
        borderColor: '#222',
    },
    heroHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 20,
    },
    heroTitle: {
        color: '#888',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 1,
    },
    heroBadge: {
        backgroundColor: 'rgba(204, 255, 0, 0.1)',
        color: '#ccff00',
        fontSize: 10,
        fontWeight: '700',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
        overflow: 'hidden',
    },
    heroMain: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-end',
        marginBottom: 20,
    },
    percentage: {
        fontSize: 56,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: -2,
        lineHeight: 56,
    },
    percentSign: {
        fontSize: 24,
        color: '#ccff00',
        fontWeight: '600',
    },
    statsRow: {
        flexDirection: 'row',
    },
    statItem: {
        alignItems: 'center',
        paddingHorizontal: 12,
    },
    statBorder: {
        borderLeftWidth: 1,
        borderRightWidth: 1,
        borderColor: '#333',
    },
    statVal: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
    },
    statLabel: {
        color: '#555',
        fontSize: 9,
        marginTop: 2,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#333',
        borderRadius: 2,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#ccff00',
    },
    sectionTitle: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
        marginBottom: 15,
        letterSpacing: 0.5,
    },
    matchesList: {
        gap: 12,
    },
    matchCard: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative',
        overflow: 'hidden',
    },
    indicator: {
        position: 'absolute',
        left: 0, top: 0, bottom: 0, width: 4,
    },
    winIndicator: { backgroundColor: '#4cd964' },
    lossIndicator: { backgroundColor: '#ff3b30' },

    matchDate: {
        alignItems: 'center',
        paddingRight: 16,
        borderRightWidth: 1,
        borderRightColor: '#222',
        width: 50,
    },
    day: { color: '#fff', fontSize: 18, fontWeight: '700' },
    month: { color: '#666', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },

    matchInfo: {
        flex: 1,
        paddingLeft: 16,
    },
    opponent: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 2,
    },
    location: {
        color: '#666',
        fontSize: 11,
    },
    matchScore: {
        alignItems: 'flex-end',
    },
    scoreText: {
        color: '#ddd',
        fontSize: 14,
        fontWeight: '700',
        marginBottom: 4,
    },
    outcomeText: {
        fontSize: 9,
        fontWeight: '800',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
        overflow: 'hidden',
    },
    textWin: { color: '#4cd964', backgroundColor: 'rgba(76, 217, 100, 0.1)' },
    textLoss: { color: '#ff3b30', backgroundColor: 'rgba(255, 59, 48, 0.1)' },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 20,
        fontStyle: 'italic',
    },

    fab: {
        position: 'absolute',
        bottom: 30,
        right: 30,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#ccff00',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#ccff00',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.3,
        shadowRadius: 16,
        elevation: 10,
    },
    fabIcon: {
        fontSize: 32,
        color: '#000',
        fontWeight: '400', // Thin plus
        marginTop: -4,
    }
});

export default HomeScreen;
