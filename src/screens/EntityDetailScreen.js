import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getOrCreateUser } from '../services/userService';
import { getOrCreateVenue } from '../services/venueService';

export default function EntityDetailScreen({ route, navigation }) {
    const { type, id } = route.params;
    const isNew = !id;
    const collectionName = type === 'player' ? 'users' : 'venues';

    const [loading, setLoading] = useState(!isNew);
    const [saving, setSaving] = useState(false);
    const [editMode, setEditMode] = useState(isNew);

    // Common
    const [name, setName] = useState(''); // Nickname or Venue Name
    const [phone, setPhone] = useState('');

    // Player Specific
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [city, setCity] = useState('');

    // Venue Specific
    const [address, setAddress] = useState('');
    const [website, setWebsite] = useState('');
    const [surface, setSurface] = useState('');

    useEffect(() => {
        if (!isNew && id) {
            fetchDetails();
        }
    }, [id]);

    const fetchDetails = async () => {
        try {
            const docRef = doc(db, collectionName, id);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                if (type === 'player') {
                    setName(data.nickname);
                    setPhone(data.phoneNumber || '');
                    setFirstName(data.firstName || '');
                    setLastName(data.lastName || '');
                    setEmail(data.email || '');
                    setCity(data.city || '');
                } else {
                    setName(data.name);
                    setPhone(data.phoneNumber || '');
                    setAddress(data.address || '');
                    setWebsite(data.website || '');
                    setSurface(data.surface || '');
                }
            } else {
                Alert.alert("Error", "Item not found");
                navigation.goBack();
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleSave = async () => {
        if (!name.trim()) return;
        setSaving(true);

        try {
            let targetId = id;

            // Prepare extra fields
            let updatePayload = {};
            if (type === 'player') {
                updatePayload = {
                    nickname: name,
                    phoneNumber: phone,
                    firstName: firstName,
                    lastName: lastName,
                    email: email,
                    city: city
                };
            } else {
                updatePayload = {
                    name: name,
                    phoneNumber: phone,
                    address: address,
                    website: website,
                    surface: surface
                };
            }

            // 1. CREATE Logic
            if (isNew) {
                if (type === 'player') {
                    const res = await getOrCreateUser(name);
                    targetId = res.id;
                } else {
                    const res = await getOrCreateVenue(name);
                    targetId = res.id;
                }
                // Update with extra info immediately
                await updateDoc(doc(db, collectionName, targetId), updatePayload);
            }
            // 2. UPDATE Logic
            else {
                await updateDoc(doc(db, collectionName, targetId), updatePayload);
            }

            navigation.goBack();
        } catch (e) {
            console.error(e);
            Alert.alert("Error", "Could not save.");
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            "Delete",
            "Are you sure? This cannot be undone.",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await deleteDoc(doc(db, collectionName, id));
                            navigation.goBack();
                        } catch (e) {
                            console.error(e);
                        }
                    }
                }
            ]
        );
    };

    // Helper for rendering inputs
    const renderField = (label, value, setter, placeholder, multiline = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            {editMode ? (
                <TextInput
                    style={[styles.input, multiline && { height: 60 }]}
                    value={value}
                    onChangeText={setter}
                    placeholder={placeholder}
                    placeholderTextColor="#555"
                    multiline={multiline}
                />
            ) : (
                <Text style={styles.value}>{value || '-'}</Text>
            )}
        </View>
    );

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color="#ccff00" />
            </View>
        );
    }

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={styles.container}
        >
            <StatusBar style="light" />

            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()}>
                    <Text style={styles.backBtn}>Close</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{editMode ? (isNew ? 'New' : 'Edit') : 'Details'}</Text>

                {!isNew && (
                    <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                        <Text style={styles.editBtn}>{editMode ? 'Cancel' : 'Edit'}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>

                {/* HEADLINE SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>IDENTITY</Text>
                    {renderField(type === 'player' ? 'NICKNAME' : 'VENUE NAME', name, setName, isNew ? "e.g. 'Mario T.'" : "Name")}

                    {type === 'player' && (
                        <>
                            {renderField('FIRST NAME', firstName, setFirstName, "Mario")}
                            {renderField('LAST NAME', lastName, setLastName, "Rossi")}
                        </>
                    )}
                </View>

                {/* CONTACT SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>CONTACT</Text>
                    {renderField('PHONE', phone, setPhone, "+39 ...")}
                    {type === 'player' && renderField('EMAIL', email, setEmail, "user@example.com")}
                    {type === 'venue' && renderField('WEBSITE', website, setWebsite, "www.tennisclub.it")}
                </View>

                {/* INFO SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>INFO</Text>
                    {type === 'player' ? (
                        renderField('CITY', city, setCity, "Milan")
                        // Level removed as requested
                    ) : (
                        <>
                            {renderField('ADDRESS', address, setAddress, "Street, City", true)}
                            {renderField('SURFACE', surface, setSurface, "Clay, Hard, Grass")}
                        </>
                    )}
                </View>

                {/* SAVE BUTTON */}
                {editMode && (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                        <Text style={styles.saveBtnText}>{saving ? 'SAVING...' : 'SAVE CHANGES'}</Text>
                    </TouchableOpacity>
                )}

                {/* DELETE BUTTON */}
                {!isNew && editMode && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.deleteBtnText}>DELETE PERMANENTLY</Text>
                    </TouchableOpacity>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
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
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#1c1c1e',
    },
    backBtn: { color: '#666', fontSize: 16 },
    editBtn: { color: '#ccff00', fontSize: 16, fontWeight: '600' },
    title: { fontSize: 17, fontWeight: '700', color: '#fff' },

    content: {
        padding: 20,
    },
    section: {
        marginBottom: 25,
        backgroundColor: '#1c1c1e',
        borderRadius: 12,
        padding: 20,
    },
    sectionHeader: {
        color: '#666',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    inputGroup: {
        marginBottom: 15,
    },
    label: {
        color: '#888',
        fontSize: 12,
        marginBottom: 6,
    },
    value: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '500',
    },
    input: {
        color: '#fff',
        fontSize: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingVertical: 8,
    },

    saveBtn: {
        backgroundColor: '#ccff00',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 20,
    },
    saveBtnText: { color: '#000', fontSize: 16, fontWeight: '700' },

    deleteBtn: {
        backgroundColor: 'rgba(255, 59, 48, 0.1)',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    deleteBtnText: { color: '#ff3b30', fontSize: 14, fontWeight: '700' }
});
