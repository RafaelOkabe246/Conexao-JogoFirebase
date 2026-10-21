
import {sevenPlayerManager as playerManager} from './Sevens-PlayerManager.js';
import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";

const database = realtimeDB.getDatabase();
const lobbyId = getCurrentLobbyId();
const gameDataRef = realtimeDB.ref(database, `lobbies/${lobbyId}/GameData`);
const gameStatusRef = realtimeDB.ref(database, `lobbies/${lobbyId}/status`);
const playersRef = realtimeDB.ref(database, `lobbies/${lobbyId}/players`);
const isHost = await getIsHost();

let hasGameEnded = false;

//#region Buttons
const startButton = document.getElementById('startButton');
const discardButton = document.getElementById('discardButton');
const restartButton = document.getElementById('restartButton');

discardButton.addEventListener('click', () => {
  console.log("Discard button clicked. Discarding the current card...");
  discardCard();
});

function handleRestartButtonClick() {

  restartButton.addEventListener('click', async () => {
    console.log("Restart button clicked. Restarting the game...");
    if(isHost){
      restartGame();
      await updateGameStatus('playing');
    }else{
      alert("Aguarde o host reiniciar o jogo.");
    }
    
  });
}
handleRestartButtonClick();

console.log("DDetected start button:", startButton);
if(isHost) {
  startButton.addEventListener('click', async () => {
    console.log("Start button clicked by host. Starting the game...");  
    await startGameAsHost();
  });
}
else{
  startButton.style.display = 'none';
}



//#endregion

const suits=['♠','♥','♦','♣'];
const values=['A','2','3','4','5','6','7','8','9','10','J','Q','K'];

let deck=[];
let currentCard=null;
let selectedReserveCard=null;
let rows=[];
let discard=[];
let completed=0;
let ranking=JSON.parse(localStorage.getItem('sevensRanking')) || {
 totalScore:0,
 bestScore:0,
 matches:0
};

handleLobbyUpdate();

//#region Game events listeners
  async function handleLobbyUpdate(){
    console.log('Lobby update received:');
    
    if(gameStatusRef && !(await getIsHost())){
      console.log('Client listening for game status updates...');
      realtimeDB.onValue(gameStatusRef, (snapshot) => {
        const response = snapshot.val().toString();
        console.log('Game status updated:', response);
        
        if (response === 'playing'){
          console.log('Game status is now playing. Starting the game...');
          startGame();
        }
      });
    } 

  if((await getIsHost())){
      console.log('Host listening for game status updates...');
      if(await playerManager.allPlayersEndedGame()){
        //console.log('All players have ended the game. Can start the game...');
        hasGameEnded = true;
        updateGameStatus('ended');
      }
  }
  }

async function updateGameStatus(status){
    if(gameStatusRef && isHost){
    console.log('Updating game status in the database...');
    await realtimeDB.set(gameStatusRef, status);
    console.log('Game status updated:', status);
    }
}
  

//#endregion

function createDeck(){
 deck=[];
 for(let s of suits){
  for(let i=0;i<values.length;i++){
   deck.push({
    suit:s,
    value:values[i],
    rank:i+1,
    color:(s==='♥'||s==='♦')?'red':'black'
   });
  }
 }
 shuffle(deck);
}

function shuffle(a){
 for(let i=a.length-1;i>0;i--){
  const j=Math.floor(Math.random()*(i+1));
  [a[i],a[j]]=[a[j],a[i]];
 }
}

function drawCard(){
 if(currentCard) return;

 if(deck.length<=0){
  endGame(completed>=7);
  return;
 }

 currentCard=deck.pop();
 renderCurrentCard();
 updateScore();
}

function cardHTML(card,extra=''){
 return `<div class="card ${card.color} ${extra}">${card.value}<span style="position:absolute;bottom:3px;font-size:12px">${card.suit}</span></div>`;
}

function renderRows(){
 const rowsEl=document.getElementById('rows');
 rowsEl.innerHTML='';

 rows.forEach((row,index)=>{
  const rowEl=document.createElement('div');
  rowEl.className='row';

  const slot=document.createElement('div');
  slot.className='slot';
  slot.onclick=()=>attemptPlace(index);

  row.cards.forEach(c=>{
   slot.innerHTML += cardHTML(c);
  });

  const indicator=document.createElement('div');
  indicator.className='seven-indicator';

  if(index < completed){
   indicator.classList.add('seven-complete');
   indicator.innerHTML='7';
  } else {
   indicator.innerHTML='';
  }

  rowEl.appendChild(slot);
  rowEl.appendChild(indicator);

  rowsEl.appendChild(rowEl);
 });
}

function renderCurrentCard(){
 const el=document.getElementById('currentCard');
 if(currentCard){
  el.innerHTML=cardHTML(currentCard,'main-card');
 }else{
  el.innerHTML='';
 }
}

function renderDiscard(){
 const el=document.getElementById('discardZone');
 el.innerHTML='';

 discard.forEach((c,index)=>{
  const wrapper=document.createElement('div');
  wrapper.innerHTML=cardHTML(c);

  const cardEl=wrapper.firstElementChild;
  cardEl.style.cursor='pointer';

  if(selectedReserveCard===c){
    cardEl.style.transform='translateY(-10px) scale(1.08)';
    cardEl.style.boxShadow='0 0 12px #00ff88';
    cardEl.style.zIndex='5';
  }

  if(index < discard.length-1){
    cardEl.style.opacity='0.85';
  }

  cardEl.onclick=()=>{
    if(selectedReserveCard===c){
      selectedReserveCard=null;
    } else {
      selectedReserveCard=c;
    }

    renderDiscard();
  };

  el.appendChild(cardEl);
 });
}

function canConnect(a,b){
 if(Math.abs(a.rank-b.rank)===1) return true;
 if((a.rank===1 && b.rank===13)||(a.rank===13 && b.rank===1)) return true;
 return false;
}

function validatePlacement(row,card){
 if(row.cards.length===0) return true;
 if(row.cards.length>=5) return false;

 const last=row.cards[row.cards.length-1];
 return canConnect(card,last);
}

function insertCard(row,card){
 row.cards.push(card);
}

//#region Sound 

function playTone(freq,duration=120,type='sine',volume=0.03){
 const ctx=new (window.AudioContext||window.webkitAudioContext)();
 const osc=ctx.createOscillator();
 const gain=ctx.createGain();

 osc.type=type;
 osc.frequency.value=freq;
 gain.gain.value=volume;

 osc.connect(gain);
 gain.connect(ctx.destination);

 osc.start();

 setTimeout(()=>{
  osc.stop();
  ctx.close();
 },duration);
}

function playPlaceSound(){
 playTone(520,120,'triangle');
}

function playDiscardSound(){
 playTone(220,120,'square');
}

function playWinSound(){
 playTone(523,180);
 setTimeout(()=>playTone(659,180),180);
 setTimeout(()=>playTone(784,260),360);
}

function playLoseSound(){
 playTone(280,180,'sawtooth');
 setTimeout(()=>playTone(180,260,'sawtooth'),180);
}

function startBackgroundMusic(){
 if(window.bgMusicStarted) return;
 window.bgMusicStarted=true;

 setInterval(()=>{
  playTone(220,220,'sine',0.01);
  setTimeout(()=>playTone(330,220,'sine',0.01),250);
  setTimeout(()=>playTone(262,220,'sine',0.01),500);
 },2200);
}

//#endregion

function attemptPlace(index){
 const row=rows[index];

 let cardToUse=currentCard;
 let usingReserve=false;

 if(selectedReserveCard){
  cardToUse=selectedReserveCard;
  usingReserve=true;
 }

 if(!cardToUse) return;

 if(validatePlacement(row,cardToUse)){
  insertCard(row,cardToUse);
  playPlaceSound();

  if(usingReserve){
   discard = discard.filter(card => card !== selectedReserveCard);
   selectedReserveCard=null;
   renderDiscard();
  } else {
   currentCard=null;
  }

  if(row.cards.length===5 && !row.complete){
   row.complete=true;
   completed++;

   renderRows();

   setTimeout(()=>{
    row.cards=[];
    row.complete=false;
    renderRows();
   },700);
  }

  renderRows();

  if(!currentCard){
   drawCard();
 } else {
   renderCurrentCard();
   updateScore();
 }

 if(deck.length===0 && !currentCard){
   endGame(completed>=7);
   return;
 }

  if(completed>=7){
   endGame(true);
  }
 } else {
  document.getElementById('game').style.animation='shake .25s';
  setTimeout(()=>{
   document.getElementById('game').style.animation='';
  },250);
  playTone(140,160,'sawtooth');
  flashMessage('Encaixe inválido');
 }
}

function discardCard(){
 if(!currentCard) return;

 discard.push(currentCard);
 playDiscardSound();
 currentCard=null;
 renderDiscard();

 if(discard.length>=5){
  endGame(false);
  return;
 }

 drawCard();
}

function updateScore(){
 document.getElementById('score').innerText=deck.length;
}

 async function endGame(win){
 let finalScore = win ? Math.max(deck.length - discard.length,0) : 0;

 if(win){
  playWinSound();
  ranking.totalScore += finalScore;
  ranking.bestScore=Math.max(ranking.bestScore,finalScore);
  ranking.matches += 1;
  localStorage.setItem('sevensRanking',JSON.stringify(ranking));
 }

 if(!win){
  playLoseSound();
 }

     //Update player status in the database
    await playerManager.updatePlayerStatus(true);
    await handleLobbyUpdate();

    
 

  const msg=document.getElementById('message');
  msg.style.display='flex';
    if(isHost){
      console.log("Host showing end game screen...");
      //Show host screen
       msg.innerHTML=`
  <div class="panel">
  <h2 style="font-size:34px;margin-top:0;">${win?'Vitória!':'Fim de jogo'}</h2>
  <div style="margin-top:18px;font-size:20px;line-height:1.8;">
  <div style="color:#6dff9b;font-weight:bold;">Cartas restantes: ${deck.length}</div>
  <div style="color:#ff7a7a;font-weight:bold;">Cartas reserva: ${discard.length}</div>
  <div style="margin-top:10px;font-size:26px;font-weight:bold;color:#fff;">
  Pontuação Final: ${deck.length}-${discard.length} = ${finalScore}
  </div>
  </div>
  <button id="restartButton" style="margin-top:12px;padding:14px 26px;font-size:18px;border-radius:14px;background:#00b95a;color:white;border:none;font-weight:bold;">
  Jogar Novamente
  </button>
  </div>
  `;
    msg.querySelector('#endGameRestartButton')
  .addEventListener('click', handleRestartButtonClick);

    }else{
      //Show player client screen
      msg.innerHTML=`
  <div class="panel">
  <h2 style="font-size:34px;margin-top:0;">${win?'Vitória!':'Fim de jogo'}</h2>
  <div style="margin-top:18px;font-size:20px;line-height:1.8;">
  <div style="color:#6dff9b;font-weight:bold;">Cartas restantes: ${deck.length}</div>
  <div style="color:#ff7a7a;font-weight:bold;">Cartas reserva: ${discard.length}</div>
  <div style="margin-top:10px;font-size:26px;font-weight:bold;color:#fff;">
  Pontuação Final: ${deck.length}-${discard.length} = ${finalScore}
  </div>
  </div>
  <p style="margin-top:12px;padding:14px 26px;font-size:18px;border-radius:14px;background:#00b95a;color:white;border:none;font-weight:bold;">
  Esperando outros jogadores terminarem...
  </p>
  <p style="margin-top:12px;padding:14px 26px;font-size:18px;border-radius:14px;background:#00b95a;color:white;border:none;font-weight:bold;">
  </P>
  </div>
  `;
    }

}

function flashMessage(text){
 const msg=document.getElementById('message');
 msg.style.display='flex';
 msg.innerHTML=`<p>${text}</p>`;
 setTimeout(()=>{
  msg.style.display='none';
 },1000);
}

function restartGame(){
 rows=[];
 discard=[];
 completed=0;
 currentCard=null;
 selectedReserveCard=null;

 for(let i=0;i<7;i++){
  rows.push({cards:[],complete:false});
 }

 document.getElementById('message').style.display='none';
 document.getElementById('message').innerHTML='';

 createDeck();
 renderRows();
 renderDiscard();
 drawCard();
}


async function startGameAsHost(){
    await updateGameStatus('playing');
    startGame();
}

function startGame(){
 startBackgroundMusic();
 document.getElementById('startScreen').style.display='none';
 restartGame();
}

restartGame();