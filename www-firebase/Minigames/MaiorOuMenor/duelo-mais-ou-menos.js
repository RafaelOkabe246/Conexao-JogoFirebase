import {realtimeDataBaseMethods as realtimeDB} from "../../firebaseApp.js";
import { getCurrentLobbyId, getIsHost } from "../../lobby.js";


(() => {
  const suits = [
    { symbol: '♥', color: 'red' },
    { symbol: '♦', color: 'red' },
    { symbol: '♣', color: 'black' },
    { symbol: '♠', color: 'black' }
  ];

  const rankOrder = [
    { key: 'A', value: 1 }, { key: '2', value: 2 }, { key: '3', value: 3 },
    { key: '4', value: 4 }, { key: '5', value: 5 }, { key: '6', value: 6 },
    { key: '7', value: 7 }, { key: '8', value: 8 }, { key: '9', value: 9 },
    { key: '10', value: 10 }, { key: 'J', value: 11 }, { key: 'Q', value: 12 },
    { key: 'K', value: 13 }
  ];

  const el = {
    intro: document.getElementById('introScreen'),
    game: document.getElementById('gameScreen'),
    result: document.getElementById('resultScreen'),
    playBtn: document.getElementById('playBtn'),
    restartBtn: document.getElementById('restartBtn'),
    totalScore: document.getElementById('totalScore'),
    deckCount: document.getElementById('deckCount'),
    openCards: document.getElementById('openCards'),
    higherBtn: document.getElementById('higherBtn'),
    lowerBtn: document.getElementById('lowerBtn'),
    stopBtn: document.getElementById('stopBtn'),
    timerFill: document.getElementById('timerFill'),
    streakLabel: document.getElementById('streakLabel'),
    bankLabel: document.getElementById('bankLabel'),
    multiplier: document.getElementById('multiplier'),
    message: document.getElementById('message'),
    tableInner: document.getElementById('tableInner'),
    streakChip: document.getElementById('streakChip'),
    bankChip: document.getElementById('bankChip'),
    deckCard: document.getElementById('deckCard'),
    deckShadow1: document.getElementById('deckShadow1'),
    deckShadow2: document.getElementById('deckShadow2'),
    scoreboard: document.getElementById('scoreboard'),
    finalPoints: document.getElementById('finalPoints'),
    winnerText: document.getElementById('winnerText'),
    historyBtn: document.getElementById('historyBtn'),
    historyModal: document.getElementById('historyModal'),
    closeHistoryBtn: document.getElementById('closeHistoryBtn'),
    endgameBonus: document.getElementById('endgameBonus'),
    endgameBonusText: document.getElementById('endgameBonusText'),
    historyGrid: document.getElementById('historyGrid')
  };

  let deck = [];
  let openPile = [];
  let fullHistory = [];
  let totalScore = 0;
  let streak = 0;
  let bank = 0;
  let locked = false;
  let historyOpen = false;
  let timerInterval = null;
  const TURN_MS = 15000;

  let audioCtx = null;
  let bgmInterval = null;
  let bgmEnabled = true;

  function ensureAudio(){
    if(!audioCtx){
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if(Ctx) audioCtx = new Ctx();
    }
    if(audioCtx && audioCtx.state === 'suspended'){
      audioCtx.resume();
    }
  }

  function tone({freq=440, type='sine', duration=0.12, gain=0.03, attack=0.005, release=0.05, when=0, detune=0, destination=null}){
    if(!audioCtx) return;
    const start = audioCtx.currentTime + when;
    const end = start + duration;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if(detune) osc.detune.setValueAtTime(detune, start);
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, end + release);
    osc.connect(g);
    g.connect(destination || audioCtx.destination);
    osc.start(start);
    osc.stop(end + release + 0.01);
  }

  function noiseBurst({duration=0.12, gain=0.02, filterFreq=1200, when=0}){
    if(!audioCtx) return;
    const buffer = audioCtx.createBuffer(1, Math.floor(audioCtx.sampleRate * duration), audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for(let i=0;i<data.length;i++){ data[i] = (Math.random()*2 - 1) * (1 - i/data.length); }
    const src = audioCtx.createBufferSource();
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const g = audioCtx.createGain();
    const start = audioCtx.currentTime + when;
    src.buffer = buffer;
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    src.connect(filter);
    filter.connect(g);
    g.connect(audioCtx.destination);
    src.start(start);
    src.stop(start + duration);
  }

  function playCorrectSound(level){
    ensureAudio();
    if(!audioCtx) return;
    const capped = Math.min(level, 8);
    const vol = 0.08 + capped * 0.012;
    const base = 470 + capped * 24;
    tone({freq: base, type:'triangle', duration:0.08, gain:vol});
    tone({freq: base * 1.25, type:'triangle', duration:0.1, gain:vol * 0.85, when:0.055});
    tone({freq: base * 1.5, type:'sine', duration:0.13, gain:vol * 0.7, when:0.11});
  }

  function playWrongSound(){
    ensureAudio();
    if(!audioCtx) return;
    tone({freq:220, type:'sawtooth', duration:0.12, gain:0.12});
    tone({freq:150, type:'sawtooth', duration:0.16, gain:0.1, when:0.06});
    noiseBurst({duration:0.08, gain:0.035, filterFreq:800, when:0.02});
  }

  function playBankSound(points){
    ensureAudio();
    if(!audioCtx) return;
    const p = Math.max(1, Math.min(points, 6));
    for(let i=0;i<p;i++){
      tone({freq:600 + i*65, type:'sine', duration:0.09, gain:0.03, when:i*0.05});
    }
  }

  function playTimeoutSound(){
    ensureAudio();
    if(!audioCtx) return;
    tone({freq:310, type:'square', duration:0.1, gain:0.035});
    tone({freq:240, type:'square', duration:0.14, gain:0.03, when:0.09});
  }

  function playClickSound(){
    ensureAudio();
    if(!audioCtx) return;
    tone({freq:520, type:'triangle', duration:0.045, gain:0.018});
  }

  function startBGM(){
    ensureAudio();
    stopBGM();
    if(!audioCtx || !bgmEnabled) return;
    const progression = [196, 246.94, 220, 293.66, 196, 246.94, 164.81, 220];
    let step = 0;
    bgmInterval = setInterval(() => {
      if(!audioCtx || document.hidden) return;
      const root = progression[step % progression.length];
      tone({freq:root, type:'sine', duration:0.55, gain:0.035});
      tone({freq:root * 1.5, type:'triangle', duration:0.42, gain:0.008, when:0.06});
      tone({freq:root * 2, type:'sine', duration:0.18, gain:0.004, when:0.20});
      step++;
    }, 620);
  }

  function stopBGM(){
    if(bgmInterval){
      clearInterval(bgmInterval);
      bgmInterval = null;
    }
  }

  function animateHit(kind){
    if(kind === 'correct'){
      el.tableInner.classList.remove('glow-correct');
      void el.tableInner.offsetWidth;
      el.tableInner.classList.add('glow-correct');
    }else if(kind === 'wrong'){
      el.tableInner.classList.remove('glow-wrong');
      void el.tableInner.offsetWidth;
      el.tableInner.classList.add('glow-wrong');
    }
  }

  function animateDeck(){
    [el.deckCard, el.deckShadow1, el.deckShadow2].forEach(node => {
      if(!node) return;
      node.classList.remove('deck-bounce');
      void node.offsetWidth;
      node.classList.add('deck-bounce');
    });
  }

  function animateButton(btn){
    btn.classList.remove('pulse');
    void btn.offsetWidth;
    btn.classList.add('pulse');
  }

  function animateMultiplier(){
    el.multiplier.classList.remove('pop');
    void el.multiplier.offsetWidth;
    el.multiplier.classList.add('pop');
  }

  function animateScore(){
    el.totalScore.classList.remove('score-pop');
    void el.totalScore.offsetWidth;
    el.totalScore.classList.add('score-pop');
  }

  function animateBank(){
    el.bankChip.classList.remove('bank-pop');
    void el.bankChip.offsetWidth;
    el.bankChip.classList.add('bank-pop');
  }

  function stopTurnTimer(){
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  function renderTurnTimer(progress = 1){
    const clamped = Math.max(0, Math.min(1, progress));
    el.timerFill.style.width = `${clamped * 100}%`;
    el.timerFill.classList.toggle('warning', clamped <= 0.35);
  }

  function startTurnTimer(){
    stopTurnTimer();
    const startedAt = performance.now();
    renderTurnTimer(1);

    timerInterval = setInterval(() => {
      const elapsed = performance.now() - startedAt;
      const remaining = Math.max(0, TURN_MS - elapsed);
      const progress = remaining / TURN_MS;
      renderTurnTimer(progress);

      if (remaining <= 0) {
        stopTurnTimer();
        handleTimeout();
      }
    }, 80);
  }

  function buildDeck(){
    const cards = [];
    for (const rank of rankOrder){
      for (const suit of suits){
        cards.push({ rank: rank.key, value: rank.value, suit: suit.symbol, color: suit.color });
      }
    }
    return shuffle(cards);
  }

  function shuffle(arr){
    const a = [...arr];
    for(let i=a.length-1; i>0; i--){
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  function showScreen(screen){
    [el.intro, el.game, el.result].forEach(s => s.classList.remove('active'));
    screen.classList.add('active');
  }

  function format2(n){ return String(n).padStart(2,'0'); }

  function cardHTML(card, idx, total){
    const offset = idx * 18;
    const z = idx + 1;
    return `
      <div class="playing-card ${card.color} card-enter" style="left:${offset}px; top:0; z-index:${z}; transform:rotate(${(idx-total/2)*1.6}deg)">
        <div class="corner">${card.rank}</div>
        <div class="suit-center">${card.suit}</div>
      </div>`;
  }

  function renderOpenCards(lastOutcome = null){
    const recent = openPile.slice(-4);
    el.openCards.innerHTML = recent.map((card, idx) => cardHTML(card, idx, recent.length)).join('');
    if(lastOutcome && el.openCards.lastElementChild){
      el.openCards.lastElementChild.classList.add(lastOutcome === 'correct' ? 'correct-bump' : 'wrong-shake');
    }
    if (historyOpen) renderHistory();
  }


  function miniCardHTML(card){
    return `
      <div class="mini-card ${card.color}">
        <div class="corner">${card.rank}</div>
        <div class="suit-center">${card.suit}</div>
      </div>`;
  }

  function renderHistory(){
    if (!fullHistory.length){
      el.historyGrid.innerHTML = '<div class="history-empty" style="grid-column:1 / -1">Nenhuma carta sorteada ainda.</div>';
      return;
    }
    el.historyGrid.innerHTML = fullHistory.map(miniCardHTML).join('');
  }

  function openHistory(){
    historyOpen = true;
    renderHistory();
    el.historyModal.classList.add('show');
    el.historyModal.setAttribute('aria-hidden', 'false');
  }

  function closeHistory(){
    historyOpen = false;
    el.historyModal.classList.remove('show');
    el.historyModal.setAttribute('aria-hidden', 'true');
  }

  function updateUI(){
    el.totalScore.textContent = format2(totalScore);
    el.deckCount.textContent = deck.length;
    el.streakLabel.textContent = streak;
    el.bankLabel.textContent = bank;

    const scoringNow = bank > 0;
    el.stopBtn.classList.toggle('show', bank > 0);
    el.multiplier.classList.toggle('show', scoringNow);
    if(scoringNow){
      el.multiplier.textContent = `+${bank}`;
    }

    const disabled = locked || historyOpen || deck.length === 0;
    el.higherBtn.disabled = disabled;
    el.lowerBtn.disabled = disabled;
    el.higherBtn.style.opacity = disabled ? .5 : 1;
    el.lowerBtn.style.opacity = disabled ? .5 : 1;
  }

  function setMessage(text){ el.message.textContent = text; }

  function startGame(){
    ensureAudio();
    startBGM();
    stopTurnTimer();
    deck = buildDeck();
    openPile = [deck.pop()];
    fullHistory = [...openPile];
    totalScore = 0;
    streak = 0;
    bank = 0;
    locked = false;
    closeHistory();
    renderOpenCards();
    updateUI();
    setMessage('Escolha se a próxima carta será maior ou menor.');
    showScreen(el.game);
    startTurnTimer();
  }

  function endGame(){
    stopTurnTimer();
    stopBGM();
    showScreen(el.result);
    renderResults();
  }

  function generateOpponents(userScore){
    const names = ['Jogador 02','Jogador 03','Jogador 04','Jogador 05','Jogador 06','Jogador 07'];
    const strongerTopScore = 18 + Math.floor(Math.random() * 6);
    const basePool = [
      strongerTopScore,
      Math.max(9, strongerTopScore - (1 + Math.floor(Math.random()*3))),
      Math.max(7, strongerTopScore - (2 + Math.floor(Math.random()*4))),
      Math.max(5, strongerTopScore - (4 + Math.floor(Math.random()*4))),
      Math.max(3, strongerTopScore - (6 + Math.floor(Math.random()*4))),
      Math.max(1, strongerTopScore - (8 + Math.floor(Math.random()*4)))
    ];
    const shuffledPool = shuffle(basePool);
    const scores = names.map((name, i) => ({ name, score: shuffledPool[i] }));
    scores.push({ name: 'Jogador 01', score: userScore, you: true });
    return scores.sort((a,b) => b.score - a.score);
  }

  function renderResults(){
    const players = generateOpponents(totalScore);
    el.finalPoints.innerHTML = `Sua pontuação final: <strong>${totalScore}</strong>`;
    el.scoreboard.innerHTML = players.map((p, idx) => `
      <div class="player-row ${p.you ? 'you' : ''}">
        <div class="player-rank">${idx+1}º</div>
        <div class="player-name">${p.name}</div>
        <div class="player-points">${p.score}</div>
      </div>
    `).join('');
    const winner = players[0];
    el.winnerText.textContent = winner.you ? 'Parabéns! Você venceu a partida.' : `${winner.name} venceu a partida.`;
  }

  function handleTimeout(){
    if (locked || deck.length === 0) return;
    locked = true;
    playTimeoutSound();
    animateHit('wrong');
    streak = 0;
    bank = 0;
    updateUI();
    setMessage('Tempo esgotado! A sequência foi descartada.');

    setTimeout(() => {
      if (deck.length <= 1) {
        const finalBonus = bank > 0 ? bank : 0;
        if (finalBonus > 0) {
          totalScore += finalBonus;
          bank = 0;
          updateUI && updateUI();
          animateScore();
          showEndgameBonus(finalBonus);
          setTimeout(endGame, 1200);
        } else {
          endGame();
        }
        return;
      }
      openPile = [deck.pop()];
      fullHistory.push(openPile[0]);
      renderOpenCards();
      locked = false;
      updateUI();
      setMessage('Nova rodada. Escolha maior ou menor.');
      startTurnTimer();
    }, 850);
  }

  function drawNext(guess){
    if (locked || deck.length === 0) return;
    ensureAudio();
    locked = true;
    animateButton(guess === 'higher' ? el.higherBtn : el.lowerBtn);
    animateDeck();
    stopTurnTimer();

    const current = openPile[openPile.length - 1];
    const next = deck.pop();
    openPile.push(next);
    fullHistory.push(next);
    renderOpenCards();

    const isTie = next.value === current.value;
    const isCorrect = isTie || (guess === 'higher'
      ? next.value > current.value
      : next.value < current.value);

    if (isCorrect) {
      streak += 1;
      if (streak >= 2) {
        bank += 1;
        playCorrectSound(streak);
        animateMultiplier();
        animateBank();
        setMessage(`${isTie ? 'Carta igual! Conta como acerto.' : 'Acertou!'} A sequência acumulou ${bank} ponto${bank > 1 ? 's' : ''}.`);
      } else {
        playCorrectSound(streak);
        setMessage(isTie ? 'Carta igual! Conta como acerto. Continue a sequência.' : 'Acertou! Continue a sequência para aumentar sua pontuação.');
      }
      animateHit('correct');
      updateUI();

      if (deck.length === 0) {
        const finalBonus = bank > 0 ? bank : 0;
        if (finalBonus > 0) {
          totalScore += finalBonus;
          bank = 0;
          updateUI && updateUI();
          animateScore();
          showEndgameBonus(finalBonus);
          setTimeout(endGame, 1200);
        } else {
          setTimeout(endGame, 900);
        }
        return;
      }

      setTimeout(() => {
        locked = false;
        updateUI();
        startTurnTimer();
      }, 320);
    } else {
      playWrongSound();
      animateHit('wrong');
      setMessage('Errou! Os pontos acumulados desta sequência foram perdidos.');
      streak = 0;
      bank = 0;
      updateUI();

      setTimeout(() => {
        if (deck.length <= 1) {
          endGame();
          return;
        }
        openPile = [deck.pop()];
        fullHistory.push(openPile[0]);
        renderOpenCards();
        locked = false;
        updateUI();
        setMessage('Nova rodada. Escolha maior ou menor.');
        startTurnTimer();
      }, 850);
    }
  }

  function stopAndBank(){
    if (bank <= 0 || locked) return;
    ensureAudio();
    locked = true;
    animateButton(el.stopBtn);
    stopTurnTimer();
    totalScore += bank;
    playBankSound(bank);
    animateScore();
    setMessage(`Você parou e guardou ${bank} ponto${bank > 1 ? 's' : ''}.`);
    streak = 0;
    bank = 0;
    updateUI();

    if (deck.length <= 1) {
      setTimeout(endGame, 700);
      return;
    }

    setTimeout(() => {
      openPile = [deck.pop()];
      fullHistory.push(openPile[0]);
      renderOpenCards();
      locked = false;
      updateUI();
      setMessage('Nova rodada. Escolha maior ou menor.');
      startTurnTimer();
    }, 450);
  }


  function showEndgameBonus(points){
    if(!points || points <= 0) return;
    el.endgameBonusText.textContent = `BÔNUS FINAL +${points}`;
    el.endgameBonus.classList.remove('show');
    void el.endgameBonus.offsetWidth;
    el.endgameBonus.classList.add('show');
    playBankSound(points);
    setTimeout(() => {
      el.endgameBonus.classList.remove('show');
    }, 950);
  }

  el.playBtn.addEventListener('click', () => { playClickSound(); startGame(); });
  el.restartBtn.addEventListener('click', () => { playClickSound(); startGame(); });
  el.higherBtn.addEventListener('click', () => drawNext('higher'));
  el.lowerBtn.addEventListener('click', () => drawNext('lower'));
  el.stopBtn.addEventListener('click', stopAndBank);
  el.historyBtn.addEventListener('click', () => {
    ensureAudio();
    playClickSound();
    if (historyOpen) return;
    openHistory();
    updateUI();
  });
  el.closeHistoryBtn.addEventListener('click', () => {
    ensureAudio();
    playClickSound();
    closeHistory();
    updateUI();
  });
  el.historyModal.addEventListener('click', (e) => {
    if (e.target === el.historyModal) {
      closeHistory();
      updateUI();
    }
  });

  document.addEventListener('visibilitychange', () => {
    if(document.hidden){
      stopBGM();
    }else if(el.game.classList.contains('active')){
      startBGM();
    }
  });
})();
