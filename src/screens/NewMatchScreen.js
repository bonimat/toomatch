import React, { useState } from "react";
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    ScrollView,
    TouchableOpacity,
    Platform,
    Alert
} from "react-native";
import { createMatch } from "../services/matchService"; // Import real service
import { StatusBar } from 'expo-status-bar';

export default function NewMatchScreen({ navigation }) {
    const [player1, setPlayer1] = useState("Me");
    const [player2, setPlayer2] = useState("");
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [location, setLocation] = useState("");
    const [sets, setSets] = useState([{ s1: "", s2: "" }]); // Start empty
    const [notes, setNotes] = useState("");
    const [saving, setSaving] = useState(false);

    const addSet = () => {
        setSets([...sets, { s1: "", s2: "" }]);
    };

    const updateSet = (index, field, value) => {
        const newSets = [...sets];
        newSets[index][field] = value;
        setSets(newSets);
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
                date,
                location,
                sets,
                notes
            });
            setSaving(false);
            navigation.goBack(); // Return to Home
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Could not save match.");
            setSaving(false);
        }
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

            <ScrollView style={styles.content} keyboardShouldPersistTaps="handled">

                {/* Players */}
                <Text style={styles.sectionLabel}>PLAYERS</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Player 1</Text>
                        <TextInput
                            style={[styles.input, { fontWeight: '600' }]}
                            value={player1}
                            onChangeText={setPlayer1}
                            placeholderTextColor="#555"
                        />
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
                            autoFocus={true}
                        />
                    </View>
                </View>

                {/* Details */}
                <Text style={styles.sectionLabel}>DETAILS</Text>
                <View style={styles.formGroup}>
                    <View style={styles.inputRow}>
                        <Text style={styles.label}>Date</Text>
                        <TextInput
                            style={styles.input}
                            value={date}
                            onChangeText={setDate}
                            placeholderTextColor="#555"
                        />
                    </View>
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
                    </View>
                </View>

                {/* Score */}
                <Text style={styles.sectionLabel}>SCORE</Text>
                <View style={styles.scoreContainer}>
                    <View style={styles.scoreHeader}>
                        <Text style={[styles.playerName, { color: '#ccff00' }]}>ME</Text>
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
    }
});
