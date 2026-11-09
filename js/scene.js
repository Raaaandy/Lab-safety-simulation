// scene.js: the Phaser scene that ties everything together.
// create() builds the room and the player; update() runs every frame.
// The scene's other abilities come from render.js, drill.js, rules.js and awareness.js (added at the bottom).

const START = {x:625, y:72};   // where the player starts, by the cubbies at the top-right entrance

class Lab extends Phaser.Scene{
  constructor(){ super('lab'); }

  get step(){ return STEPS[this.s.step]; }

  create(){
    this.player = null;

    // Game state. Everything that changes during a drill lives here.
    this.s = {step:0, ppe:false, carry:false, kit:false, spill:false, score:100,
              flags:{}, violations:[], timer:null, t0:this.time.now, runT:0, done:false};

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
    OBJ.forEach(o => addSolid(o.x, o.y, o.w, o.h));

    // The player: a blue circle with a direction marker and a carried-item square
    this.player = this.add.container(START.x, START.y);
    this.pBody  = this.add.circle(0, 0, 11, hex('--blue')).setStrokeStyle(3, hex('--paper'));
    this.pNose  = this.add.triangle(0, -15, -5, 4, 5, 4, 0, -4, hex('--blue'));
    this.pCarry = this.add.rectangle(10, 8, 8, 10, hex('--red')).setVisible(false);
    this.player.add([this.pBody, this.pNose, this.pCarry]);
    this.physics.add.existing(this.player);
    this.player.body.setCircle(11, -11, -11).setCollideWorldBounds(true);
    this.physics.world.setBounds(8, 6, 758, 1110);
    this.physics.add.collider(this.player, this.solids);

    // "E" bubble and the red fire-alarm flash
    this.prompt = this.add.text(0, 0, '', {fontFamily:'Atkinson Hyperlegible, sans-serif', fontSize:'16px', fontStyle:'bold',
      color:'#fff', backgroundColor:'#1C2630', padding:{x:6,y:3}}).setOrigin(.5,1).setDepth(10).setVisible(false);
    this.flash = this.add.rectangle(W/2, H/2, W, H, hex('--red'), 0).setDepth(9);

    // Keyboard
    this.keys = this.input.keyboard.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SHIFT,E,Q,SPACE');
    this.keys.E.on('down', () => this.act());
    this.keys.SPACE.on('down', () => this.act());
    this.keys.Q.on('down', () => this.describe());
    this.input.keyboard.addCapture('UP,DOWN,LEFT,RIGHT,SPACE');

    // Touch / mouse: press and hold to walk toward that spot
    this.pointerTarget = null;
    this.input.on('pointerdown', p => this.pointerTarget = {x:p.worldX, y:p.worldY});
    this.input.on('pointermove', p => { if(p.isDown) this.pointerTarget = {x:p.worldX, y:p.worldY}; });
    this.input.on('pointerup', () => this.pointerTarget = null);

    $('log').innerHTML = '';
    log('You are at the top-right entrance of B035. Arrow keys or WASD to move, E to interact.');
    this.enterStep();
    this.refreshHUD();
  }

  update(time, delta){
    if(this.s.done) return;
    const dt = delta / 1000;
    const running = this.movePlayer();

    this.checkRules(dt, running);   // rules.js
    this.updateTimer(dt);           // rules.js
    this.showTimer();               // render.js
    if(this.checkEvacuation()) return;  // rules.js
    this.updateProximity();         // awareness.js
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
    const len = Math.hypot(vx, vy), running = k.SHIFT.isDown && len > 0, speed = running ? 260 : 140;
    if(len){ p.body.setVelocity(vx/len*speed, vy/len*speed); p.rotation = Math.atan2(vx, -vy); }
    else p.body.setVelocity(0);
    return running;
  }
}

// Give the scene the methods defined in the other files
Object.assign(Lab.prototype, RenderMethods, DrillMethods, RuleMethods, AwarenessMethods);
