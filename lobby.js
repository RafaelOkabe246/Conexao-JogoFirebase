import {realtimeDataBaseMethods as realtimeDB} from "./firebaseApp.js";
import * as authentication from "./authentication.js";
import * as menu from "./menu.js";

let currentLobbyId = null; // Store the current lobby ID

let isHost = false; // Store whether the current user is the host

export function getCurrentLobbyId() {
    if (!currentLobbyId && typeof window !== 'undefined') {
        currentLobbyId = new URLSearchParams(window.location.search).get('lobbyId');
    }
    console.log("Current lobby " + currentLobbyId);
    return currentLobbyId;
}

export function setCurrentLobbyId(lobbyId) {
    currentLobbyId = lobbyId;
}

export async function createLobby() {

    const userId = authentication.getUserId();


      // Generate a 4-digit code (can be improved to avoid collisions)
    const lobbyId = Math.floor(1000 + Math.random() * 9000).toString();
    
    const roomRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);
    


    //const playersRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}/players`);
        // Keep generating until we find an unused code

    
    // Check if room already exists (very unlikely, but just in case)
    

    const lobbyData = {
        host: userId,
        players: {
            [userId]: {
                ready: false
            }
        },
        status: "waiting",
        miniGame: "default",
        GameState: "default",
        GameData: {}
    };
    console.log(`Room ref ${roomRef} created for lobby ${lobbyId}`);
    console.log(`Creating lobby with ID: ${lobbyId} and data: `, lobbyData);
    
    await realtimeDB.set(roomRef, lobbyData)
        .then(() => {
            console.log(`Lobby ${lobbyId} created successfully.`);
            // Redirect to lobby page or update UI accordingly
        })
        .catch((error) => {
            console.error(`Error creating lobby ${lobbyId}:`, error);
        });

    
    joinLobby(userId, lobbyId).then((success) => {
        if (success) {
            console.log(`Successfully joined lobby ${lobbyId}`);
            currentLobbyId = lobbyId;
            setCurrentLobbyId(lobbyId);

            // Redirect to lobby page or update UI accordingly
        } else {
            console.error(`Failed to join lobby ${lobbyId}`);
        }});   

}

export async function joinLobby(userId, lobbyId) {
    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);

    //Check if room exists
    const roomSnapshot = await realtimeDB.get(lobbyRef);
    if(!roomSnapshot.exists()) {
        console.error(`Lobby ${lobbyId} does not exist.`);
        return;
    }

    const roomData = roomSnapshot.val();

    // Check if game already started, if so, prevent joining
    if (roomData.status === 'playing') {
        alert('Game already started!');
        return false;
    }


    // Add player to the room
    await realtimeDB.update(lobbyRef, {
        [`players/${userId}`]: true
    });

    //Verify is is host
    if (roomData.host === userId) {
        isHost = true;
    }

    // Start listening for changes in the room
    realtimeDB.onValue(lobbyRef, (snapshot) => {
        const updatedRoomData = snapshot.val();
        console.log(`Lobby ${lobbyId} updated:`, updatedRoomData);
        
        // Here you can update your UI based on the new room data


        //Only host can start the game, so check if current user is host
        if (isHost) {
            //Check if all players are ready, if so, start the game (if has just host wait)
            let allReady = checkAllPlayersReady(lobbyRef, updatedRoomData);
            console.log("WRRERW");
            if(allReady) {
                console.log('All players are ready. Starting the game...');
                menu.showStartGameButton();
            }
            
        }


        //Listen if game started, if so, redirect to game page
        if (updatedRoomData.status === 'playing') {
            console.log('Game started! Redirecting to game page...');
            currentLobbyId = lobbyId;
            setCurrentLobbyId(lobbyId);
            window.location.href = `./Minigames/Bingojoy/BingoJoy.html?lobbyId=${lobbyId}`;
        }

        

    });


    return true;
}


export async function getIsHost(){
    const lobbyId = getCurrentLobbyId();
    if (!lobbyId) {
        return false;
    }

    setCurrentLobbyId(lobbyId);

    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);
    const snapshot = await realtimeDB.get(lobbyRef);

    if (!snapshot.exists()) {
        return false;
    }

    const roomData = snapshot.val();
    const userId = await authentication.waitForUserId();

    if (!userId) {
        return false;
    }

    return roomData.host === userId;
}

export async function getCurrrentLobbyId(){
    const lobbiesRef = realtimeDB.ref(realtimeDB.getDatabase(), "lobbies");
    const snapshot = await realtimeDB.get(lobbiesRef);

    if (snapshot.exists()) {
        const lobbies = snapshot.val();

        for (const lobbyId in lobbies) {
            const players = lobbies[lobbyId]?.players || {};
            if (players[userId]) {
                console.log("Found lobby:", lobbyId);
                return lobbyId;
            }
        }
    }
}


export async function leaveLobby(userId, lobbyId) {
    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);

    // Remove player from the room
    await realtimeDB.update(lobbyRef, {
        [`players/${userId}`]: null
    });

    //Disconect from the room
    realtimeDB.onDisconnect(lobbyRef).remove();
}

export async function toggleReadyStatus() {
    
    const lobbyId = currentLobbyId; // Assuming you have a way to get the current lobby ID
    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);
    const userId = authentication.getUserId();

    const snapshot = await realtimeDB.get(lobbyRef);
    
    const currentReady = snapshot.val().players[userId].ready;

    console.log('Toggling ready state to:', !currentReady);
  
    // Update only the ready field for this player
    
    await realtimeDB.update(realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}/players/${userId}`), {
        ready: !currentReady
    });
    
}


function checkAllPlayersReady(lobbyRef, updatedRoomData) {
        const allReady = Object.values(updatedRoomData.players).every(player => player.ready);
    return allReady;
}

export function enterLobbyCode(roomCode){

    const userId = authentication.getUserId();
    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${roomCode}`);
    if(!lobbyRef) {
        alert('Lobby does not exist!');
        return false;
    }

    currentLobbyId = roomCode;
    setCurrentLobbyId(roomCode);

    //Enter the lobby
    joinLobby(userId, roomCode).then((success) => {
        if (success) {
            console.log(`Successfully joined lobby ${roomCode}`);
            // Redirect to lobby page or update UI accordingly
            return true;
        } else {
            console.error(`Failed to join lobby ${roomCode}`);
            return false;
        }
    });
}


export async function cleanupOldRooms() {
  const lobbiesRef = realtimeDB.ref(realtimeDB.getDatabase(), 'lobbies');
  const snapshot = await realtimeDB.get(lobbiesRef);
  
  if (!snapshot.exists()) return;
  
  const lobbies = snapshot.val();
  
  for (const lobbyCode in lobbies) {
    const lobby = lobbies[lobbyCode];
    
    // Remove lobbies older than 1 hour that are still waiting
          await realtimeDB.remove(realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyCode}`));

  }
}

export async function startGame() {
    const lobbyId = currentLobbyId;
    const lobbyRef = realtimeDB.ref(realtimeDB.getDatabase(), `lobbies/${lobbyId}`);

    // Update the lobby status to 'playing'
    await realtimeDB.update(lobbyRef, {
        status: 'playing'
    });
}
