# TooMatch - React Native App

## Descrizione del progetto
TooMatch è un'app mobile sviluppata con React Native, pensata per la gestione dei match (es. tennis, padel, ecc.) tra giocatori. Permette di registrare informazioni sui match, giocatori, punteggi, campi sportivi (venue) e note aggiuntive. L'obiettivo è avere un'app semplice, veloce da testare su smartphone e facilmente estendibile.

## Scelte tecnologiche
- **Frontend:** React Native (classico, entry point App.js) tramite Expo
- **Backend/Database:** Firebase Firestore (serverless, real-time)
- **Versionamento:** Git
- **Gestione pacchetti:** npm, con supporto per npx
- **Strumenti consigliati su Windows:** Node.js (tramite nvm), Expo CLI

## Prerequisiti su Windows
1. **Installare NVM per Windows**
   - Scaricare da: https://github.com/coreybutler/nvm-windows
2. **Installare Node.js LTS tramite NVM**
   ```powershell
   nvm install 20
   nvm use 20
   node -v
   ```
3. **Verificare npx**
   ```powershell
   npx --version
   ```
4. **Installare Expo CLI**
   ```powershell
   npm install -g expo-cli
   ```
5. **Avere un account Expo** (può essere anche con email, non necessariamente Google)

## Installazione e configurazione del progetto
1. **Creare il progetto React Native classico**
```powershell
npx create-expo-app TooMatch --template blank
```
2. **Navigare nella cartella del progetto**
```powershell
cd TooMatch
```
3. **Installare dipendenze** (già incluse dal template blank, ma eventualmente aggiungere librerie aggiuntive)
```powershell
npm install
```
4. **Installare le dipendenze aggiuntive** Oltre alle dipendenze create dal template blank, installare Firebase:

```powershell
npm install firebase
```

5. **Collegamento a Firebase**
   - Creare un progetto Firebase: https://console.firebase.google.com
   - Aggiungere una Web App
   - Copiare le informazioni di configurazione e creare `firebaseConfig.js`:
```javascript
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "XXX",
  authDomain: "too-match.firebaseapp.com",
  projectId: "too-match",
  storageBucket: "too-match.appspot.com",
  messagingSenderId: "XXX",
  appId: "XXX"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
```
6. **Inizializzare Git**
```powershell
git init
git add .
git commit -m "Initial commit TooMatch React Native classico + Firebase"
```

## Esecuzione dell'ambiente di sviluppo
- Avviare Expo in modalità sviluppo:
```powershell
npx expo start --clear
```
- Scannerizzare il QR code con Expo Go sul telefono
- Fast Refresh attivo: le modifiche salvate in App.js si riflettono subito sul dispositivo
- I log sono visibili sul terminale Metro Bundler

### Note ambiente sviluppo
- Tutte le schermate e i componenti partono da `App.js`
- Cartelle `src/`, `components/`, `hooks/` possono essere aggiunte e importate progressivamente
- Firebase già configurato permette di testare la scrittura e lettura dei match in tempo reale

## Passaggi grossolani per andare in produzione
1. **Testare l'app sul telefono in modalità sviluppo** fino a completa funzionalità

2. **Generare build Expo**

```powershell
npx expo build:android
npx expo build:ios
```

3. **Pubblicare le build sugli store** (Google Play Store / Apple App Store)
4. **Assicurarsi che Firebase sia impostato per l'ambiente di produzione** (security rules, API keys, ecc.)

## Roadmap
- Versione 0.01: creare App.js minimale, collegamento Firebase, primo match di prova
- Versione 0.02: creare interfaccia per inserimento match, visualizzazione match esistenti
- Versione 0.03: gestione giocatori, opponent ID, venue ID, punteggio game/tie-break
- Versione 0.04: gestione contatti, telefono, WhatsApp, note
- Versione 0.05: ottimizzazione UI, filtri, ricerca match
- Versione 0.06: deploy produzione e pubblicazione sugli store

