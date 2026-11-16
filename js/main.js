// main.js: starts the game and connects the side-panel buttons. Loaded last.

function setPanelHidden(hidden){
  $('main').classList.toggle('panel-hidden', hidden);
  $('btnPanel').setAttribute('aria-expanded', String(!hidden));
  $('btnPanel').textContent = hidden ? 'Show side panel' : 'Hide side panel';
  $('latestTask').hidden = !hidden;
  requestAnimationFrame(() => NET.game.scale.refresh());
}

async function boot(){
  bindSettings();
  await netJoin();   // net.js: two-player mode if served by server.py; otherwise returns quickly and stays single-player
  const game = NET.game = new Phaser.Game({
    type: Phaser.AUTO, parent: 'game', width: W, height: H, backgroundColor: css('--paper'),
    physics: {default:'arcade', arcade:{debug:false}},
    scale: {mode:Phaser.Scale.FIT, autoCenter:Phaser.Scale.CENTER_BOTH},
    scene: [Lab]
  });
  const scene = () => game.scene.getScene('lab');

  $('btnAct').onclick  = () => scene().act();
  $('btnDesc').onclick = () => scene().describe();
  $('btnRestart').onclick = () => {
    if('speechSynthesis' in window) speechSynthesis.cancel();
    send({t:'restart'});          // two-player: restart the partner's drill too
    setPanelHidden(false);
    scene().scene.restart();
    $('game').focus();
  };
  // Show / hide the side panel. The map grows to fill the space; the task moves into the "Latest" bar.
  $('btnPanel').onclick = () => {
    setPanelHidden(!$('main').classList.contains('panel-hidden'));
  };

  // Redraw the map when the computer switches between light and dark mode
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const s = scene(); if(s && s.mapG){ s.drawMap(); s.drawSpill(); }
  });
  $('game').focus();
}

// Wait for the font so map labels use it
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
