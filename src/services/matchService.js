import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, Timestamp, getDocs, query, orderBy, updateDoc, doc, deleteDoc, where } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { getOrCreateUser } from "./userService";
import { getOrCreateVenue } from "./venueService";

// Helper: Calculate if the user (player1) won the match
const didUserWin = (sets) => {
    let userSets = 0;
    let opponentSets = 0;

    sets.forEach(set => {
        const s1 = parseInt(set.s1) || 0;
        const s2 = parseInt(set.s2) || 0;
        if (s1 > s2) userSets++;
        if (s2 > s1) opponentSets++;
    });

    return userSets > opponentSets;
};

export async function createMatch(matchData) {
    try {
        console.log("Creating match with data linking...", matchData);

        // 1. Get/Create Entities
        // Player 1 (Usually "Me", but assuming we might want to track looking up the real user later)
        // For now, if it's "Me", we might skip fetching a user doc or just create one called "Me" (not ideal but consistent)
        // Let's assume passed names are nicknames.
        const player1Doc = await getOrCreateUser(matchData.player1 || "Me");
        const player2Doc = await getOrCreateUser(matchData.player2 || "Opponent");
        const venueDoc = await getOrCreateVenue(matchData.location);

        // 2. Prepare Match Payload
        const matchUuid = uuidv4();
        const payload = {
            uuid: matchUuid, // Match's own UUID index

            // Relational Objects (Snapshot of basic info + ID link)
            player1: {
                uuid: player1Doc?.uuid || null,
                nickname: player1Doc?.nickname || "Unknown",
            },
            player2: {
                uuid: player2Doc?.uuid || null,
                nickname: player2Doc?.nickname || "Unknown",
            },
            venue: venueDoc ? {
                uuid: venueDoc.uuid || null,
                name: venueDoc.name || "Unknown",
            } : null,

            // Legacy/Display fields (keeping top level for compatibility with current queries if needed)
            player1_name: matchData.player1 || "Unknown",
            player2_name: matchData.player2 || "Unknown",
            location_name: matchData.location || "Unknown",

            date: matchData.date || new Date().toISOString(),
            sets: matchData.sets.map(s => ({
                s1: parseInt(s.s1) || 0,
                s2: parseInt(s.s2) || 0
            })),
            notes: matchData.notes || "",
            createdAt: Timestamp.now(),
            userWon: didUserWin(matchData.sets),

            // Expenses (FIX: Ensure these are saved on creation too)
            duration: matchData.duration || 0,
            useLights: matchData.useLights || false,
            useHeating: matchData.useHeating || false,
            isGuest: matchData.isGuest || false,
            totalCost: matchData.totalCost || 0,
            venueId: matchData.venueId || null,
            ownerId: auth.currentUser ? auth.currentUser.uid : "anonymous" // Link to Auth User
        };

        // Direct DB call - Firestore SDK handles offline/latency better than manual timeout
        const docRef = await addDoc(collection(db, "matches"), payload);

        console.log("Match created with ID:", docRef.id, " and UUID:", matchUuid);
        return docRef.id;

    } catch (e) {
        console.error("Error creating match:", e);
        throw e;
    }
}

export async function updateMatch(matchId, matchData) {
    try {
        console.log("Updating match...", matchId);

        // 1. Get/Create Entities (in case names changed)
        const player1Doc = await getOrCreateUser(matchData.player1 || "Me");
        const player2Doc = await getOrCreateUser(matchData.player2 || "Opponent");
        const venueDoc = await getOrCreateVenue(matchData.location);

        const payload = {
            // Relational Objects
            player1: {
                uuid: player1Doc?.uuid || null,
                nickname: player1Doc?.nickname || "Unknown",
            },
            player2: {
                uuid: player2Doc?.uuid || null,
                nickname: player2Doc?.nickname || "Unknown",
            },
            venue: venueDoc ? {
                uuid: venueDoc.uuid || null,
                name: venueDoc.name || "Unknown",
            } : null,

            // Legacy/Display fields
            player1_name: matchData.player1 || "Unknown",
            player2_name: matchData.player2 || "Unknown",
            location_name: matchData.location || "Unknown",

            date: matchData.date || new Date().toISOString(),
            sets: matchData.sets.map(s => ({
                s1: parseInt(s.s1) || 0,
                s2: parseInt(s.s2) || 0
            })),
            notes: matchData.notes || "",
            // Use existing createdAt or update updatedAt? Firestore usually keeps createdAt.
            // Let's add updatedAt
            updatedAt: Timestamp.now(),
            userWon: didUserWin(matchData.sets),

            // Expenses
            duration: matchData.duration,
            useLights: matchData.useLights,
            useHeating: matchData.useHeating,
            isGuest: matchData.isGuest,
            totalCost: matchData.totalCost,
            venueId: matchData.venueId
        };

        await updateDoc(doc(db, "matches", matchId), payload);
        console.log("Match updated:", matchId);
        return matchId;

    } catch (e) {
        console.error("Error updating match:", e);
        throw e;
    }
}

export async function deleteMatch(matchId) {
    try {
        console.log("Deleting match:", matchId);
        await deleteDoc(doc(db, "matches", matchId));
        return true;
    } catch (e) {
        console.error("Error deleting match:", e);
        throw e;
    }
}

export async function getDashboardStats() {
    try {
        // Query remains mostly the same, as we kept denormalized data or can use top level
        const user = auth.currentUser;
        if (!user) return { stats: { total: 0, wins: 0, losses: 0, winRate: 0, streak: 0 }, recentMatches: [] };

        const q = query(
            collection(db, "matches"),
            where("ownerId", "==", user.uid),
            orderBy("date", "desc"),
            orderBy("createdAt", "desc")
        );

        const snapshot = await getDocs(q);
        const matches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                // Ensure display compatibility if we switched to nested objects
                player1: data.player1?.nickname || data.player1 || "Unknown",
                player2: data.player2?.nickname || data.player2 || "Unknown",
                location: data.venue?.name || data.location || "",
            };
        });

        // Calculate Stats
        const total = matches.length;
        const wins = matches.filter(m => m.userWon).length;
        const losses = total - wins;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        // Calculate Streak 
        let streak = 0;
        if (total > 0) {
            const isWinStreak = matches[0].userWon;
            for (let i = 0; i < total; i++) {
                if (matches[i].userWon === isWinStreak) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        return {
            stats: {
                total,
                wins,
                losses,
                winRate,
                streak
            },
            recentMatches: matches.slice(0, 5)
        };

    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
        return {
            stats: { total: 0, wins: 0, losses: 0, winRate: 0, streak: 0 },
            recentMatches: []
        };
    }
}

export async function getDetailedStats() {
    try {
        const user = auth.currentUser;
        if (!user) return { total: 0, wins: 0, losses: 0, winRate: 0, streak: 0, recentHistory: [], rivals: [] };

        const q = query(
            collection(db, "matches"),
            where("ownerId", "==", user.uid),
            orderBy("date", "desc")
        );
        // Note: orderBy requires an index sometimes. If it fails, we might need to create it in Firebase Console.
        // For dev, if it fails, try removing orderBy. But let's assume index is ok or small collection.

        const snapshot = await getDocs(q);
        const matches = snapshot.docs.map(doc => {
            const data = doc.data();
            return { id: doc.id, ...data };
        });

        const total = matches.length;
        const wins = matches.filter(m => m.userWon).length;
        const losses = total - wins;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        // Economy Stats
        const totalSpent = matches.reduce((sum, m) => sum + (parseFloat(m.totalCost) || 0), 0);
        const avgCost = total > 0 ? (totalSpent / total).toFixed(2) : "0.00";

        // Streak
        let streak = 0;
        let isWinStreak = false;

        if (total > 0) {
            // Current Streak
            isWinStreak = matches[0].userWon; // based on most recent
            for (let i = 0; i < total; i++) {
                if (matches[i].userWon === isWinStreak) {
                    streak++;
                } else {
                    break;
                }
            }
        }

        // Rivals Calculation
        const rivals = {};
        matches.forEach(m => {
            const oppName = m.player2?.nickname || m.player2_name || m.player2 || "Unknown";
            if (!rivals[oppName]) rivals[oppName] = { played: 0, won: 0 };
            rivals[oppName].played++;
            if (m.userWon) rivals[oppName].won++;
        });

        const sortedRivals = Object.entries(rivals)
            .map(([name, stats]) => ({ name, ...stats }))
            .sort((a, b) => b.played - a.played); // Return all rivals

        return {
            total,
            wins,
            losses,
            winRate,
            streak,
            isWinStreak,
            isWinStreak,
            recentHistory: matches.slice(0, 5).reverse().map(m => m.userWon), // Return booleans for localization
            rivals: sortedRivals,
            // Economy
            totalSpent: totalSpent.toFixed(2),
            avgCost: avgCost
        };

    } catch (e) {
        console.error("Error detailed stats:", e);
        return { total: 0, wins: 0, losses: 0, winRate: 0, streak: 0, recentHistory: [], rivals: [] };
    }
}

// Get ALL matches for History Screen
export async function getAllMatches() {
    try {
        const user = auth.currentUser;
        if (!user) return [];

        const q = query(
            collection(db, "matches"),
            where("ownerId", "==", user.uid),
            orderBy("date", "desc")
        );

        const snapshot = await getDocs(q);
        const matches = snapshot.docs.map(doc => {
            const data = doc.data();
            return {
                id: doc.id,
                ...data,
                player1: data.player1?.nickname || data.player1 || "Unknown",
                player2: data.player2?.nickname || data.player2 || "Unknown",
                location: data.venue?.name || data.location || "",
            };
        });

        // Secondary Sort: Creation Time DESC (Newest created first for same date)
        return matches.sort((a, b) => {
            const dateA = a.date;
            const dateB = b.date;
            // Primary sort by date string (if not already handled by query, but query uses proper date type?) 
            // Query uses "date" string field. So string comparison is correct.
            if (dateA !== dateB) return dateB.localeCompare(dateA);

            // Secondary: Wins First
            if (a.userWon !== b.userWon) return a.userWon ? -1 : 1;

            // Tertiary: CreatedAt
            const tA = a.createdAt?.seconds || 0;
            const tB = b.createdAt?.seconds || 0;
            return tB - tA;
        });
    } catch (e) {
        console.error("Error fetching all matches:", e);
        return [];
    }
}

// TEMPORARY: Seed Data for Testing
export async function seedMatches() {
    const opponents = [
        "Federer", "Nadal", "Djokovic", "Murray", "Sinner",
        "Alcaraz", "Medvedev", "Zverev", "Tsitsipas", "Rublev",
        "Ruud", "De Minaur", "Dimitrov", "Fritz"
    ];

    try {
        const promises = opponents.map(async (name, index) => {
            const isWin = index % 2 === 0; // Alternate wins/losses
            return createMatch({
                player1: "Me",
                player2: name,
                location: "Test Club",
                date: new Date(Date.now() - (index * 86400000)).toISOString(), // 1 day apart
                sets: isWin ? [{ s1: '6', s2: '4' }, { s1: '6', s2: '3' }] : [{ s1: '4', s2: '6' }, { s1: '3', s2: '6' }],
                notes: "Auto-generated test match"
            });
        });

        await Promise.all(promises);
        console.log("Seeded 14 matches!");
        return true;
    } catch (e) {
        console.error("Error seeding:", e);
        return false;
    }
}
// DELETE CURRENT USER'S matches (Clean Reset)
// Also deletes all opponents and venues for a full reset
export async function clearUserMatches() {
    try {
        const user = auth.currentUser;
        if (!user) throw new Error("No authenticated user");

        console.log("Starting Full Reset for user:", user.uid);

        // 1. Delete Matches
        const q = query(
            collection(db, "matches"),
            where("ownerId", "==", user.uid)
        );
        const snapshot = await getDocs(q);

        if (!snapshot.empty) {
            const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
            await Promise.all(deletePromises);
            console.log(`Deleted ${deletePromises.length} matches.`);
        } else {
            console.log("No matches found to delete.");
        }

        // 2. Delete Venues (Global/Shared in this context)
        const { deleteAllVenues } = require('./venueService');
        await deleteAllVenues();

        // 3. Delete Opponents (All users except self)
        const { deleteOpponents } = require('./userService');
        await deleteOpponents(user.uid);

        return true;
    } catch (e) {
        console.error("Error clearing user data:", e);
        return false;
    }
}

/**
 * Get data for charts (Win/Loss, Expenses Trend, Activity)
 */
export async function getChartData() {
    try {
        const matches = await getAllMatches();
        const now = new Date();
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(now.getMonth() - 5);
        sixMonthsAgo.setDate(1); // Start of that month

        // 1. Win/Loss for Pie Chart
        let wins = 0;
        let losses = 0;

        // 2. Monthly Trend (Last 6 Months)
        // Initialize map for last 6 months
        const monthsMap = new Map();
        for (let i = 0; i < 6; i++) {
            const d = new Date();
            d.setMonth(now.getMonth() - i);
            const key = d.toLocaleString('default', { month: 'short' }); // e.g. "Jan", "Feb"
            monthsMap.set(key, { expense: 0, matches: 0, order: i }); // order 0 is current month
        }

        matches.forEach(m => {
            // Win/Loss (All time)
            if (m.userWon) wins++;
            else losses++;

            // Monthly Data
            const mDate = new Date(m.date);
            if (mDate >= sixMonthsAgo) {
                const key = mDate.toLocaleString('default', { month: 'short' });
                if (monthsMap.has(key)) {
                    const current = monthsMap.get(key);
                    current.expense += (parseFloat(m.totalCost) || 0);
                    current.matches += 1;
                    monthsMap.set(key, current);
                }
            }
        });

        // Convert map to array sorted by date (reverse order of 'order')
        const trendData = Array.from(monthsMap.entries())
            .map(([label, data]) => ({
                label,
                expense: data.expense,
                matches: data.matches,
                order: data.order
            }))
            .sort((a, b) => b.order - a.order); // Oldest first (Jan -> Feb -> ...)

        return {
            wins,
            losses,
            labels: trendData.map(d => d.label),
            expenses: trendData.map(d => d.expense),
            matches: trendData.map(d => d.matches)
        };

    } catch (e) {
        console.error("Error getting chart data:", e);
        return { wins: 0, losses: 0, labels: [], expenses: [], matches: [] };
    }
}
