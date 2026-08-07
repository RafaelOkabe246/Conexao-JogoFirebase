import {MiniGameHostManagerClass} from '../MinigameHostManager.js';
import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";

import * as authentication from "../../authentication.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";

class BingoJoyHostManager {
    constructor(userId) {
        console.log("SA");
        this.userId = userId;
        this.lobbyId = getCurrentLobbyId() || new URLSearchParams(window.location.search).get("lobbyId");
        this.miniGame = "Bingo Joy";
        this.IsHost = false;

        this.database = realtimeDB.getDatabase();
        this.playersRef = null;
        this.playerRef = null;
        this.lobbyRef = null;
        this.gameStateRef = null;
        this.gameDataRef = null;

        // Bingo constants
        this.MIN_NUMBER = 1;
        this.MAX_NUMBER = 99; 
        this.DRAW_INTERVAL_MS = 3000; // 3 seconds between draws (adjust as needed)

        // Internal state (not persisted)
        this.drawTimer = null;
        this.isGameRunning = false;
        this.currentRound = null;
        this.drawnNumbers = []; // local cache

        this.initializeHostState();
    }

    async initializePlayerData(){
        try{
            await this.ensureRefs();

            const bingoPlayerData = {
                playerEndedGame: false,
                wonGame: false
            }
            console.log("INITIALIZING PLAYER DATA");
            await realtimeDB.update(this.playerRef, bingoPlayerData);
        }
        catch(err){
            console.error(err);
        }
    }

    async ensureRefs() {
        if (!this.userId) {
            this.userId = await authentication.waitForUserId();
        }

        this.lobbyId = getCurrentLobbyId() || this.lobbyId || new URLSearchParams(window.location.search).get("lobbyId");

        const lobbyPath = `lobbies/${this.lobbyId}`;
        this.lobbyRef = realtimeDB.ref(this.database, lobbyPath);
        this.gameStateRef = realtimeDB.ref(this.database, `${lobbyPath}/GameState`);
        this.gameDataRef = realtimeDB.ref(this.database, `${lobbyPath}/GameData`);
        this.playerRef = realtimeDB.ref(this.database, `${lobbyPath}/players/${this.userId}`);
        this.playersRef = realtimeDB.ref(this.database, `${lobbyPath}/players`);
    }

    async initializeHostState() {
        await this.ensureRefs();
        this.IsHost = await getIsHost();

        await this.initializePlayerData();

        if(this.IsHost) {
            this.SetUpGameData();
        }
    }

    GetGameStateRef(){
        return this.gameStateRef;
    }

    GetIsHost(){
        return this.IsHost;
    }

    GetPlayerRef(){
        return this.playerRef;
    }

    GetPlayersRef(){
        return this.playersRef;
    }

    async chooseDifficulty(difficulty){
         if(!this.IsHost) return;
        await this.gameDataRef.update({
            difficulty: difficulty
        });
    }

    generateRoundOptions() {
        const options = [];
        while(options.length < 3){
            const n = Math.floor(Math.random() * 99) + 1;
            if(!options.includes(n)) {
                options.push(n);
            }
        }
        return options.sort(() => Math.random() - 0.5);
    }

    async startRound() {
        if(!this.IsHost || !this.gameDataRef) return;

        const snapshot = await realtimeDB.get(this.gameDataRef);
        const currentData = snapshot.exists() ? snapshot.val() : {};
        const nextRound = Number(currentData.currentRound || 1) + 1;

        await realtimeDB.update(this.gameDataRef, {
            currentRound: nextRound,
            currentOptions: this.generateRoundOptions(),
            selectedNumber: null
        });
    }

    async resetGameForAllPlayers() {
        if(!this.IsHost) return;
        await this.ensureRefs();

        const initialGameData = {
            currentRound: 0,
            availableRounds: 0,
            availableNumbers: 0,
            //difficulty: "",
            winner: null,
            currentOptions: [],
            selectedNumber: null
        };

        await realtimeDB.set(this.gameDataRef, initialGameData);
        await realtimeDB.update(this.gameStateRef, { GameState: 'starting' });

        const snapshot = await realtimeDB.get(this.playersRef);
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach((childSnap) => {
                const playerId = childSnap.key;
                if (!playerId) return;
                updates[`players/${playerId}/playerEndedGame`] = false;
                updates[`players/${playerId}/wonGame`] = false;
            });
            if (Object.keys(updates).length > 0) {
                await realtimeDB.update(this.lobbyRef, updates);
            }
        }
    }

    async waitHostRestartGame() {
        if(!this.IsHost) return;
        await realtimeDB.onValue(this.gameStateRef, (snapshot) => {
            const state = snapshot.val();
            if(state && state.GameState === 'playing') {
                window.location.href = `./Minigames/Bingojoy/BingoJoy.html?lobbyId=${this.lobbyId}`;
            }
        });
    }

    async SetGameState(state) {
        if(!this.IsHost) return;
        await realtimeDB.update(this.gameStateRef, { GameState: state });
    }

    async SetUpGameData(){
    //Set up the game data
        try{
            console.log("SET UO");
            //Set up the current minigame
            await realtimeDB.update(this.lobbyRef, {
                miniGame: 'Bingo Joy',
                GameState: "starting"
            });

            const initialGameState = {
                GameState: 'starting'
            };

            const setUpGameData = {
                currentRound: 0,
                availableRounds: 0,
                availableNumbers: 0,
                difficulty: "",
                winner: null,
                currentOptions: [],
                selectedNumber: null
            };

            //Set Bingo Game data and global variables
            await realtimeDB.set(this.gameDataRef, setUpGameData);
            await realtimeDB.update(this.gameStateRef, initialGameState);
        }
        catch(error){
            console.error(error);
        }
    }

    async startGame() {

    }


    nextRound(){

        const numbers = generateNumbers();

        this.lobbyRef.update({

            currentNumbers:numbers,

            currentRound:round

        });

}


    runsGame() {
        // Implement the logic to run the game, listen to events here
    }

    async endGame() {
        // Implement the logic to end the game
        if (await this.allPlayersEndedGame()) {
            // Show the end game screen or perform any necessary cleanup
            await realtimeDB.update(this.lobbyRef, {
                GameState: "Ended"
            });

            //Now I have to show an ui of the game ended, and show the winner, and the score of each player

            if(this.IsHost=== true){

            }
            else{

            }

        }
    }

    closeGame() {
        // Implement the logic to close the game
        

    }


    async allPlayersEndedGame() {
        const snapshot = await realtimeDB.get(this.playersRef);

        if (!snapshot.exists()) return false;

        let allEnded = true;

        snapshot.forEach((childSnap) => {
            const player = childSnap.val() || {};
            if (player.playerEndedGame !== true) {
                allEnded = false;
                return false; // stop iterating
            }
        });

        return allEnded;
    }

}

let bingoJoyHostManager = new BingoJoyHostManager(authentication.getUserId());

export {bingoJoyHostManager}