import * as authentication from "./authentication.js";
import * as lobby from "./lobby.js";

const lobbyInfo = document.getElementById("lobbyInfo");
const lobbyId = new URLSearchParams(window.location.search).get("lobbyId");
const lobbyControls = document.querySelectorAll("#lobbyContainer button");

async function initializeLobbyPage() {
    if (!lobbyId) {
        lobbyInfo.textContent = "No lobby ID was provided. Return to the menu and join a lobby.";
        return;
    }

    try {
        const userId = await authentication.authenticateUser();
        const initialized = await lobby.initializeLobby(userId, lobbyId);
        if (!initialized) {
            lobbyInfo.textContent = "This lobby is unavailable or you are not a member. Return to the menu to join.";
            return;
        }
        lobbyControls.forEach((button) => {
            button.disabled = false;
        });
    } catch (error) {
        console.error("Failed to initialize the lobby page:", error);
        lobbyInfo.textContent = "Could not connect to the lobby. Please try again.";
    }
}

initializeLobbyPage();
