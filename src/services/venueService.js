import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, query, where, Timestamp, deleteDoc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

const VENUES_COLLECTION = "venues";

/**
 * Searches for a venue by exact name.
 * If found, returns the venue object.
 * If not, creates a new venue with a generated UUID.
 */
export async function getOrCreateVenue(name) {
    if (!name) return null;
    const cleanName = name.trim();

    try {
        // 1. Search existing
        const q = query(collection(db, VENUES_COLLECTION), where("name", "==", cleanName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }

        // 2. Create new
        const newUuid = uuidv4();
        const newVenue = {
            uuid: newUuid, // Helper index
            name: cleanName,
            createdAt: Timestamp.now(),
            address: "", // Can be filled later
            // Future-proof fields
            phoneNumber: null,
            website: null,
            coordinates: { lat: null, lng: null },
            googlePlaceId: null,
            surface: null, // clay, hard, grass
            description: null,
            // Expense Tracking
            pricePerHour: 0,
            guestPricePerHour: 0, // NEW: Price for non-members
            lightPricePerHour: 0,
            heatingPricePerHour: 0
        };

        const docRef = await addDoc(collection(db, VENUES_COLLECTION), newVenue);
        return { id: docRef.id, ...newVenue };

    } catch (e) {
        console.error("Error in getOrCreateVenue:", e);
        throw e;
    }
}

/**
 * Fetch all venues for directory/picker
 */
export async function getAllVenues() {
    try {
        const snapshot = await getDocs(collection(db, VENUES_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Get the default venue (if any)
 */
export async function getDefaultVenue() {
    try {
        const q = query(collection(db, VENUES_COLLECTION), where("isDefault", "==", true));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            // If multiple, just return the first one
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting default venue:", e);
        return null;
    }
}
// DELETE ALL venues (for testing/reset)
export async function deleteAllVenues() {
    try {
        console.log("Deleting ALL venues...");
        const snapshot = await getDocs(collection(db, VENUES_COLLECTION));

        const deletePromises = snapshot.docs.map(doc =>
            deleteDoc(doc.ref)
        );

        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} venues.`);
        return true;
    } catch (e) {
        console.error("Error deleting all venues:", e);
        return false;
    }
}
