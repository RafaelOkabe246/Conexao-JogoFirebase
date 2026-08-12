import {bingoJoyHostManager, bingoJoyHostManager as bjManager} from './BingoJoyHostManager.js';
import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";


const TOTAL_CELLS = 20;
const NUMBERS_PER_ROUND = 3;
const ROUND_TIME = 10;

const state = {
    difficulty: null,
    maxLives: 3,
    lives: 3,
    round: 0,
    board: Array(TOTAL_CELLS).fill(null),
    usedNumbers: new Set(),
    currentOptions: [],
    selectedNumber: null,
    history: [],
    timer: ROUND_TIME,
    timerId: null,
    gameEnded: false
};

const boardEl = document.getElementById('board');
const ballsPanelEl = document.getElementById('ballsPanel');
const livesBarEl = document.getElementById('livesBar');
const timerBarEl = document.getElementById('timerBar');
const messageEl = document.getElementById('message');
const roundInfoEl = document.getElementById('roundInfo');
const historyBtn = document.getElementById('historyBtn');
const startOverlay = document.getElementById('startOverlay');
const easyBtn = document.getElementById('easyBtn');
const hardBtn = document.getElementById('hardBtn');
const modalOverlay = document.getElementById('modalOverlay');
const modalContent = document.getElementById('modalContent');

const lobbyId = getCurrentLobbyId(); //|| new URLSearchParams(window.location.search).get('lobbyId');
const database = realtimeDB.getDatabase();

const gameDataRef = realtimeDB.ref(database, `lobbies/${lobbyId}/GameData`);
const difficultyRef = realtimeDB.ref(database, `lobbies/${lobbyId}/GameData/difficulty`)
console.log("Game data path " + gameDataRef);

let isHost = false;

let _rounds;
let _playerRounds;

const MAX_NUMBER = 99;


async function initializeBingoUi() {
    isHost = await getIsHost();
    console.log("Is host " + isHost);
    
    if (!isHost) {
        easyBtn.style.display = 'none';
        hardBtn.style.display = 'none';
        ShowWaitScreen("Esperando o host", "O host está escolhendo a dificuldade da rodada.");
    }

    if(gameDataRef && isHost === false)    
    {
        console.log("Dificult data ref  " + difficultyRef.toString());

        
        realtimeDB.onValue(difficultyRef, (snapshot)=>{
            const response = snapshot.val().toString();
            console.log("GEer");
            if(response === "easy" || response === "hard"){

                startWithDifficultyClient(response);
            }
        });

    }
}

initializeBingoUi();


function heartSVG(){
    return `
    <svg viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        <defs>
        <linearGradient id="hg" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stop-color="#ff8fa0"/>
            <stop offset="55%" stop-color="#ff4b66"/>
            <stop offset="100%" stop-color="#d81740"/>
        </linearGradient>
        </defs>
        <path d="M32 56c-1.4 0-2.7-.5-3.8-1.4C14.6 43.1 6 35.4 6 22.7 6 14.6 12.5 8 20.5 8c4.8 0 9.3 2.2 11.5 6 2.2-3.8 6.7-6 11.5-6C51.5 8 58 14.6 58 22.7c0 12.7-8.6 20.4-22.2 31.9-1.1.9-2.4 1.4-3.8 1.4z" fill="url(#hg)" stroke="#dfeaff" stroke-width="3" />
    </svg>`;
}

function renderLives(){
    livesBarEl.innerHTML = '';
    for(let i=0;i<state.maxLives;i++){
    const d = document.createElement('div');
    d.className = 'heart' + (i >= state.lives ? ' lost' : '');
    d.innerHTML = heartSVG();
    livesBarEl.appendChild(d);
    }
}

function renderBoard(){
    boardEl.innerHTML = '';
    state.board.forEach((value, index) => {
    const cell = document.createElement('button');
    cell.className = 'cell' + (value === null ? ' empty' : ' filled');
    cell.textContent = value === null ? '' : String(value).padStart(2, '0');
    cell.dataset.index = index;
    cell.addEventListener('click', () => tryPlace(index));
    boardEl.appendChild(cell);
    });
    updateValidPositions();
}

function renderBalls(){
    ballsPanelEl.innerHTML = '';
    state.currentOptions.forEach((n) => {
    const btn = document.createElement('button');
    btn.className = 'ball' + (state.selectedNumber === n ? ' selected' : '');
    btn.innerHTML = `<div class="inner">${String(n).padStart(2,'0')}</div>`;
    btn.addEventListener('click', () => {
        if(state.gameEnded) return;
        state.selectedNumber = n;
        renderBalls();
        updateValidPositions();
        setMessage('Agora toque em um campo válido para posicionar o número.');
        playTone(560, .08, 'sine', .03);
    });
    ballsPanelEl.appendChild(btn);
    });
}

function getBoundsForIndex(index){
    let left = -Infinity;
    for(let i = index - 1; i >= 0; i--){
    if(state.board[i] !== null){ left = state.board[i]; break; }
    }
    let right = Infinity;
    for(let i = index + 1; i < TOTAL_CELLS; i++){
    if(state.board[i] !== null){ right = state.board[i]; break; }
    }
    return {left, right};
}

function isValidPlacement(num, index){
    if(state.board[index] !== null) return false;
    const {left, right} = getBoundsForIndex(index);
    return num > left && num < right;
}

function updateValidPositions(){
    [...boardEl.children].forEach((cell, index) => {
    cell.classList.remove('valid');
    if(state.selectedNumber !== null && isValidPlacement(state.selectedNumber, index)){
        cell.classList.add('valid');
    }
    });
}

function setMessage(text){ messageEl.textContent = text; }

//#region Build round options
function buildRoundOptions(count = NUMBERS_PER_ROUND, maxNumber = MAX_NUMBER){
    
    const options = _rounds[state.round - 1];

    return options;
}

function generateRoundSequence(roundCount, numbersPerRound, maxNumber = MAX_NUMBER){
    if(numbersPerRound < 1 || roundCount < 1){
        throw new Error('roundCount e numbersPerRound devem ser maiores que zero.');
    }
    if(roundCount * numbersPerRound > maxNumber){
        throw new Error(`Não é possível criar ${roundCount} rodadas de ${numbersPerRound} números sem repetir quando o máximo é ${maxNumber}.`);
    }

    const numbers = Array.from({length: maxNumber}, (_, i) => i + 1);
    for(let i = numbers.length - 1; i > 0; i--){
        const j = Math.floor(Math.random() * (i + 1));
        [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    const rounds = [];
    for(let r = 0; r < roundCount; r++){
        rounds.push(numbers.slice(r * numbersPerRound, (r + 1) * numbersPerRound));
        console.log("Rounds " +rounds[r]);
    }

    //Set Round in cloud
    realtimeDB.update(gameDataRef, {availableRounds: rounds});

    return rounds;
}
//#endregion

function startRound(){
    clearInterval(state.timerId);
    state.round += 1;
    state.currentOptions = buildRoundOptions().sort(() => Math.random() - .5);
    state.selectedNumber = null;
    state.timer = ROUND_TIME;
    roundInfoEl.textContent = `Rodada ${state.round}`;

    //Update at firebase
    realtimeDB.update(gameDataRef, {currentRound: state.round});

    renderBalls();
    renderBoard();
    updateTimerBar();
    setMessage('Escolha 1 entre os 3 números sorteados.');

    state.timerId = setInterval(() => {
    state.timer -= 0.1;
    if(state.timer <= 0){
        state.timer = 0;
        updateTimerBar();
        clearInterval(state.timerId);
        onRoundTimeout();
        return;
    }
    updateTimerBar();
    if(Math.abs(state.timer - Math.round(state.timer)) < 0.05 && state.timer <= 3.1){
        playTone(350, .04, 'square', .02);
    }
    }, 100);
}

function updateTimerBar(){
    const pct = Math.max(0, state.timer / ROUND_TIME) * 100;
    timerBarEl.style.width = pct + '%';
    timerBarEl.style.background = pct < 30
    ? 'linear-gradient(180deg,#ffb56d,#ff5c2b)'
    : 'linear-gradient(180deg,#8aff72,#2fd71d)';
}

function tryPlace(index){
    if(state.gameEnded || state.selectedNumber === null) return;

    if(!isValidPlacement(state.selectedNumber, index)){
    const cell = boardEl.children[index];
    cell.classList.add('invalidFlash');
    setTimeout(() => cell.classList.remove('invalidFlash'), 260);
    setMessage('Essa posição quebraria a ordem numérica da cartela.');
    playTone(180, .12, 'sawtooth', .04);
    return;
    }

    const chosen = state.selectedNumber;
    state.board[index] = chosen;
    state.usedNumbers.add(chosen);
    state.history.push(chosen);
    state.currentOptions.forEach(n => state.usedNumbers.add(n));
    state.selectedNumber = null;
    clearInterval(state.timerId);

    renderBoard();
    renderBalls();
    setMessage(`Número ${String(chosen).padStart(2,'0')} posicionado.`);
    playSuccess();

    if(state.board.every(v => v !== null)){
    endGame(true);
    return;
    }

    setTimeout(startRound, 420);
}

function onRoundTimeout(){
    state.currentOptions.forEach(n => state.usedNumbers.add(n));
    state.selectedNumber = null;
    state.lives -= 1;
    renderLives();
    playMiss();

    if(state.lives <= 0){
    endGame(false);
    } else {
    setMessage('Tempo esgotado. Você perdeu 1 vida.');
    setTimeout(startRound, 620);
    }
}

function showModal(title, body, buttonText='Fechar', onClose=null, hasButton = true){
    if(hasButton === false)
        {
    modalContent.innerHTML = `
    <h2>${title}</h2>
    ${body}
    `;
    }
    modalContent.innerHTML = `
    <h2>${title}</h2>
    ${body}
    <button id="modalAction">${buttonText}</button>
    `;

    modalOverlay.classList.add('show');
    document.getElementById('modalAction').onclick = () => {
    modalOverlay.classList.remove('show');
    if(onClose) onClose();
    };
}

function showHistory(){
    const list = state.history.length
    ? state.history.map(n => String(n).padStart(2,'0')).join(', ')
    : 'Nenhum número foi escolhido ainda.';
    showModal(
    'Histórico',
    `<p class="small">Números que já saíram nas rodadas:</p><div class="history-list">${list}</div>`,
    'Voltar'
    );
    playTone(480, .08, 'triangle', .02);
}

function endGame(win){
    clearInterval(state.timerId);
    state.gameEnded = true;
    const filled = state.board.filter(v => v !== null).length;

    playerEndedGame(win);

    console.log("End Game");

    ShowWaitScreen(
        win ? 'Você venceu!' : 'Game Over',
        `<p>Cartela completa em ordem numérica.</p><p class="small">
        Rodadas: <strong>${state.round}</strong><br>`
    );
    waitForEndGame();

}

async function waitForEndGame(){
    //Listen if the game ended
    realtimeDB.onValue(bjManager.GetGameStateRef(), (snapshot) => {
        const gameData = snapshot.val();
        if (gameData) {
            //Game ended, show the final screen
            console.log("Game ended, showing final screen");
            ShowEndGameScreen();
        }
    });
}

async function playerEndedGame(hasWon){
    try{
        await bjManager.ensureRefs();

        const playerRef = bjManager.GetPlayerRef();
        if (!playerRef) return;

        await realtimeDB.update(playerRef, {
            playerEndedGame: true,
            wonGame: hasWon
        });

        //Try to end the game if all players have ended
        await bingoJoyHostManager.endGame();
    }
    catch(error){
        console.error(error);
    }
}


function listenAllPlayers(){
    //realtimeDB.onValue()
}

function resetGame(){
    
    state.maxLives = state.difficulty === 'easy' ? 5 : 3;
    state.lives = state.maxLives;
    state.round = 0;
    state.board = Array(TOTAL_CELLS).fill(null);
    state.usedNumbers = new Set();
    state.currentOptions = [];
    state.selectedNumber = null;
    state.history = [];
    state.timer = ROUND_TIME;
    state.gameEnded = false;
    renderLives();
    renderBoard();
    startRound();
    
}

let audioCtx;
function ensureAudio(){
    if(!audioCtx){
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if(audioCtx.state === 'suspended') audioCtx.resume();
}

function playTone(freq=440, duration=.1, type='sine', volume=.03, when=0){
    ensureAudio();
    const now = audioCtx.currentTime + when;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.03);
}

function playSuccess(){
    playTone(520, .09, 'sine', .03, 0);
    playTone(700, .11, 'triangle', .03, .05);
    playTone(880, .14, 'triangle', .025, .1);
}
function playMiss(){
    playTone(250, .12, 'sawtooth', .04, 0);
    playTone(180, .18, 'square', .025, .06);
}
function playWinSound(){ [523,659,784,1047].forEach((f,i)=>playTone(f,.18,'triangle',.03,i*.07)); }
function playGameOverSound(){ [320,240,180].forEach((f,i)=>playTone(f,.22,'sawtooth',.03,i*.09)); }

historyBtn.addEventListener('click', showHistory);

function startWithDifficulty(mode){
if (!isHost) return;
    
    //Set the difficulty at game data
    realtimeDB.set(difficultyRef, mode);

    //Set the rounds based on the difficulty
    _rounds = generateRoundSequence(20,3);


    state.difficulty = mode;
    state.maxLives = mode === 'easy' ? 5 : 3;
    state.lives = state.maxLives;
    ensureAudio();
    startOverlay.classList.remove('show');
    renderLives();
    renderBoard();
    startRound();
    playTone(480,.08,'triangle',.03,0);
    playTone(620,.08,'triangle',.03,.06);

    bingoJoyHostManager.SetGameState('playing');
}

async function startWithDifficultyClient(mode){
    const roundsSnapshot = await realtimeDB.get(realtimeDB.child(gameDataRef, 'availableRounds'));
    _rounds = roundsSnapshot.exists() ? roundsSnapshot.val() : [];
    console.log('Rounds loaded from Firebase:', _rounds);

    state.difficulty = mode;
    state.maxLives = mode === 'easy' ? 5 : 3;
    state.lives = state.maxLives;
    ensureAudio();
    startOverlay.classList.remove('show');
    renderLives();
    renderBoard();
    startRound();
    playTone(480,.08,'triangle',.03,0);
    playTone(620,.08,'triangle',.03,.06);

    //Set the difficulty at game data
    realtimeDB.set(difficultyRef, mode);

}

function ShowWaitScreen(tile, body){
    modalOverlay.classList.add('show');
    modalContent.innerHTML = 
    `<div class="overlay-card"><h2>${tile}</h2><p>${body}</p></div>`;

}

function ShowEndGameScreen(){
    startOverlay.classList.remove('show');

    if(!bingoJoyHostManager.GetIsHost()) {
        ShowWaitScreen('Fim de jogo', `<p>Todos os jogadores terminaram o jogo.</p><p class="small">Aguarde o host iniciar uma nova partida.</p>`);
        bingoJoyHostManager.waitHostRestartGame();
    } else {
        showModal(
            'Fim de jogo',
            `<p>Todos os jogadores terminaram o jogo.</p><p class="small">Clique no botão abaixo para iniciar uma nova partida.</p>`,
            'Iniciar nova partida',
            async () => {
                await bingoJoyHostManager.resetGameForAllPlayers();
                    modalOverlay.classList.remove('show');

                startOverlay.classList.add('show');

            }
        );
    }
}



easyBtn.addEventListener('click', () => startWithDifficulty('easy'));
hardBtn.addEventListener('click', () => startWithDifficulty('hard'));





renderLives();
renderBoard();
