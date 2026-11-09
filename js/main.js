// main.js: starts the game and connects the side-panel buttons. Loaded last.

function boot(){
  bindSettings();
  const game = new Phaser.Game({
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
    scene().scene.restart();
    $('game').focus();
  };
  // Redraw the map when the computer switches between light and dark mode
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const s = scene(); if(s && s.mapG){ s.drawMap(); s.drawSpill(); }
  });
  $('game').focus();
}

// Wait for the font so map labels use it
(document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(boot);
