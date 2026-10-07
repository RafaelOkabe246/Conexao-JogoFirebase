import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";

import * as authentication from "../../authentication.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";


class MaisOuMenorPlayerManager {
    constructor(userId) {
        this.userId = userId;

        this.initializePlayerData();
    }

    async initializePlayerData(){
        try{
            await this.ensureRefs();

            const maisOuMenorPlayerData = {
                playerEndedGame: false
            }
            console.log("INITIALIZING PLAYER DATA");
            await realtimeDB.update(this.playerRef, maisOuMenorPlayerData);
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


    async resetGameForAllPlayers() {
        if(!this.IsHost) return;
        await this.ensureRefs();

        const initialGameData = {
            currentRound: 0,
            availableRounds: 0,
            availableNumbers: 0,
            difficulty: "hard",
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
        window.location.href = '../../index.html';

        await realtimeDB.onValue(this.gameStateRef, (snapshot) => {
            const state = snapshot.val();
            if(state && state.GameState === 'playing') 
                {
                    console.log("Back to menu");

            }
        });
    }

    async updatePlayerStatus(playerEndedGame) {
        await this.ensureRefs();
        await realtimeDB.update(this.playerRef, {
            playerEndedGame: playerEndedGame
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

let maisOuMenorPlayerManager = new MaisOuMenorPlayerManager(authentication.getUserId());

export {maisOuMenorPlayerManager}