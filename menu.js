import * as authentication from "./authentication.js";
import {realtimeDataBaseMethods as realtimeDB} from "./firebaseApp.js";
import * as lobby from "./lobby.js";

const authenticateBtn = document.getElementById("authenticateBtn");
const createLobbyBtn = document.getElementById("createLobbyBtn");
const joinLobbyBtn = document.getElementById("joinLobbyBtn");
const readyBtn = document.getElementById("readyBtn");
const cleanupBtn = document.getElementById("cleanupBtn");
const startGameBtn = document.getElementById("startGameBtn");
const lobbyIdDisplay = document.getElementById("lobbyId");

const lobbyContainer = document.getElementById("lobbyContainer");

//===================================
const minigamesOptionsContainer = document.getElementById("minigames-options-container");

const bingoJoyBtn = document.getElementById("bingoJoyBtn");

function setDisplay(element, value) {
    if (element) {
        element.style.display = value;
    }
}

//===================================

setDisplay(joinLobbyBtn, "none");
setDisplay(createLobbyBtn, "none");
setDisplay(readyBtn, "none");
setDisplay(cleanupBtn, "none");
setDisplay(startGameBtn, "none");
setDisplay(lobbyIdDisplay, "none");

if(authenticateBtn) {
    authenticateBtn.addEventListener("click", async () => {
        await authentication.authenticateUser();

        setDisplay(createLobbyBtn, "block");
        setDisplay(joinLobbyBtn, "block");
        setDisplay(readyBtn, "block");
        setDisplay(cleanupBtn, "block");
    });
}
if(createLobbyBtn) {
    createLobbyBtn.addEventListener("click", async () => {
        await lobby.createLobby();
        setDisplay(lobbyContainer, "block");
        setDisplay(lobbyIdDisplay, "block");
        lobbyIdDisplay.textContent = await `Lobby Id: ${lobby.getCurrentLobbyId()}`;
    });
}

if(joinLobbyBtn) {
    console.log("Join lobby button found");
    joinLobbyBtn.addEventListener("click", async () => {
        console.log("Join lobby button clicked");

        const roomCodeInput = document.getElementById("roomCodeInput");
        const roomCode = roomCodeInput ? roomCodeInput.value : "";
        let response = await lobby.enterLobbyCode(roomCode);
        if(response === true) {
            console.log("Successfully joined the lobby with code:", roomCode);
        }
        setDisplay(lobbyContainer, "block");

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

if(bingoJoyBtn){
}

export function showStartGameButton() {
    setDisplay(startGameBtn, "block");
}



