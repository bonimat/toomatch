import { db } from "../../firebaseConfig";
import { collection, addDoc, Timestamp, getDocs, query, orderBy } from "firebase/firestore";

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
        // Enforce basic structure
        const payload = {
            player1: matchData.player1 || "Me",
            player2: matchData.player2 || "Opponent",
            date: matchData.date || new Date().toISOString(), // String format YYYY-MM-DD
            location: matchData.location || "",
            sets: matchData.sets.map(s => ({
                s1: parseInt(s.s1) || 0,
                s2: parseInt(s.s2) || 0
            })),
            notes: matchData.notes || "",
            createdAt: Timestamp.now(),
            userWon: didUserWin(matchData.sets) // Pre-calculate result for easier querying/display
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

        console.log("Match created with ID:", docRef.id);
        return docRef.id;

    } catch (e) {
        console.error("Error creating match:", e);
        throw e;
    }
}

export async function createTestMatch() {
    // Deprecated but kept for reference if needed
    return createMatch({
        player1: "Me",
        player2: "Test Opponent",
        date: new Date().toISOString().split('T')[0],
        sets: [{ s1: 6, s2: 4 }],
        notes: "Test match"
    });
}

export async function getDashboardStats() {
    try {
        const q = query(
            collection(db, "matches"),
            orderBy("date", "desc"),
            orderBy("createdAt", "desc") // Secondary sort
        );

        const snapshot = await getDocs(q);
        const matches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
        }));

        // Calculate Stats
        const total = matches.length;
        const wins = matches.filter(m => m.userWon).length;
        const losses = total - wins;
        const winRate = total > 0 ? Math.round((wins / total) * 100) : 0;

        // Calculate Streak (Current streak of W or L)
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
            recentMatches: matches.slice(0, 5) // Return last 5 for list
        };

    } catch (e) {
        console.error("Error fetching dashboard stats:", e);
        return {
            stats: { total: 0, wins: 0, losses: 0, winRate: 0, streak: 0 },
            recentMatches: []
        };
    }
}
