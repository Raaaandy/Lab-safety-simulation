// feedback.js: everything the player reads or hears.
// All game messages go through log(), which writes to the event log (announced by
// screen readers) and reads it aloud. Never show information only on the canvas.

// Settings (checkboxes in the side panel)
let speak = false, guide = true, sound = true;
let lastSpoken = '', heardGesture = false;

function bindSettings(){
  const checkboxes = [
    $('optSpeak'), $('optGuide'), $('optSound')
  ];
  checkboxes.forEach(input => {
    input.addEventListener('keydown', e => {
      if(e.key !== 'Enter' && e.code !== 'Space') return;
      e.stopPropagation();
      e.preventDefault();
      if(!e.repeat) input.click();
    });
  });
  $('optSpeak').onchange = e => {
    speak = e.target.checked;
    if(!speak){
      lastSpoken = '';
      if('speechSynthesis' in window) speechSynthesis.cancel();
    }
  };
  $('optGuide').onchange = e => guide = e.target.checked;
  $('optSound').onchange = e => sound = e.target.checked;
  speak = $('optSpeak').checked;
  guide = $('optGuide').checked;
  sound = $('optSound').checked;
}

// Main message path. cls is 'good', 'bad', 'urgent' or null. Each message goes to:
//   the "Latest" bar under the map (briefly highlighted), the event log in the side panel,
//   screen readers (via the hidden #sr region), and read-aloud speech.
function appendEventMessage(container, msg, cls){
  if(cls === 'good' || cls === 'bad'){
    container.append(document.createTextNode('- '));
    const icon = document.createElement('span');
    icon.className = 'feedback-icon';
    icon.setAttribute('aria-hidden', 'true');
    icon.textContent = cls === 'good' ? '✓' : '✗';
    container.append(icon, document.createTextNode(' '));
  }
  container.append(document.createTextNode(msg));
}

function log(msg, cls){
  const li = document.createElement('li');
  if(cls) li.classList.add(cls);
  appendEventMessage(li, msg, cls);
  $('log').prepend(li);
  showLatest(msg, cls);
  announce(msg);
  speakText(msg);
}

function showLatest(msg, cls){
  const bar = $('latest');
  const message = $('latestMsg');
  message.replaceChildren();
  bar.classList.remove('good', 'bad', 'urgent', 'flash');
  if(cls) bar.classList.add(cls);
  appendEventMessage(message, msg, cls);
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
