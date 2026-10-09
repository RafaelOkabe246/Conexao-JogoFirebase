import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";

import * as authentication from "../../authentication.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";


class MaisOuMenorPlayerManager {
    constructor(userId) {
        console.log("User ID: ", userId);
        this.userId = userId;
        this.database = realtimeDB.getDatabase();
        this.lobbyId = null;
        this.lobbyRef = null;
        this.gameStateRef = null;
        this.gameDataRef = null;
        this.playerRef = null;
        this.playersRef = null;
        this.ensureRefs();
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
        this.lobbyId = getCurrentLobbyId() || this.lobbyId || new URLSearchParams(window.location.search).get("lobbyId");
        this.lobbyRef = realtimeDB.ref(this.database, `lobbies/${this.lobbyId}`);
        this.gameStateRef = realtimeDB.ref(this.database, `lobbies/${this.lobbyId}/GameState`);
        this.gameDataRef = realtimeDB.ref(this.database, `lobbies/${this.lobbyId}/GameData`);
        this.playerRef = realtimeDB.ref(this.database, `lobbies/${this.lobbyId}/players/${this.userId}`);
        this.playersRef = realtimeDB.ref(this.database, `lobbies/${this.lobbyId}/players`);
        /*
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
        */
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


    async updatePlayerStatus(playerEndedGame) {
        console.log(`Updating player status for userId: ${this.userId} to playerEndedGame: ${playerEndedGame}`);
        await realtimeDB.update(this.playerRef, {
            playerEndedGame: playerEndedGame
        });
    }


    async allPlayersEndedGame() {
        const snapshot = await realtimeDB.get(this.playersRef);
        if(!snapshot.exists()) {
            console.log("No players found in the lobby.");
            return false;
        }else{
            console.log("Players found in the lobby. Checking if all players have ended the game...");
        }
        //await this.ensureRefs();
        //console.log("Checking if all players have ended the game...");
        //const snapshot = await realtimeDB.get(this.playersRef);

        //if (!snapshot.exists()) return false;
        //console.log("Snapshot exists. Checking player statuses...");
        let allEnded = true;
        snapshot.forEach((childSnap) => {
            const player = childSnap.val() || {};
            if (player.playerEndedGame !== true) {
                allEnded = false;
                return true;
            }
            return false;
        });

        return allEnded;
    }

}

let maisOuMenorPlayerManager = new MaisOuMenorPlayerManager(authentication.getUserId());

export {maisOuMenorPlayerManager}