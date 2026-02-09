import React, { useState, useCallback } from 'react';
import { View, Text, StyleSheet, SectionList, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal, TouchableWithoutFeedback } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { getAllMatches, deleteMatch } from '../services/matchService';
import { Ionicons } from '@expo/vector-icons';
import { useLanguage } from '../context/LanguageContext';

export default function HistoryScreen() {
    const { t } = useLanguage();
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sections, setSections] = useState([]);
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedMatch, setSelectedMatch] = useState(null);
    const navigation = useNavigation();

    const loadMatches = async () => {
        const data = await getAllMatches();

        // Group by Month YYYY
        const grouped = data.reduce((acc, match) => {
            const d = new Date(match.date);
            const monthYear = d.toLocaleString('default', { month: 'long', year: 'numeric' }).toUpperCase();

            if (!acc[monthYear]) {
                acc[monthYear] = [];
            }
            acc[monthYear].push(match);
            return acc;
        }, {});

        // Convert to SectionList format AND SORT
        const sectionsArray = Object.keys(grouped)
            .map(key => ({
                title: key,
                data: grouped[key]
            }))
            .sort((a, b) => {
                // Parse "MONTH YYYY" back to date for sorting
                const dateA = new Date(a.data[0].date);
                const dateB = new Date(b.data[0].date);
                return dateB - dateA; // Descending order
            });

        setSections(sectionsArray);
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

    const handleLongPress = (match) => {
        setSelectedMatch(match);
        setModalVisible(true);
    };

    const handleEdit = () => {
        setModalVisible(false);
        if (selectedMatch) {
            navigation.navigate("NewMatch", { match: selectedMatch });
        }
    };

    const handleDelete = () => {
        Alert.alert(
            t('DELETE_MATCH') || "Delete Match",
            t('DELETE_CONFIRM') || "Are you sure you want to delete this match?",
            [
                { text: t('CANCEL'), style: "cancel" },
                {
                    text: t('DELETE'),
                    style: "destructive",
                    onPress: async () => {
                        setModalVisible(false);
                        setLoading(true);
                        try {
                            await deleteMatch(selectedMatch.id);
                            loadMatches(); // Reload list
                        } catch (e) {
                            console.error(e);
                            setLoading(false);
                            Alert.alert("Error", "Could not delete match.");
                        }
                    }
                }
            ]
        );
    };

    const renderOptionsModal = () => (
        <Modal
            animationType="fade"
            transparent={true}
            visible={modalVisible}
            onRequestClose={() => setModalVisible(false)}
        >
            <TouchableWithoutFeedback onPress={() => setModalVisible(false)}>
                <View style={styles.modalOverlay}>
                    <TouchableWithoutFeedback>
                        <View style={styles.modalContent}>
                            <View style={styles.modalHeader}>
                                <Text style={styles.modalTitle}>{t('MATCH_OPTIONS')}</Text>
                                {selectedMatch && (
                                    <Text style={styles.modalSubtitle}>vs {selectedMatch.player2}</Text>
                                )}
                            </View>

                            <TouchableOpacity style={styles.modalButton} onPress={handleEdit}>
                                <Ionicons name="pencil" size={20} color="#ccff00" />
                                <Text style={styles.modalButtonText}>{t('EDIT_MATCH')}</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={styles.modalButton} onPress={handleDelete}>
                                <Ionicons name="trash" size={20} color="#ff3b30" />
                                <Text style={[styles.modalButtonText, { color: '#ff3b30' }]}>{t('DELETE_MATCH')}</Text>
                            </TouchableOpacity>

                            <View style={styles.divider} />

                            <TouchableOpacity style={[styles.modalButton, styles.cancelButton]} onPress={() => setModalVisible(false)}>
                                <Text style={styles.cancelButtonText}>{t('CANCEL')}</Text>
                            </TouchableOpacity>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );

    const renderSectionHeader = ({ section: { title } }) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>{title}</Text>
            <View style={styles.sectionLine} />
        </View>
    );

    const renderMatchItem = ({ item }) => {
        // Extract date data
        const d = new Date(item.date);
        const day = d.getDate();
        const weekday = d.toLocaleString('default', { weekday: 'short' }).toUpperCase();

        // Format Score (e.g. "6-4 6-2")
        const scoreString = item.sets.map(s => `${s.s1}-${s.s2}`).join(', ');

        return (
            <TouchableOpacity
                activeOpacity={0.8}
                onLongPress={() => handleLongPress(item)}
            >
                <View style={styles.matchCard}>
                    <View style={[styles.indicator, item.userWon ? styles.winIndicator : styles.lossIndicator]} />

                    {/* TOP ROW: Date, Info, Score */}
                    <View style={styles.topRow}>
                        <View style={styles.matchDate}>
                            <Text style={styles.day}>{day}</Text>
                            <Text style={styles.month}>{weekday}</Text>
                        </View>

                        <View style={styles.matchInfo}>
                            <Text style={styles.opponent}>vs {item.player2}</Text>
                            <Text style={styles.location}>{item.location || t('UNKNOWN_COURT')}</Text>
                        </View>

                        <View style={styles.matchScore}>
                            <Text style={styles.scoreText}>{scoreString}</Text>
                            <Text style={[styles.outcomeText, item.userWon ? styles.textWin : styles.textLoss]}>
                                {item.userWon ? t('WIN') : t('LOSS')}
                            </Text>
                        </View>
                    </View>

                    {/* BOTTOM ROW: Cost */}
                    {(parseFloat(item.totalCost) > 0) && (
                        <View style={styles.bottomRow}>
                            <Ionicons name="card-outline" size={16} color="#ccff00" style={{ marginRight: 6 }} />
                            <Text style={styles.costText}>€{item.totalCost}</Text>
                        </View>
                    )}
                </View>
            </TouchableOpacity>
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
                <Text style={styles.headerTitle}>{t('MATCH_HISTORY_TITLE')}</Text>
            </View>

            <SectionList
                sections={sections}
                renderItem={renderMatchItem}
                renderSectionHeader={renderSectionHeader}
                keyExtractor={item => item.id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#ccff00" />
                }
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="tennisball-outline" size={48} color="#333" />
                        <Text style={styles.emptyText}>{t('NO_MATCHES')}</Text>
                    </View>
                }
                stickySectionHeadersEnabled={false}
            />
            {renderOptionsModal()}
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
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 15,
        marginTop: 10,
    },
    sectionTitle: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        letterSpacing: 1,
        marginRight: 15,
    },
    sectionLine: {
        flex: 1,
        height: 1,
        backgroundColor: '#222',
    },
    matchCard: {
        backgroundColor: '#111',
        borderRadius: 16,
        padding: 16,
        flexDirection: 'column', // Changed to column
        borderWidth: 1,
        borderColor: '#222',
        position: 'relative',
        overflow: 'hidden',
        marginBottom: 12,
    },
    topRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    bottomRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingLeft: 66 + 16, // Align with match info (Date 50 + padding 16 + paddingLeft 16)
        opacity: 0.8
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

    costText: {
        color: '#ccff00',
        fontSize: 12,
        fontWeight: '600',
    },

    emptyContainer: {
        alignItems: 'center',
        marginTop: 50,
    },
    emptyText: {
        color: '#555',
        marginTop: 10,
        fontStyle: 'italic',
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.7)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1c1c1e',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 10,
        elevation: 10,
    },
    modalHeader: {
        marginBottom: 20,
        alignItems: 'center',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 4,
    },
    modalSubtitle: {
        fontSize: 14,
        color: '#888',
    },
    modalButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
        borderRadius: 12,
        backgroundColor: '#2c2c2e',
        marginBottom: 10,
    },
    modalButtonText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#ccff00',
        marginLeft: 12,
    },
    cancelButton: {
        backgroundColor: 'transparent',
        justifyContent: 'center',
        marginTop: 10,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#333',
        marginVertical: 4,
    }
});
