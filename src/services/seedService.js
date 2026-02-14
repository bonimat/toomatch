import { db, auth } from "../../firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { v4 as uuidv4 } from 'uuid';
import { createMatch } from "./matchService";
import { getOrCreateUser } from "./userService";
import { getOrCreateVenue } from "./venueService";

// Dummy Data Arrays
const MALE_NAMES = ["Alessandro", "Marco", "Luca", "Matteo", "Giovanni", "Francesco", "Davide", "Lorenzo", "Simone", "Andrea"];
const FEMALE_NAMES = ["Sofia", "Giulia", "Aurora", "Alice", "Ginevra", "Emma", "Giorgia", "Beatrice", "Greta", "Vittoria"];
const SURNAMES = ["Rossi", "Bianchi", "Esposito", "Ferrari", "Romano", "Colombo", "Ricci", "Marino", "Greco", "Bruno", "Rizzo", "Gallo", "Pisano"];
const CLUBS = ["Circolo Tennis Roma", "Sporting Club", "Tennis Club Milano", "Ace Academy", "Green Set Club", "Clay Court Club", "Match Point Center"];

const generateRandomName = () => {
    const isMale = Math.random() > 0.5;
    const names = isMale ? MALE_NAMES : FEMALE_NAMES;
    const name = names[Math.floor(Math.random() * names.length)];
    const surname = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    return { name, surname, nickname: `${name} ${surname}` };
};

const getRandomItem = (arr) => arr[Math.floor(Math.random() * arr.length)];
const getRandomScore = () => {
    // Generate realistic tennis sets
    const sets = [];
    const numSets = Math.random() > 0.8 ? 3 : 2; // Mostly 2 sets, sometimes 3

    for (let i = 0; i < numSets; i++) {
        // Simplified logic: just random realistic numbers
        // We aren't calculating who won here, just data points
        const s1 = Math.floor(Math.random() * 7).toString();
        const s2 = Math.floor(Math.random() * 7).toString();
        sets.push({ s1, s2 });
    }
    return sets;
};

export const seedDatabase = async () => {
    console.log("Seeding Database...");
    const logs = [];
    const log = (msg) => { console.log(msg); logs.push(msg); };

    try {
        const currentUser = auth.currentUser;
        if (!currentUser) throw new Error("Must be logged in to seed data");

        // 1. Create Venues
        log("Creating Venues...");
        const venues = [];
        for (const clubName of CLUBS) {
            const v = await getOrCreateVenue(clubName);
            venues.push(v);
        }
        log(`Created/Found ${venues.length} venues.`);

        // 2. Create Dummy Users (Opponents)
        log("Creating Dummy Users...");
        const opponents = [];
        for (let i = 0; i < 15; i++) {
            const identity = generateRandomName();
            const u = await getOrCreateUser(identity.nickname);
            opponents.push(u);
        }
        log(`Created/Found ${opponents.length} opponents.`);

        // 3. Create Matches
        log("Generating Matches...");
        const NUM_MATCHES = 30;
        const now = Date.now();
        const sixMonthsAgo = now - (180 * 24 * 60 * 60 * 1000);

        const promises = [];
        for (let i = 0; i < NUM_MATCHES; i++) {
            const opp = getRandomItem(opponents);
            const venue = getRandomItem(venues);

            // Random date within last 6 months
            const randomTime = sixMonthsAgo + Math.random() * (now - sixMonthsAgo);
            const matchDate = new Date(randomTime).toISOString();

            const matchData = {
                player1: "Me",
                player2: opp.nickname,
                location: venue.name,
                date: matchDate,
                sets: getRandomScore(),
                notes: "Auto-generated test match",
                duration: 60 + Math.floor(Math.random() * 60), // 60-120 mins
                totalCost: 10 + Math.floor(Math.random() * 30), // 10-40 euros
                ownerId: currentUser.uid,
                // Add booleans
                useLights: Math.random() > 0.5,
                useHeating: Math.random() > 0.2,
                isGuest: false
            };

            // Using createMatch from matchService handles all logic
            promises.push(createMatch(matchData));
        }

        await Promise.all(promises);
        log(`Successfully created ${NUM_MATCHES} matches linked to current user.`);

        return { success: true, logs };
    } catch (e) {
        console.error("Seeding failed:", e);
        return { success: false, error: e.message, logs };
    }
};
