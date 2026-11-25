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

// Main message path. cls is 'good', 'bad' or null (sets the colour). Each message goes to:
//   the "Latest" bar under the map (briefly highlighted), the event log in the side panel,
//   screen readers (via the hidden #sr region), and read-aloud speech.
function log(msg, cls){
  const li = document.createElement('li');
  li.textContent = msg;
  if(cls) li.className = cls;
  $('log').prepend(li);
  if(cls === 'bad') alertBeep();
  showLatest(msg, cls);
  announce(msg);
  speakText(msg);
}

function showLatest(msg, cls){
  const bar = $('latest');
  $('latestMsg').textContent = msg;
  bar.classList.remove('good', 'bad', 'flash');
  if(cls) bar.classList.add(cls);
  void bar.offsetWidth;          // restart the highlight animation
  bar.classList.add('flash');
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
function alertBeep(){
  if(!sound) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const t = audioCtx.currentTime;
    // A low, descending pair gives alerts a more ominous feel.
    [[520, 0], [370, .24]].forEach(([freq, offset]) => {
      const o = audioCtx.createOscillator(), g = audioCtx.createGain();
      o.type = 'sawtooth'; o.frequency.value = freq;
      g.gain.setValueAtTime(.045, t + offset);
      g.gain.exponentialRampToValueAtTime(.0001, t + offset + .2);
      o.connect(g).connect(audioCtx.destination);
      o.start(t + offset); o.stop(t + offset + .2);
    });
  }catch(e){}
}

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
