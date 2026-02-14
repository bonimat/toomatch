import { db } from "../../firebaseConfig";
import { collection, addDoc, getDocs, setDoc, query, where, Timestamp, deleteDoc, updateDoc, doc } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';

const USERS_COLLECTION = "users";

/**
 * Searches for a user by exact nickname (case-insensitive ideally, but simple for now).
 * If found, returns the user object.
 * If not, creates a new user with a generated UUID.
 */
export async function getOrCreateUser(nickname) {
    if (!nickname) return null;
    const cleanName = nickname.trim();

    try {
        // 1. Search existing
        const q = query(collection(db, USERS_COLLECTION), where("nickname", "==", cleanName));
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            // Found existing user
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }

        // 2. Create new
        const newUuid = uuidv4();
        const newUser = {
            uuid: newUuid, // Helper index as requested
            nickname: cleanName,
            createdAt: Timestamp.now(),
            isRegistered: false, // Flag to distinguish "stub" users from real accounts later
            // Future-proof fields
            phoneNumber: null,
            email: null,
            firstName: null,
            lastName: null,
            city: null,
            contactsId: null,
            avatar: null
        };

        const docRef = await addDoc(collection(db, USERS_COLLECTION), newUser);
        return { id: docRef.id, ...newUser };

    } catch (e) {
        console.error("Error in getOrCreateUser:", e);
        throw e;
    }
}

/**
 * Update user fields (e.g. nickname, avatar)
 */
export async function updateUser(userId, data) {
    try {
        if (!userId) {
            console.error("Error: userId is null or undefined in updateUser");
            return false;
        }
        const userRef = doc(db, USERS_COLLECTION, userId);
        // Use setDoc with merge: true so it creates the doc if it doesn't exist
        await setDoc(userRef, data, { merge: true });
        return true;
    } catch (e) {
        console.error("Error updating user:", e);
        return false;
    }
}

/**
 * Basic search for autocomplete (future use)
 */
export async function searchUsers(searchText) {
    // Firestore lacks native substring search. 
    // We can implement "startsWith" using: where('nickname', '>=', text) and where('nickname', '<=', text + '\uf8ff')
    // For now, let's keep it simple or implement if requested.
    return [];
}

/**
 * Fetch all users for directory/picker
 */
export async function getAllUsers() {
    try {
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (e) {
        console.error(e);
        return [];
    }
}

/**
 * Get the default opponent (if any)
 */
export async function getDefaultOpponent() {
    try {
        const q = query(collection(db, USERS_COLLECTION), where("isDefault", "==", true));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const doc = snapshot.docs[0];
            return { id: doc.id, ...doc.data() };
        }
        return null;
    } catch (e) {
        console.error("Error getting default opponent:", e);
        return null;
    }
}
// DELETE ALL users (for testing/reset)
export async function deleteAllUsers() {
    try {
        console.log("Deleting ALL users...");
        const snapshot = await getDocs(collection(db, USERS_COLLECTION));

        const deletePromises = snapshot.docs.map(doc =>
            deleteDoc(doc.ref)
        );

        await Promise.all(deletePromises);
        console.log(`Deleted ${deletePromises.length} users.`);
        return true;
    } catch (e) {
        console.error("Error deleting all users:", e);
        return false;
    }
}
