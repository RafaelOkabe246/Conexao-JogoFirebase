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

        this.initializePlayerData();

        this.initializeHostState();
    }

    async initializePlayerData(){
        realtimeDB.update();
    }

    async ensureHostRefs() {
        if (!this.userId) {
            this.userId = await authentication.waitForUserId();
        }

        this.lobbyId = getCurrentLobbyId() || this.lobbyId || new URLSearchParams(window.location.search).get("lobbyId");

        const lobbyPath = `lobbies/${this.lobbyId}`;
        this.lobbyRef = realtimeDB.ref(this.database, lobbyPath);
        this.gameStateRef = realtimeDB.ref(this.database, `${lobbyPath}/GameState`);
        this.gameDataRef = realtimeDB.ref(this.database, `${lobbyPath}/GameData`);
        this.playerRef = realtimeDB.ref(this.database, `${lobbyPath}/players/${this.userId}`);
    }

    async initializeHostState() {
        await this.ensureHostRefs();
        this.IsHost = await getIsHost();

        if(this.IsHost) {
            this.SetUpGameData();
        }
    }

    GetIsHost(){
        return this.IsHost;
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

    async SetUpGameData(){
//Set up the game data
        try{
            console.log("SET UO");
            //Set up the current minigame
            await realtimeDB.update(this.lobbyRef, {
                miniGame: 'Bingo Joy',
                GameState: "Starting"
            });

            const initialGameState = {
                GameState: 'playing'
            };

            const setUpGameData = {
                currentRound: 0,
                currentNumber: 0,
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

    endGame() {


        // Implement the logic to end the game
    }

    closeGame() {
        // Implement the logic to close the game
    }

}

let bingoJoyHostManager = new BingoJoyHostManager(authentication.getUserId());

export {bingoJoyHostManager}