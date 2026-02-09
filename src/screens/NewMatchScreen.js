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
    FlatList,
    KeyboardAvoidingView // Added
} from "react-native";
import { createMatch, updateMatch } from "../services/matchService"; // Import updateMatch
import { getAllVenues, getDefaultVenue } from "../services/venueService";
import { getAllUsers, getDefaultOpponent } from "../services/userService";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StatusBar } from 'expo-status-bar';

import { Ionicons } from '@expo/vector-icons';

import DateTimePicker from '@react-native-community/datetimepicker';
import { useLanguage } from '../context/LanguageContext';

export default function NewMatchScreen({ navigation, route }) { // Add route
    const { t } = useLanguage();
    const [player1, setPlayer1] = useState("Me");
    const [player2, setPlayer2] = useState("");
    const [date, setDate] = useState(new Date()); // Store as Date object internally
    const [location, setLocation] = useState("");
    const [sets, setSets] = useState([{ s1: "", s2: "" }]);
    const [notes, setNotes] = useState("");
    // Expenses
    const [duration, setDuration] = useState("1.5");
    const [useLights, setUseLights] = useState(false);
    const [useHeating, setUseHeating] = useState(false);
    const [isGuest, setIsGuest] = useState(false); // NEW
    const [totalCost, setTotalCost] = useState("0");
    const [selectedVenue, setSelectedVenue] = useState(null); // Full object
    const [saving, setSaving] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [scoreWarning, setScoreWarning] = useState("");
    const [matchId, setMatchId] = useState(null); // For Editing

    const isEditing = !!matchId;

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

        // 2. Pre-fetch players and venues AND Defaults OR Edit Data
        const loadData = async () => {
            const users = await getAllUsers();
            setAllPlayers(users);
            const venues = await getAllVenues();
            setAllVenues(venues);

            // CHECK FOR EDIT MODE
            if (route.params?.match) {
                const m = route.params.match;
                setMatchId(m.id);
                setPlayer1(m.player1_name || m.player1?.nickname || m.player1);
                setPlayer2(m.player2_name || m.player2?.nickname || m.player2);
                setLocation(m.location_name || m.location);
                setSets(m.sets || [{ s1: "", s2: "" }]);
                setNotes(m.notes || "");
                setDate(new Date(m.date)); // Date object

                // Expenses
                setDuration(String(m.duration || "1.5"));
                setUseLights(!!m.useLights);
                setUseHeating(!!m.useHeating);
                setIsGuest(!!m.isGuest);
                setTotalCost(String(m.totalCost || "0"));

                // Try to find venue object to match location name
                const v = venues.find(v => v.name === (m.location_name || m.location));
                if (v) setSelectedVenue(v);

                navigation.setOptions({ title: 'Edit Match' }); // Update header if possible

            } else {
                // NEW MATCH DEFAULTS
                const defaultOpponent = await getDefaultOpponent();
                if (defaultOpponent) {
                    setPlayer2(defaultOpponent.nickname);
                }

                const defaultVenue = await getDefaultVenue();
                if (defaultVenue) {
                    setLocation(defaultVenue.name);
                    setSelectedVenue(defaultVenue);

                    let rate = (isGuest && defaultVenue.guestPricePerHour) ? defaultVenue.guestPricePerHour : (defaultVenue.pricePerHour || 0);
                    if (useLights) rate += (defaultVenue.lightPricePerHour || 0);
                    if (useHeating) rate += (defaultVenue.heatingPricePerHour || 0);

                    const dur = parseFloat(duration) || 0;
                    setTotalCost((rate * dur).toFixed(2));
                }
            }
        };
        loadData();
    }, [route.params?.match]);

    // Helper: Simple Validation for Tennis Rules
    const validateScore = (currentSets) => {
        let warning = "";
        for (let i = 0; i < currentSets.length; i++) {
            const set = currentSets[i];
            const s1 = parseInt(set.s1);
            const s2 = parseInt(set.s2);
            const isTieBreak = set.isTieBreak;

            // Skip empty checks until both are numbers
            if (isNaN(s1) || isNaN(s2)) continue;

            const max = Math.max(s1, s2);
            const min = Math.min(s1, s2);
            const diff = max - min;

            // --- TIE BREAK LOGIC ---
            if (isTieBreak) {
                // Must have 2 point margin
                if (diff < 2) {
                    warning = `Set ${i + 1} (TB): Needs 2 point margin (e.g. 10-8).`;
                }
                // Tie break usually at least to 7 or 10 points
                if (max < 7) {
                    warning = `Set ${i + 1} (TB): Score too low for a tie-break.`;
                }
                // No upper limit warning for TB
                continue;
            }

            // --- STANDARD SET LOGIC ---
            if (max < 6 && max > 0) {
                // Incomplete?
            }

            if (max === 6 && diff < 2) {
                warning = `Set ${i + 1}: 6-${min} is unusual. Usually finishes at 7-5 or 7-6.`;
            }
            if (max === 7 && diff > 2 && min !== 0) {
                warning = `Set ${i + 1}: 7-${min} is unusual. Standard sets end 7-5 or 7-6.`;
            }
            if (max > 7) {
                warning = `Set ${i + 1}: High score detected. Enable 'TB' if this is a Tie-Break?`;
            }
        }
        setScoreWarning(warning);
    };

    // ... (keep existing handlers)
    const openPicker = (field) => {
        setTargetField(field);
        setModalVisible(true);
    };

    const selectItem = (item) => {
        if (targetField === 'player1') setPlayer1(item.nickname);
        if (targetField === 'player2') setPlayer2(item.nickname);
        if (targetField === 'location') {
            setLocation(item.name);
            setSelectedVenue(item);
            // Auto-calc if changing venue
            calculateCost(duration, useLights, useHeating, isGuest, item);
        }
        setModalVisible(false);
    };

    // Calculate Cost Helper
    const calculateCost = (dur, lights, heating, guest, venue) => {
        if (!venue || !venue.pricePerHour) return;

        const hours = parseFloat(dur) || 0;
        // Choose rate based on Guest status
        let rate = (guest && venue.guestPricePerHour) ? venue.guestPricePerHour : (venue.pricePerHour || 0);

        if (lights) rate += (venue.lightPricePerHour || 0);
        if (heating) rate += (venue.heatingPricePerHour || 0);

        const total = (rate * hours).toFixed(2);
        setTotalCost(total);
    };

    // Handlers for expense changes
    const handleDurationChange = (val) => {
        setDuration(val);
        calculateCost(val, useLights, useHeating, isGuest, selectedVenue);
    };
    const toggleLights = () => {
        const newVal = !useLights;
        setUseLights(newVal);
        calculateCost(duration, newVal, useHeating, isGuest, selectedVenue);
    };
    const toggleHeating = () => {
        const newVal = !useHeating;
        setUseHeating(newVal);
        calculateCost(duration, useLights, newVal, isGuest, selectedVenue);
    };
    const toggleGuest = () => {
        const newVal = !isGuest;
        setIsGuest(newVal);
        calculateCost(duration, useLights, useHeating, newVal, selectedVenue);
    };

    const addSet = () => {
        setSets([...sets, { s1: "", s2: "", isTieBreak: false }]);
    };

    const updateSet = (index, field, value) => {
        const newSets = [...sets];
        newSets[index][field] = value;
        setSets(newSets);
        validateScore(newSets);
    };

    const toggleTieBreak = (index) => {
        const newSets = [...sets];
        newSets[index].isTieBreak = !newSets[index].isTieBreak;
        setSets(newSets);
        validateScore(newSets);
    };

    const onDateChange = (event, selectedDate) => {
        const currentDate = selectedDate || date;
        setShowDatePicker(Platform.OS === 'ios');
        setDate(currentDate);
        // Add minimal delay to ensure close on Android
        if (Platform.OS !== 'ios') {
            setShowDatePicker(false);
        }
    };

    const formatDate = (dateObj) => {
        if (!dateObj) return "";
        const d = new Date(dateObj);
        // FORCE LOCAL DATE TO STRING "YYYY-MM-DD"
        // toISOString() uses UTC, which might be yesterday if we are ahead of UTC.
        // We want the date selected by the user in their timezone.
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSave = async () => {
        if (!player2.trim()) {
            Alert.alert(t('MISSING_FIELDS'), "Please enter an opponent name.");
            return;
        }

        setSaving(true);
        try {
            const payload = {
                player1,
                player2,
                date: formatDate(date), // Ensure this returns YYYY-MM-DD
                location,
                sets,
                notes,
                // Expenses
                duration: parseFloat(duration) || 0,
                useLights,
                useHeating,
                isGuest: isGuest,
                totalCost: parseFloat(totalCost) || 0,
                venueId: selectedVenue ? selectedVenue.id : null
            };

            if (isEditing) {
                await updateMatch(matchId, payload);
            } else {
                await createMatch(payload);
            }

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
                        <Ionicons name="location" size={20} color="#ccff00" />
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
                    <Text style={styles.cancelBtn}>{t('CANCEL')}</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{isEditing ? t('EDIT_MATCH') : t('NEW_MATCH_TITLE')}</Text>
                <TouchableOpacity onPress={handleSave} disabled={saving}>
                    <Text style={[styles.saveHeaderBtn, saving && { opacity: 0.5 }]}>
                        {saving ? t('CREATING_MATCH') : "Save"}
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

            <KeyboardAvoidingView
                behavior={Platform.OS === "ios" ? "padding" : "height"}
                style={{ flex: 1 }}
                keyboardVerticalOffset={Platform.OS === "ios" ? 20 : 0}
            >
                <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                    {/* Players */}
                    <Text style={styles.sectionLabel}>{t('PLAYERS') || "PLAYERS"}</Text>
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
                            <Text style={styles.label}>{t('OPPONENT')}</Text>
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
                    <Text style={styles.sectionLabel}>{t('DATE_TIME') || "DETAILS"}</Text>
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
                            <Text style={styles.label}>{t('LOCATION')}</Text>
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
                    <Text style={styles.sectionLabel}>{t('SCORE')}</Text>
                    <View style={styles.scoreContainer}>
                        <View style={styles.scoreHeader}>
                            <Text style={[styles.playerName, { color: '#ccff00' }]}>PLAYER</Text>
                            <Text style={styles.playerName}>{t('OPPONENT')}</Text>
                        </View>

                        {sets.map((set, index) => (
                            <View key={index} style={styles.setRow}>
                                <View style={styles.setLabelContainer}>
                                    <Text style={styles.setLabel}>SET {index + 1}</Text>
                                    <TouchableOpacity
                                        style={[styles.tbToggle, set.isTieBreak && styles.tbActive]}
                                        onPress={() => toggleTieBreak(index)}
                                    >
                                        <Text style={[styles.tbText, set.isTieBreak && styles.tbTextActive]}>TB</Text>
                                    </TouchableOpacity>
                                </View>

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

                        {/* Warning Message */}
                        {scoreWarning ? (
                            <View style={styles.warningContainer}>
                                <Ionicons name="alert-circle" size={16} color="#ffa500" />
                                <Text style={styles.warningText}>{scoreWarning}</Text>
                            </View>
                        ) : null}

                        <TouchableOpacity style={styles.addSetBtn} onPress={addSet}>
                            <Text style={styles.addSetText}>+ Add Set</Text>
                        </TouchableOpacity>
                    </View>

                    {/* EXPENSES (NEW) */}
                    <Text style={styles.sectionLabel}>{t('EXPENSES')}</Text>
                    <View style={styles.formGroup}>
                        {/* Duration */}
                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Duration (h)</Text>
                            <TextInput
                                style={styles.input}
                                keyboardType="numeric"
                                value={duration}
                                onChangeText={handleDurationChange}
                                placeholder="1.5"
                                placeholderTextColor="#555"
                            />
                            <Ionicons name="time-outline" size={20} color="#666" />
                        </View>
                        <View style={styles.divider} />

                        {/* Toggles */}
                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Lighting</Text>
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity onPress={toggleLights}>
                                <Ionicons name={useLights ? "bulb" : "bulb-outline"} size={24} color={useLights ? "#ccff00" : "#666"} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Heating</Text>
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity onPress={toggleHeating}>
                                <Ionicons name={useHeating ? "flame" : "flame-outline"} size={24} color={useHeating ? "#ff3b30" : "#666"} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {/* Guest Rate Toggle */}
                        <View style={styles.inputRow}>
                            <Text style={styles.label}>Non-Member Rate</Text>
                            <View style={{ flex: 1 }} />
                            <TouchableOpacity onPress={toggleGuest}>
                                <Ionicons name={isGuest ? "people" : "people-outline"} size={24} color={isGuest ? "#ccff00" : "#666"} />
                            </TouchableOpacity>
                        </View>
                        <View style={styles.divider} />

                        {/* Total Cost */}
                        <View style={styles.inputRow}>
                            <Text style={[styles.label, { color: '#ccff00', fontWeight: '700' }]}>Total (€)</Text>
                            <TextInput
                                style={[styles.input, { color: '#ccff00', fontWeight: '700', fontSize: 18 }]}
                                keyboardType="numeric"
                                value={totalCost}
                                onChangeText={setTotalCost}
                                placeholder="0.00"
                                placeholderTextColor="#555"
                            />
                        </View>
                    </View>

                    {/* Notes */}
                    <Text style={styles.sectionLabel}>{t('NOTES')}</Text>
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
                            {saving ? t('CREATING_MATCH') : t('SAVE_MATCH')}
                        </Text>
                    </TouchableOpacity>

                    <View style={{ height: 50 }} />
                </ScrollView>
            </KeyboardAvoidingView>
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
    setLabelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 80, // Increased to fit TB toggle
    },
    setLabel: {
        color: '#666',
        fontSize: 12,
        fontWeight: 'bold',
        marginRight: 6,
    },
    tbToggle: {
        backgroundColor: '#2c2c2e',
        paddingHorizontal: 6,
        paddingVertical: 3,
        borderRadius: 4,
        borderWidth: 1,
        borderColor: '#444',
    },
    tbActive: {
        backgroundColor: '#ccff00',
        borderColor: '#ccff00',
    },
    tbText: {
        color: '#666',
        fontSize: 10,
        fontWeight: '700',
    },
    tbTextActive: {
        color: '#000',
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
    },
    warningContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255, 165, 0, 0.1)', // Light orange background
        padding: 10,
        borderRadius: 8,
        marginTop: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 165, 0, 0.3)',
    },
    warningText: {
        color: '#ffa500', // Orange text
        fontSize: 12,
        marginLeft: 8,
        fontWeight: '600',
    }
});
