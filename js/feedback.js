// feedback.js: everything the player reads or hears.
// All game messages go through log(), which writes to the event log (announced by
// screen readers) and reads it aloud. Never show information only on the canvas.

// Settings (checkboxes in the side panel)
let speak = true, guide = true, sound = true;
let lastSpoken = '', heardGesture = false;

function bindSettings(){
  $('optSpeak').onchange = e => speak = e.target.checked;
  $('optGuide').onchange = e => guide = e.target.checked;
  $('optSound').onchange = e => sound = e.target.checked;
}

// Main message path: event log + read aloud. cls is 'good', 'bad' or null (sets the colour).
function log(msg, cls){
  const li = document.createElement('li');
  li.textContent = msg;
  if(cls) li.className = cls;
  $('log').prepend(li);
  speakText(msg);
}

// Short screen-reader-only cues that don't need a log entry (nearby object, timer warning)
function announce(msg){
  const sr = $('sr'), p = document.createElement('p');
  p.textContent = msg;
  sr.appendChild(p);
  while(sr.children.length > 6) sr.removeChild(sr.firstChild);
}

// Read aloud. Messages queue up instead of cutting each other off.
function speakText(msg){
  lastSpoken = msg;
  if(!speak || !('speechSynthesis' in window)) return;
  const u = new SpeechSynthesisUtterance(msg);
  u.lang = 'en-US'; u.rate = 1.05;
  speechSynthesis.speak(u);
}

// Browsers block speech until the first key press or tap, so repeat the last message then.
function firstGesture(){
  if(heardGesture) return;
  heardGesture = true;
  if(speak && lastSpoken && 'speechSynthesis' in window && !speechSynthesis.speaking) speakText(lastSpoken);
}
window.addEventListener('keydown', firstGesture);
window.addEventListener('pointerdown', firstGesture);

// Sound effects and the fire alarm (generated, no audio files)
let audioCtx;
function beep(freq=880, dur=.15, times=1){
  if(!sound) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    for(let i = 0; i < times; i++){
      const o = audioCtx.createOscillator(), g = audioCtx.createGain(), t = audioCtx.currentTime + i*dur*2;
      o.frequency.value = freq; o.type = 'square';
      g.gain.setValueAtTime(.06, t); g.gain.exponentialRampToValueAtTime(.0001, t+dur);
      o.connect(g).connect(audioCtx.destination); o.start(t); o.stop(t+dur);
    }
  }catch(e){}
}
