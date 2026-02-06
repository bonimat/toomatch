import { db } from "../../firebaseConfig";
import { collection, addDoc, Timestamp, getDocs, query, orderBy } from "firebase/firestore";
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
                uuid: player1Doc?.uuid,
                nickname: player1Doc?.nickname, // Denormalized for display
            },
            player2: {
                uuid: player2Doc?.uuid,
                nickname: player2Doc?.nickname, // Denormalized for display
            },
            venue: venueDoc ? {
                uuid: venueDoc.uuid,
                name: venueDoc.name,
            } : null,

            // Legacy/Display fields (keeping top level for compatibility with current queries if needed)
            player1_name: matchData.player1, 
            player2_name: matchData.player2,
            location_name: matchData.location,

            date: matchData.date || new Date().toISOString(),
            sets: matchData.sets.map(s => ({
                s1: parseInt(s.s1) || 0,
                s2: parseInt(s.s2) || 0
            })),
            notes: matchData.notes || "",
            createdAt: Timestamp.now(), 
            userWon: didUserWin(matchData.sets)
        };

        // Timeout promise to prevent infinite hanging
        const timeout = new Promise((_, reject) => 
            setTimeout(() => reject(new Error("Request timed out (Firebase)")), 10000)
        );

        // Race between DB call and timeout
        const docRef = await Promise.race([
            addDoc(collection(db, "matches"), payload),
            timeout
        ]);

        console.log("Match created with ID:", docRef.id, " and UUID:", matchUuid);
        return docRef.id;

    } catch (e) {
        console.error("Error creating match:", e);
        throw e;
    }
}

export async function getDashboardStats() {
    try {
        // Query remains mostly the same, as we kept denormalized data or can use top level
        const q = query(
            collection(db, "matches"),
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
