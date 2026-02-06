import React, { useState, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert,
    Modal,
    FlatList
} from "react-native";
import { createMatch } from "../services/matchService";
import { getAllUsers } from "../services/userService";
import { getAllVenues } from "../services/venueService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import { Ionicons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';

export default function NewMatchScreen({ navigation }) {
    const [player1, setPlayer1] = useState("Me");
    const [player2, setPlayer2] = useState("");
    const [date, setDate] = useState(new Date()); // Store as Date object internally
    const [location, setLocation] = useState("");
    const [sets, setSets] = useState([{ s1: "", s2: "" }]);
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);

    // Picker State
    const [modalVisible, setModalVisible] = useState(false);
    const [targetField, setTargetField] = useState(null); // 'player1', 'player2', 'location'
    const [allPlayers, setAllPlayers] = useState([]);
    const [allVenues, setAllVenues] = useState([]);

    useEffect(() => {
        // ... (keep existing useEffects)
        // 1. Auto-fill Player 1
        const loadSession = async () => {
            const session = await AsyncStorage.getItem('user_session');
            if (session) {
                const user = JSON.parse(session);
                setPlayer1(user.nickname);
            }
        };
        loadSession();

        // 2. Pre-fetch players and venues
        const loadData = async () => {
            const users = await getAllUsers();
            setAllPlayers(users);
            const venues = await getAllVenues();
            setAllVenues(venues);
        };
        loadData();
    }, []);

    // ... (keep existing handlers)
    const openPicker = (field) => {
        setTargetField(field);
        setModalVisible(true);
    };

    const selectItem = (item) => {
        if (targetField === 'player1') setPlayer1(item.nickname);
        if (targetField === 'player2') setPlayer2(item.nickname);
        if (targetField === 'location') setLocation(item.name);
        setModalVisible(false);
    };

    const addSet = () => {
        setSets([...sets, { s1: "", s2: "" }]);
    };

    const updateSet = (index, field, value) => {
        const newSets = [...sets];
        newSets[index][field] = value;
        setSets(newSets);
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
        if (Platform.OS !== 'ios') {
            setShowDatePicker(false);
        }
    };

    const formatDate = (dateObj) => {
        if (!dateObj) return "";
        // Handle if date is string (legacy) or Date object
        const d = new Date(dateObj);
        return d.toISOString().split('T')[0];
    };

    const handleSave = async () => {
        if (!player2.trim()) {
            Alert.alert("Missing Info", "Please enter an opponent name.");
            return;
        }

        setSaving(true);
        try {
            await createMatch({
                player1,
                player2,
                date: formatDate(date),
                location,
                sets,
                notes
            });
            setSaving(false);
            navigation.goBack();
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not save match.");
            setSaving(false);
        }
    };

    const getListData = () => {
        if (targetField === 'location') return allVenues;
        return allPlayers;
    };

    const renderPickerItem = ({ item }) => {
        // ... (keep existing renderPickerItem)
        if (targetField === 'location') {
            return (
                <TouchableOpacity
                    style={styles.playerItem}
                    onPress={() => selectItem(item)}
                >
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>📍</Text>
                    </View>
                    <View>
                        <Text style={styles.itemNickname}>{item.name}</Text>
                        {item.surface && <Text style={styles.itemName}>{item.surface}</Text>}
                    </View>
                </TouchableOpacity>
            );
        }

        // Default: Player Item
        return (
            <TouchableOpacity
                style={styles.playerItem}
                onPress={() => selectItem(item)}
            >
                <View style={styles.avatarPlaceholder}>
                    <Text style={styles.avatarText}>{item.nickname.charAt(0).toUpperCase()}</Text>
                </View>
                <View>
                    <Text style={styles.itemNickname}>{item.nickname}</Text>
                    {(item.firstName || item.lastName) && (
                        <Text style={styles.itemName}>{item.firstName} {item.lastName}</Text>
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
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.cancelBtn}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>New Match</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveHeaderBtn, saving && { opacity: 0.5 }]}>
                        {saving ? "Saving..." : "Save"}
                    </Text>
                </TouchableOpacity>
            </View>

            {/* Reusable Data Picker Modal */}
            <Modal
                animationType="slide"
                transparent={true}
                visible={modalVisible}
                onRequestClose={() => setModalVisible(false)}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {targetField === 'location' ? 'Select Venue' : 'Select Player'}
                            </Text>
                            <TouchableOpacity onPress={() => setModalVisible(false)}>
                                <Text style={styles.closeModalBtn}>Close</Text>
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={getListData()}
                            keyExtractor={(item) => item.id}
                            renderItem={renderPickerItem}
                            ListEmptyComponent={<Text style={styles.emptyText}>No items found.</Text>}
                        />
                    </View>
                </View>
            </Modal>

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                {/* Players */}
                <Text style={styles.sectionLabel}>PLAYERS</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Player</Text>
                        <TextInput
                            style={[styles.input, { fontWeight: '600' }]}
                            value={player1}
                            onChangeText={setPlayer1}
                            placeholderTextColor="#555"
                        />
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('player1')}>
                            <Ionicons name="people" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Opponent</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Name"
                            value={player2}
                            onChangeText={setPlayer2}
                            placeholderTextColor="#555"
                            autoFocus={false}
                        />
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('player2')}>
                            <Ionicons name="people" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Details */}
                <Text style={styles.sectionLabel}>DETAILS</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={formatDate(date)}
                            editable={false}
                            placeholderTextColor="#555"
                        />
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => setShowDatePicker(true)}>
                            <Ionicons name="calendar" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    {showDatePicker && (
                        <DateTimePicker
                            testID="dateTimePicker"
                            value={date}
                            mode="date"
                            display="default"
                            onChange={onDateChange}
                            themeVariant="dark"
                        />
                    )}

                    <View style={styles.divider} />
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Location</Text>
                        <TextInput
                            style={styles.input}
                            placeholder="Club or Court"
                            value={location}
                            onChangeText={setLocation}
                            placeholderTextColor="#555"
                        />
                        <TouchableOpacity style={styles.pickerBtn} onPress={() => openPicker('location')}>
                            <Ionicons name="location" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                </View>


                {/* Score */}
                <Text style={styles.sectionLabel}>SCORE</Text>
                <View style={styles.scoreContainer}>
                    <View style={styles.scoreHeader}>
                        <Text style={[styles.playerName, { color: '#ccff00' }]}>PLAYER</Text>
                        <Text style={styles.playerName}>OPPONENT</Text>
                    </View>

                    {sets.map((set, index) => (
                        <View key={index} style={styles.setRow}>
                            <Text style={styles.setLabel}>SET {index + 1}</Text>
                            <View style={styles.setInputs}>
                                <TextInput
                                    style={styles.scoreInput}
                                    keyboardType="numeric"
                                    value={set.s1}
                                    onChangeText={(v) => updateSet(index, 's1', v)}
                                    placeholder="-"
                                    placeholderTextColor="#444"
                                />
                                <Text style={styles.dash}>-</Text>
                                <TextInput
                                    style={styles.scoreInput}
                                    keyboardType="numeric"
                                    value={set.s2}
                                    onChangeText={(v) => updateSet(index, 's2', v)}
                                    placeholder="-"
                                    placeholderTextColor="#444"
                                />
                            </View>
                        </View>
                    ))}

                    <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
                        <Text style={styles.addSetText}>+ Add Set</Text>
                    </TouchableOpacity>
                </View>

                {/* Notes */}
                <Text style={styles.sectionLabel}>NOTES</Text>
                <View style={styles.formGroup}>
                    <TextInput
                        style={[styles.input, { height: 100, paddingVertical: 10, textAlignVertical: 'top' }]}
                        multiline
                        placeholder="Match notes..."
                        value={notes}
                        onChangeText={setNotes}
                        placeholderTextColor="#555"
                    />
                </View>

                <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                    <Text style={styles.saveBtnText}>
                        {saving ? "SAVING..." : "SAVE MATCH RECORD"}
                    </Text>
                </TouchableOpacity>

                <View style={{ height: 50 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: Platform.OS === 'ios' ? 20 : 40,
        paddingHorizontal: 20,
        paddingBottom: 20,
        backgroundColor: 'rgba(28, 28, 30, 0.8)',
        borderBottomWidth: 1,
        borderBottomColor: '#1c1c1e',
    },
    headerTitle: {
        color: '#fff',
        fontSize: 17,
        fontWeight: '600',
    },
    saveHeaderBtn: {
        color: '#ccff00',
        fontSize: 16,
        fontWeight: '600',
    },
    cancelBtn: {
        color: '#666',
        fontSize: 16,
    },
    content: {
        flex: 1,
        padding: 20,
    },
    sectionLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '600',
        marginTop: 24,
        marginBottom: 8,
        letterSpacing: 1,
    },
    formGroup: {
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        overflow: 'hidden',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        height: 50,
    },
    divider: {
        height: 1,
        backgroundColor: '#2c2c2e',
        marginLeft: 16,
    },
    label: {
        color: '#aaa',
        fontSize: 15,
        width: 100,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
    },
    scoreContainer: {
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        padding: 16,
    },
    scoreHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
        paddingRight: 40,
    },
    playerName: {
        color: '#fff',
        fontSize: 13,
        fontWeight: '600',
        width: '45%',
        textAlign: 'center',
    },
    setRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10,
    },
    setLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        width: 40,
    },
    setInputs: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
    },
    scoreInput: {
        width: 50,
        height: 40,
        backgroundColor: '#000',
        borderRadius: 8,
        color: '#fff',
        textAlign: 'center',
        fontSize: 18,
        borderWidth: 1,
        borderColor: '#333',
    },
    dash: {
        color: '#444',
    },
    addSetBtn: {
        marginTop: 10,
        padding: 12,
        backgroundColor: 'rgba(255,255,255,0.02)',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#333',
        borderStyle: 'dashed',
        alignItems: 'center',
    },
    addSetText: {
        color: '#888',
        fontSize: 14,
    },
    saveBtn: {
        backgroundColor: '#ccff00',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginTop: 40,
    },
    saveBtnText: {
        color: '#000',
        fontSize: 16,
        fontWeight: '700',
    },
    pickerBtn: {
        padding: 8,
    },
    pickerIcon: {
        fontSize: 20,
        color: '#fff',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#1c1c1e',
        height: '70%',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    modalTitle: {
        color: '#fff',
        fontSize: 18,
        fontWeight: '700',
    },
    closeModalBtn: {
        color: '#ccff00',
        fontSize: 16,
        fontWeight: '600',
    },
    playerItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#2c2c2e',
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
    avatarText: {
        color: '#ccc',
        fontWeight: 'bold',
        fontSize: 16,
    },
    itemNickname: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    itemName: {
        color: '#888',
        fontSize: 12,
    },
    emptyText: {
        color: '#555',
        textAlign: 'center',
        marginTop: 20
    }
});
