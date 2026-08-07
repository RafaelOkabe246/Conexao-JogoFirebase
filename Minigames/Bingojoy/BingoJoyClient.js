import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";

import * as authentication from "../../authentication.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";


class BingoJoyClient{
    constructor(){
        this.userId = authentication.getUserId();
        this.lobbyId = getCurrentLobbyId() || new URLSearchParams(window.location.search).get("lobbyId");
        this.IsHost = false;
        this.initializeHostState();

        const database = realtimeDB.getDatabase();
        const lobbyPath = `lobbies/${this.lobbyId}`;

        const lobbyRef = realtimeDB.ref(database, lobbyPath);
        const gameStateRef = realtimeDB.ref(database, `${lobbyPath}`);
        const gameDataRef = realtimeDB.ref(database, `${lobbyPath}/GameData`);
        const playerRef = realtimeDB.ref(database, `${lobbyPath}/players/${this.userId}`);
    }

    updateLives(){}

    updateBoard(){}

    finishGame(){}

    listenGameEvents(){
    realtimeDB.onValue(this.lobbyRef, (snapshot) => {
        const updatedRoomData = snapshot.val();
        
        //Hear game changes

    });



    }

}