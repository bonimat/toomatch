import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TextInput, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Platform, KeyboardAvoidingView } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { getOrCreateUser } from '../services/userService';
import { getOrCreateVenue } from '../services/venueService';
import { useLanguage } from '../context/LanguageContext';

export default function EntityDetailScreen({ route, navigation }) {
    const { t } = useLanguage();
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
    // Expenses
    const [pricePerHour, setPricePerHour] = useState('');
    const [guestPrice, setGuestPrice] = useState(''); // NEW
    const [lightPrice, setLightPrice] = useState('');
    const [heatingPrice, setHeatingPrice] = useState('');
    // Default
    const [isDefault, setIsDefault] = useState(false);

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
                    setPricePerHour(data.pricePerHour ? String(data.pricePerHour) : '');
                    setGuestPrice(data.guestPricePerHour ? String(data.guestPricePerHour) : ''); // NEW
                    setLightPrice(data.lightPricePerHour ? String(data.lightPricePerHour) : '');
                    setHeatingPrice(data.heatingPricePerHour ? String(data.heatingPricePerHour) : '');
                }
                // Common
                setIsDefault(data.isDefault || false);
            } else {
                Alert.alert(t('ERROR'), t('ERROR'));
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
                    surface: surface,
                    pricePerHour: parseFloat(pricePerHour) || 0,
                    guestPricePerHour: parseFloat(guestPrice) || 0, // NEW
                    lightPricePerHour: parseFloat(lightPrice) || 0,
                    heatingPricePerHour: parseFloat(heatingPrice) || 0
                };
            }

            // Common fields
            updatePayload.isDefault = isDefault;

            // Handle Default Logic (reset others if this is default)
            if (isDefault) {
                // Future: Unset others
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
            Alert.alert(t('ERROR'), t('ERROR_SAVE'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async () => {
        Alert.alert(
            t('DELETE_TITLE'),
            t('DELETE_MSG'),
            [
                { text: t('CANCEL'), style: "cancel" },
                {
                    text: t('DELETE'),
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
    const renderField = (label, value, setter, placeholder, iconName, multiline = false) => (
        <View style={styles.inputGroup}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.inputContainer}>
                {iconName && <Ionicons name={iconName} size={18} color="#666" style={{ marginRight: 10 }} />}
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
                    <Text style={styles.backBtn}>{t('CLOSE')}</Text>
                </TouchableOpacity>
                <Text style={styles.title}>{editMode ? (isNew ? t('NEW') : t('EDIT')) : t('DETAILS')}</Text>

                {!isNew && (
                    <TouchableOpacity onPress={() => setEditMode(!editMode)}>
                        <Text style={styles.editBtn}>{editMode ? t('CANCEL') : t('EDIT')}</Text>
                    </TouchableOpacity>
                )}
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 50 }}>

                {/* HEADLINE SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('IDENTITY')}</Text>
                    {renderField(type === 'player' ? t('NICKNAME') : t('VENUE_NAME'), name, setName, isNew ? t('PLACEHOLDER_NAME') : "Name", type === 'player' ? 'person' : 'business')}

                    {type === 'player' && (
                        <>
                            {renderField(t('FIRST_NAME'), firstName, setFirstName, "Mario", "person-outline")}
                            {renderField(t('LAST_NAME'), lastName, setLastName, "Rossi", "person-outline")}
                        </>
                    )}
                </View>

                {/* CONTACT SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('CONTACT')}</Text>
                    {renderField(t('PHONE'), phone, setPhone, "+39 ...", "call-outline")}
                    {type === 'player' && renderField(t('EMAIL'), email, setEmail, "user@example.com", "mail-outline")}
                    {type === 'venue' && renderField(t('WEBSITE'), website, setWebsite, "www.tennisclub.it", "globe-outline")}
                </View>

                {/* INFO SECTION */}
                <View style={styles.section}>
                    <Text style={styles.sectionHeader}>{t('INFO')}</Text>
                    {type === 'player' ? (
                        renderField('CITY', city, setCity, "Milan", "location-outline")
                    ) : (
                        <>
                            {renderField(t('ADDRESS'), address, setAddress, "Street, City", "location-outline", true)}
                            {renderField(t('SURFACE'), surface, setSurface, "Clay, Hard, Grass", "layers-outline")}
                        </>
                    )}
                </View>

                {/* DEFAULT TOGGLE */}
                <View style={styles.section}>
                    <View style={styles.switchRow}>
                        <View>
                            <Text style={styles.switchLabel}>{t('SET_DEFAULT')}</Text>
                            <Text style={styles.switchSub}>{t('DEFAULT_SUB')}</Text>
                        </View>
                        {editMode ? (
                            <TouchableOpacity onPress={() => setIsDefault(!isDefault)}>
                                <Ionicons name={isDefault ? "toggle" : "toggle-outline"} size={32} color={isDefault ? "#ccff00" : "#666"} />
                            </TouchableOpacity>
                        ) : (
                            isDefault && <Ionicons name="checkmark-circle" size={24} color="#ccff00" />
                        )}
                    </View>
                </View>

                {/* RATES SECTION (VENUES ONLY) */}
                {type === 'venue' && (
                    <View style={styles.section}>
                        <Text style={styles.sectionHeader}>{t('RATES')}</Text>
                        <Text style={styles.helperText}>{t('RATES_HELPER')}</Text>
                        {renderField(t('MEMBER_PRICE'), pricePerHour, setPricePerHour, "0.00", "person-outline")}
                        {renderField(t('NON_MEMBER_PRICE'), guestPrice, setGuestPrice, "0.00", "people-outline")}
                        {renderField(t('LIGHTING'), lightPrice, setLightPrice, "0.00", "bulb-outline")}
                        {renderField(t('HEATING'), heatingPrice, setHeatingPrice, "0.00", "flame-outline")}
                    </View>
                )}

                {/* SAVE BUTTON */}
                {editMode && (
                    <TouchableOpacity style={styles.saveBtn} onPress={handleSave} disabled={saving}>
                        <Text style={styles.saveBtnText}>{saving ? t('SAVING') : t('SAVE_CHANGES')}</Text>
                    </TouchableOpacity>
                )}

                {/* DELETE BUTTON */}
                {!isNew && editMode && (
                    <TouchableOpacity style={styles.deleteBtn} onPress={handleDelete}>
                        <Text style={styles.deleteBtnText}>{t('DELETE_PERMANENTLY')}</Text>
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
        color: '#ccff00',
        fontSize: 11,
        fontWeight: '700',
        letterSpacing: 1,
        marginBottom: 15,
        textTransform: 'uppercase',
    },
    helperText: {
        color: '#666',
        fontSize: 12,
        fontStyle: 'italic',
        marginTop: -10,
        marginBottom: 15,
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
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#333',
        paddingVertical: 8,
    },
    input: {
        flex: 1,
        color: '#fff',
        fontSize: 16,
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
    deleteBtnText: { color: '#ff3b30', fontSize: 14, fontWeight: '700' },

    switchRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    switchLabel: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '700',
    },
    switchSub: {
        color: '#666',
        fontSize: 11,
        marginTop: 2,
    }
});
