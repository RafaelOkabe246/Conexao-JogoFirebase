import {realtimeDataBaseMethods as realtimeDB} from "./firebaseApp.js";
import { currentLobbyId } from "./lobby.js";

const lobbyId = currentLobbyId;
const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);

realtimeDB.onValue(lobbyRef, (snapshot) => {
    const lobbyData = snapshot.val();
    
    

});
