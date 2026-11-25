// scene.js: the Phaser scene that ties everything together.
// create() builds the room and the player(s); update() runs every frame.
// The scene's other abilities come from render.js, drill.js, rules.js, awareness.js and net.js (added at the bottom).

// Radius of the player and partner dots on the map, in pixels
const DOT_R = 16;

class Lab extends Phaser.Scene{
  constructor(){ super('lab'); }

  get step(){ return STEPS[this.s.step]; }

  create(){
    this.player = null; this.partner = null; this.alarm = null;

    // Who am I? Single-player is always Player 1. In two-player mode the guest (Player 2)
    // only draws what the host sends, while the host is connected (see net.js).
    this.me = NET.on ? NET.role : 1;
    this.other = 3 - this.me;
    this.guest = NET.on && NET.role === 2 && peerOnline();
    this._online = peerOnline();
    this.shownStep = null; this.spillShown = false; this.endShown = false; this.shareKey = null;
    if(this.guest) NET.staleRun = NET.lastRun;   // ignore snapshots from before this restart

    // Game state. Everything that changes during a drill lives here.
    // splashed: which player gets the eye splash. ps: what each player has on or is carrying.
    this.s = {run:Math.random(), step:0, spill:false, score:100, splashed:this.me,
              flags:{}, violations:[], timer:null, t0:this.time.now, runT:0, done:false};
    const fresh = () => ({ppe:false, carry:false, kit:false, out:false});
    this.ps = {1:fresh(), 2:fresh()};
    this.ranSent = {};

    // Drawing layers
    this.mapG = this.add.graphics();
    this.labels = [];
    this.drawMap();
    this.spillG = this.add.graphics();
    this.ring = this.add.graphics();

    // Walls and equipment are solid
    this.solids = this.physics.add.staticGroup();
    const addSolid = (x,y,w,h) => this.solids.add(this.add.rectangle(x+w/2, y+h/2, w, h).setVisible(false));
    WALLS.forEach(w => addSolid(...w));
    OBJ.filter(o => o.solid !== false).forEach(o => addSolid(o.x, o.y, o.w, o.h));

    const font = 'Atkinson Hyperlegible, sans-serif';
    const tag = (text, bg) => this.add.text(0, -28, text, {fontFamily:font, fontSize:'13px', fontStyle:'bold',
      color:'#fff', backgroundColor:bg, padding:{x:4,y:1}}).setOrigin(.5,1).setDepth(8);

    // The partner (two-player only): an orange circle, drawn only. Its position comes from the network.
    const q0 = STARTS[this.other];
    this.partner = this.add.container(q0.x, q0.y).setVisible(false);
    this.qBody  = this.add.circle(0, 0, DOT_R, hex('--partner')).setStrokeStyle(3, hex('--paper'));
    this.qNose  = this.add.triangle(0, -DOT_R-6, -7, 5, 7, 5, 0, -5, hex('--partner'));
    this.qCarry = this.add.rectangle(DOT_R-1, DOT_R-4, 10, 13, hex('--red')).setVisible(false);
    this.partner.add([this.qBody, this.qNose, this.qCarry]);
    this.qTag = tag('P' + this.other, '#9A4A05').setVisible(false);   // name tags are separate so they don't rotate

    // The player: a blue circle with a direction marker and a carried-item square
    const p0 = STARTS[this.me];
    this.player = this.add.container(p0.x, p0.y);
    this.pBody  = this.add.circle(0, 0, DOT_R, hex('--blue')).setStrokeStyle(3, hex('--paper'));
    this.pNose  = this.add.triangle(0, -DOT_R-6, -7, 5, 7, 5, 0, -5, hex('--blue'));
    this.pCarry = this.add.rectangle(DOT_R-1, DOT_R-4, 10, 13, hex('--red')).setVisible(false);
    this.player.add([this.pBody, this.pNose, this.pCarry]);
    this.pTag = tag('P' + this.me + ' (you)', '#1F5FA8').setVisible(NET.on);
    this.physics.add.existing(this.player);
    this.player.body.setCircle(12, -12, -12).setCollideWorldBounds(true);   // collision a bit smaller than the dot, so doorways stay easy
    this.physics.world.setBounds(4, 4, W - 8, H - 8);
    this.physics.add.collider(this.player, this.solids);

    // "E" bubble and the red fire-alarm flash
    this.prompt = this.add.text(0, 0, '', {fontFamily:font, fontSize:'16px', fontStyle:'bold',
      color:'#fff', backgroundColor:'#1C2630', padding:{x:6,y:3}}).setOrigin(.5,1).setDepth(10).setVisible(false);
    this.flash = this.add.rectangle(W/2, H/2, W, H, hex('--red'), 0).setDepth(9);

    // Keyboard
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,Q,SPACE');
    this.keys.E.on('down', () => this.act());
    this.keys.SPACE.on('down', event => {
      if(document.activeElement.matches('input[type="checkbox"]')) return;
      this.act();
      event.preventDefault();
    });
    this.keys.Q.on('down', () => this.describe());
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT');

    // Touch / mouse: press and hold to walk toward that spot
    this.pointerTarget = null;
    this.input.on('pointerdown', p => this.pointerTarget = {x:p.worldX, y:p.worldY});
    this.input.on('pointermove', p => { if(p.isDown) this.pointerTarget = {x:p.worldX, y:p.worldY}; });
    this.input.on('pointerup', () => this.pointerTarget = null);

    $('log').innerHTML = '';
    if(!NET.on){
      log('You are at the entrance of B035, top left of the map, next to the cubbies. Arrow keys or WASD to move, E to interact.');
    } else {
      log(`Two-player mode. You are ${pname(this.me)}, the blue circle, at the entrance next to the cubbies, top left of the map. ` +
          (peerOnline() ? 'Your partner is the orange circle.' : 'Waiting for your partner to join; you can start on your own.'));
    }
    if(this.guest) this.stepFx(); else this.enterStep();
    this.refreshHUD();
  }

  update(time, delta){
    if(this.updateNet()) return;    // net.js: partner, messages, host snapshot (does nothing in single-player)
    this.pTag.setPosition(this.player.x, this.player.y - DOT_R - 12);
    if(this.s.done) return;
    const dt = delta / 1000;
    const running = this.movePlayer();
    if(!this.step) return;

    this.checkRunning(dt, running);  // rules.js
    if(!this.guest){                 // the host (or single player) runs the drill
      this.checkRules();             // rules.js
      this.updateTimer(dt);          // rules.js
      if(this.checkEvacuation()) return;  // rules.js
    }
    this.warnTimer();               // rules.js
    this.showTimer();               // render.js
    this.updateProximity();         // awareness.js
    this.updateNavigator();         // render.js
    this.drawTargetRing(time);      // render.js
  }

  // Keyboard or touch movement. Returns true while the player is running.
  movePlayer(){
    const k = this.keys, p = this.player;
    let vx = (k.LEFT.isDown || k.A.isDown ? -1 : 0) + (k.RIGHT.isDown || k.D.isDown ? 1 : 0);
    let vy = (k.UP.isDown || k.W.isDown ? -1 : 0) + (k.DOWN.isDown || k.S.isDown ? 1 : 0);
    if(!vx && !vy && this.pointerTarget){
      const dx = this.pointerTarget.x - p.x, dy = this.pointerTarget.y - p.y;
      if(Math.hypot(dx, dy) > 6){ vx = dx; vy = dy; }
    }
    if(this.ps[this.me].out){ vx = vy = 0; }      // already out of the building during the evacuation
    const len = Math.hypot(vx, vy), running = k.SHIFT.isDown && len > 0, speed = running ? 260 : 140;
    if(len){ p.body.setVelocity(vx/len*speed, vy/len*speed); p.rotation = Math.atan2(vx, -vy); }
    else p.body.setVelocity(0);
    return running;
  }

  setMapZoom(zoom){
    const camera = this.cameras.main;
    const nextZoom = Math.max(1, Math.min(3, zoom));
    camera.setZoom(nextZoom);
    if(nextZoom === 1){
      camera.stopFollow();
      camera.setScroll(0, 0);
    } else {
      camera.startFollow(this.player, false, 1, 1);
    }
    this.updateEndScreenScale();
    $('btnZoomReset').textContent = `${Math.round(nextZoom * 100)}%`;
  }
}

// Give the scene the methods defined in the other files
Object.assign(Lab.prototype, RenderMethods, DrillMethods, RuleMethods, AwarenessMethods, NetMethods);
