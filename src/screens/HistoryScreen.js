import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { getAllMatches } from '../services/matchService';
import { Ionicons } from '@expo/vector-icons';

export default function HistoryScreen() {
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [matches, setMatches] = useState([]);

    const loadMatches = async () => {
        const data = await getAllMatches();
        setMatches(data);
        setLoading(false);
        setRefreshing(false);
    };

    useFocusEffect(
        useCallback(() => {
            loadMatches();
        }, [])
    );

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        loadMatches();
    }, []);

    const renderMatchItem = ({ item }) => {
        // Extract date data
        const d = new Date(item.date);
        const day = d.getDate();
        const month = d.toLocaleString('default', { month: 'short' }).toUpperCase();

        // Format Score (e.g. "6-4 6-2")
        const scoreString = item.sets.map(s => `${s.s1}-${s.s2}`).join(', ');

        return (
            <View style={styles.matchCard}>
                <View style={[styles.indicator, item.userWon ? styles.winIndicator : styles.lossIndicator]} />
                <View style={styles.matchDate}>
                    <Text style={styles.day}>{day}</Text>
                    <Text style={styles.month}>{month}</Text>
                </View>
                <View style={styles.matchInfo}>
                    <Text style={styles.opponent}>vs {item.player2}</Text>
                    <Text style={styles.location}>{item.location || "Unknown Court"}</Text>
                </View>
                <View style={styles.matchScore}>
                    <Text style={styles.scoreText}>{scoreString}</Text>
                    <Text style={[styles.outcomeText, item.userWon ? styles.textWin : styles.textLoss]}>
                        {item.userWon ? 'WIN' : 'LOSS'}
                    </Text>
                </View>
            </View>
        );
    };

    if (loading && !refreshing) {
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
                <Text style={styles.headerTitle}>MATCH HISTORY</Text>
            </View>

            <FlatList
                data={matches}
                renderItem={renderMatchItem}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="tennisball-outline" size={48} color="#333" />
                        <Text style={styles.emptyText}>No matches recorded yet.</Text>
                    </View>
                }
            />
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
    listContent: {
        padding: 20,
        paddingBottom: 40,
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
        marginBottom: 12,
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

    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#555',
        marginTop: 10,
        fontStyle: 'italic',
    }
});
