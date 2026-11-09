// rules.js: safety rules checked every frame, the timers, and the evacuation check.
// To add a rule: add a check in checkRules() that calls this.violate('a-unique-key', 'What went wrong.').
// Each key only costs points once. `this` is the Lab scene (see scene.js).

const RuleMethods = {

  // Record a mistake: -10 points, red log message, screen shake
  violate(key, msg){
    if(this.s.flags[key]) return;
    this.s.flags[key] = true;
    this.s.score = Math.max(0, this.s.score - 10);
    this.s.violations.push(msg);
    log('Violation: ' + msg, 'bad');
    beep(220, .25);
    this.cameras.main.shake(180, .004);
    this.refreshHUD();
  },

  checkRules(dt, running){
    const p = this.player, st = this.step;

    // Running (holding Shift for more than 0.8 s)
    this.s.runT = running ? this.s.runT + dt : 0;
    if(this.s.runT > 0.8){
      if(st.id === 'evac') this.violate('runEvac', 'Ran during the evacuation. Walk quickly, don’t run.');
      else this.violate('run', 'Ran inside the lab. Walk; running causes collisions and spills.');
    }
    // Leaving the entrance area without PPE
    if(!this.s.ppe && Math.hypot(p.x-START.x, p.y-START.y) > 150)
      this.violate('ppe', 'Entered the work area without PPE.');
    // Carrying acetone near an ignition source
    if(this.s.carry && this.nearObj(['steam','hx'], 50))
      this.violate('ignite', 'Carried acetone next to the steam bench / heat exchanger, an ignition source.');
    // Walking through the spill
    if(this.s.spill && Math.hypot(p.x-SPILL.x, p.y-SPILL.y) < SPILL.r+6)
      this.violate('spill', 'Walked through the spill and tracked it across the floor.');
  },

  // Count down timed steps; warn at 5 seconds; violation when time runs out
  updateTimer(dt){
    if(this.s.timer === null) return;
    this.s.timer -= dt;
    if(!this.s.warned && this.s.timer <= 5 && this.s.timer > 0){
      this.s.warned = true; announce('5 seconds left.'); speakText('5 seconds left.');
    }
    if(this.s.timer <= 0 && !this.s.timerFailed){
      this.s.timerFailed = true;
      this.violate('timer-'+this.step.id, this.step.id === 'evac' ? 'Too slow to evacuate.' : 'Took more than 10 s to reach the eyewash.');
    }
  },

  // During the fire alarm: has the player reached an exit?
  checkEvacuation(){
    if(this.step.id !== 'evac') return false;
    const p = this.player;
    const e = EXITS.find(e => Math.hypot(e.x-p.x, e.y-p.y) < 34);
    if(e){ this.advance(`Out through the ${e.name}. Head to the assembly point.`); return true; }
    return false;
  },
};
