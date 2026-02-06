import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect } from '@react-navigation/native';
import { db } from '../../firebaseConfig';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';

export default function DirectoryScreen({ navigation }) {
    const [activeTab, setActiveTab] = useState('players'); // 'players' | 'venues'
    const [loading, setLoading] = useState(false);
    const [data, setData] = useState([]);

    useFocusEffect(
        useCallback(() => {
            fetchData();
        }, [activeTab])
    );

    const fetchData = async () => {
        setLoading(true);
        try {
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
        return (
            <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => navigation.navigate('EntityDetail', { type: activeTab === 'players' ? 'player' : 'venue', id: item.id })}
            >
                <View style={styles.card}>
                    {activeTab === 'players' ? (
                        <>
                            <View style={styles.avatarPlaceholder}>
                                <Text style={styles.avatarText}>{item.nickname?.charAt(0).toUpperCase()}</Text>
                            </View>
                            <View>
                                <Text style={styles.name}>{item.nickname}</Text>
                                <Text style={styles.subtext}>Player</Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <View style={[styles.avatarPlaceholder, styles.venueAvatar]}>
                                <Text style={styles.avatarText}>📍</Text>
                            </View>
                            <View>
                                <Text style={styles.name}>{item.name}</Text>
                                <Text style={styles.subtext}>{item.address || "No address"}</Text>
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

            <View style={styles.header}>
                <Text style={styles.title}>CLUB DIRECTORY</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('EntityDetail', { type: activeTab === 'players' ? 'player' : 'venue', id: null })}
                >
                    <Text style={styles.addBtnText}>+</Text>
                </TouchableOpacity>
            </View>

            {/* Toggle Switch */}
            <View style={styles.toggleContainer}>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'players' && styles.activeBtn]}
                    onPress={() => setActiveTab('players')}
                >
                    <Text style={[styles.toggleText, activeTab === 'players' && styles.activeText]}>PLAYERS</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.toggleBtn, activeTab === 'venues' && styles.activeBtn]}
                    onPress={() => setActiveTab('venues')}
                >
                    <Text style={[styles.toggleText, activeTab === 'venues' && styles.activeText]}>VENUES</Text>
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
    title: {
        fontSize: 24,
        fontWeight: '900',
        color: '#fff',
        letterSpacing: 1,
    },
    addBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255, 255, 255, 0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addBtnText: {
        fontSize: 24,
        color: '#ccff00',
        marginTop: -2,
        fontWeight: '400',
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
        padding: 16,
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        marginBottom: 10,
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
    subtext: {
        color: '#666',
        fontSize: 12,
        marginTop: 2,
    },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 40,
        fontStyle: 'italic',
    }
});
