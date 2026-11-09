// drill.js: the drill steps. What happens when a step starts, and when the player presses E.
// To add a new step: add it to STEPS in data.js, then add a matching `if` in act() below.
// These functions are added to the Lab scene (see scene.js), so `this` is the scene.

const DrillMethods = {

  // Runs when a step begins
  enterStep(){
    const st = this.step;
    if(!st) return this.finish();
    if(st.id === 'kit'){ this.s.spill = true; this.drawSpill(); beep(660, .12, 2); }
    if(st.id === 'eyewash') beep(520, .2, 2);
    if(st.id === 'evac') this.startAlarm();
    this.s.timer = st.timer ? st.timer : null;
    this.s.timerFailed = false; this.s.warned = false;
    log(st.text, st.urgent ? 'bad' : null);
    this.refreshHUD();
  },

  // Finish the current step and move on
  advance(msg){
    if(msg) log(msg, 'good');
    if(this.step && this.step.id === 'evac') this.stopAlarm();
    this.s.step++;
    this.enterStep();
  },

  // The E key: complete the current step if the player is in the right place,
  // otherwise read the safety note of the nearest object.
  act(){
    if(this.s.done) return;
    const st = this.step, p = this.player;

    if(st.id === 'ppe' && this.nearObj(['cubbyA','cubbyB'])){
      this.s.ppe = true;
      return this.advance('Bag stored. Goggles, lab coat and nitrile gloves on.');
    }
    if(st.id === 'get' && this.nearObj(['flam'])){
      this.s.carry = true;
      return this.advance('Picked up the acetone. Carry it with both hands.');
    }
    if(st.id === 'hood'){
      if(this.nearObj(['hood'])) return this.advance('Acetone dispensed in the hood with the sash lowered.');
      const benches = OBJ.filter(o => o.kind === 'bench').map(o => o.id);
      if(this.nearObj(benches)) return this.violate('bench', 'Tried to dispense acetone on an open bench. Volatile solvents go in the fume hood.');
    }
    if(st.id === 'return' && this.nearObj(['flam'])){
      this.s.carry = false;
      return this.advance('Bottle returned and cabinet doors closed.');
    }
    if(st.id === 'kit' && this.nearObj(['blue'])){
      this.s.kit = true;
      return this.advance('Spill kit in hand: absorbent pads, scoop, waste bag.');
    }
    if(st.id === 'clean' && Math.hypot(p.x-SPILL.x, p.y-SPILL.y) < SPILL.r+34){
      this.s.spill = false; this.s.kit = false; this.drawSpill();
      return this.advance('Spill absorbed from the edges inward and bagged as hazardous waste.');
    }
    if(st.id === 'eyewash' && this.nearObj(['eyewash'])){
      return this.advance('Eyewash running. In a real splash, keep flushing for 15 minutes and report it.');
    }

    // Not a step action: read the nearest object's safety note
    const o = this.nearest();
    if(o) log(o.label + ': ' + o.note);
  },

  // Is the player somewhere they can complete the current step? Returns the thing to press E on, or null.
  actionTarget(){
    const st = this.step, p = this.player;
    if(!st || this.s.done) return null;
    if(st.id === 'clean') return Math.hypot(p.x-SPILL.x, p.y-SPILL.y) < SPILL.r+34 ? {label:'Spill'} : null;
    if(st.target[0] === 'exit') return null;
    return this.nearObj(st.target) || null;
  },

  // Where the guide ring goes for the current step
  targetPoint(){
    const st = this.step, p = this.player;
    if(!st) return null;
    if(st.target[0] === 'spill') return {x:SPILL.x, y:SPILL.y, r:SPILL.r+14};
    if(st.target[0] === 'exit'){
      const e = EXITS.slice().sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y) - Math.hypot(b.x-p.x,b.y-p.y))[0];
      return {x:e.x, y:e.y, r:22};
    }
    const o = OBJ.filter(o => st.target.includes(o.id))
                 .sort((a,b) => distToRect(p.x,p.y,a) - distToRect(p.x,p.y,b))[0];
    return {x:o.x+o.w/2, y:o.y+o.h/2, r:Math.max(o.w,o.h)/2+10};
  },

  startAlarm(){
    this.tweens.add({targets:this.flash, alpha:{from:0, to:.18}, yoyo:true, repeat:-1, duration:450});
    this.alarm = this.time.addEvent({delay:900, loop:true, callback:() => beep(990, .25)});
  },
  stopAlarm(){
    if(this.alarm) this.alarm.remove();
    this.tweens.killTweensOf(this.flash); this.flash.setAlpha(0);
  },

  finish(){
    this.s.done = true;
    this.player.body.setVelocity(0);
    const secs = Math.round((this.time.now - this.s.t0) / 1000), v = this.s.violations;
    log(`Drill complete in ${secs} s. Score ${this.s.score}/100. ${v.length ? v.length+' violation(s): '+v.join(' ') : 'No violations.'}`, v.length ? null : 'good');
    this.showEndScreen(secs);
  },
};
