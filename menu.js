import * as authentication from "./authentication.js";
import {realtimeDataBaseMethods as realtimeDB} from "./firebaseApp.js";
import * as lobby from "./lobby.js";

const authenticateBtn = document.getElementById("authenticateBtn");
const createLobbyBtn = document.getElementById("createLobbyBtn");
const joinLobbyBtn = document.getElementById("joinLobbyBtn");
const readyBtn = document.getElementById("readyBtn");
const cleanupBtn = document.getElementById("cleanupBtn");
const startGameBtn = document.getElementById("startGameBtn");

const lobbyContainer = document.getElementById("lobbyContainer");

createLobbyBtn.style.display = "none";
joinLobbyBtn.style.display = "none";
readyBtn.style.display = "none";
cleanupBtn.style.display = "none";
startGameBtn.style.display = "none";

if(authenticateBtn) {
    authenticateBtn.addEventListener("click", () => {
        authentication.authenticateUser();

        createLobbyBtn.style.display = "block";
        joinLobbyBtn.style.display = "block";
        readyBtn.style.display = "block";
        cleanupBtn.style.display = "block";
    });
}
if(createLobbyBtn) {
    createLobbyBtn.addEventListener("click", async () => {
        await lobby.createLobby();
        lobbyContainer.style.display = "block";
    });
}

if(joinLobbyBtn) {
    console.log("Join lobby button found");
    joinLobbyBtn.addEventListener("click", async () => {
        console.log("Join lobby button clicked");

        const roomCode = document.getElementById("roomCodeInput").value;
        let response = await lobby.enterLobbyCode(roomCode);
        if(response === true) {
            console.log("Successfully joined the lobby with code:", roomCode);
        }
        lobbyContainer.style.display = "block";

    });
}


if(readyBtn) {
    readyBtn.addEventListener("click", () => {
        lobby.toggleReadyStatus();
    });
}

if(cleanupBtn) {
    cleanupBtn.addEventListener("click", async () => {
        await lobby.cleanupOldRooms();
    });
}

if(startGameBtn) {
    startGameBtn.addEventListener("click", () => {
        lobby.startGame();
    });
}

export function showStartGameButton() {
    startGameBtn.style.display = "block";
}