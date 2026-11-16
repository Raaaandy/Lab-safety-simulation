// rules.js: safety rules checked every frame, the timers, and the evacuation check.
// To add a rule: add a check in checkRules() that calls this.violate('a-unique-key', 'What went wrong.', pn).
// Each key only costs points once (per player in two-player mode). `this` is the Lab scene (see scene.js).
// In two-player mode the host checks the rules for both players' positions.

const RuleMethods = {

  // Record a mistake by player pn: -10 points, red message on both laptops, screen shake
  violate(key, msg, pn=this.me){
    if(this.team()){ key += '-p' + pn; msg = `${pname(pn)}: ${msg}`; }
    if(this.s.flags[key]) return;
    this.s.flags[key] = true;
    this.s.score = Math.max(0, this.s.score - 10);
    this.s.violations.push(msg);
    say('Violation: ' + msg, 'bad');
    beep(220, .25);
    if(pn === this.me) this.cameras.main.shake(180, .004);
    send({t:'fx', shake: pn !== this.me});
    this.refreshHUD();
  },

  // Running (holding Shift for more than 0.8 s). Checked on each laptop for its own player;
  // the guest reports it to the host, which records the violation.
  checkRunning(dt, running){
    this.s.runT = running ? this.s.runT + dt : 0;
    if(this.s.runT <= 0.8) return;
    const evac = this.step.id === 'evac';
    const key = evac ? 'runEvac' : 'run';
    const msg = evac ? 'Ran during the evacuation. Walk quickly, don’t run.' : 'Ran inside the lab. Walk; running causes collisions and spills.';
    if(!this.guest) return this.violate(key, msg);
    if(!this.ranSent[key]){ this.ranSent[key] = true; send({t:'run', key, msg}); }
  },

  // Rules for every player present (the partner's position comes from the network)
  checkRules(){
    for(const pn of this.players()){
      const q = this.posOf(pn), P = this.ps[pn];
      if(!q) continue;
      // Leaving the entrance area without PPE
      if(!P.ppe && Math.hypot(q.x-STARTS[pn].x, q.y-STARTS[pn].y) > 150)
        this.violate('ppe', 'Entered the work area without PPE.', pn);
      // Carrying acetone near an ignition source
      if(P.carry && this.nearObj(['steam','hx'], 50, q))
        this.violate('ignite', 'Carried acetone next to the steam bench / heat exchanger, an ignition source.', pn);
      // Walking through the spill
      if(this.s.spill && this.nearSpill(q, 6))
        this.violate('spill', 'Walked through the spill and tracked it across the floor.', pn);
    }
  },

  // Count down timed steps; violation when time runs out (host / single player)
  updateTimer(dt){
    if(this.s.timer === null) return;
    this.s.timer -= dt;
    if(this.s.timer <= 0 && !this.s.timerFailed){
      this.s.timerFailed = true;
      const eyewash = this.step.id === 'eyewash';
      this.violate('timer-'+this.step.id, eyewash ? 'Took more than 10 s to reach the eyewash.' : 'Too slow to evacuate.',
                   eyewash ? this.s.splashed : this.me);
    }
  },

  // 5-second warning (both laptops; screen readers don't get the visual countdown)
  warnTimer(){
    if(this.s.timer === null || this.s.warned || this.s.timer > 5 || this.s.timer <= 0) return;
    this.s.warned = true; announce('5 seconds left.'); speakText('5 seconds left.');
  },

  // During the fire alarm: has every player reached an exit?
  checkEvacuation(){
    if(this.step.id !== 'evac') return false;
    const team = this.team();
    for(const pn of this.players()){
      const q = this.posOf(pn);
      if(!q || this.ps[pn].out) continue;
      const e = EXITS.find(e => Math.hypot(e.x-q.x, e.y-q.y) < 34);
      if(!e) continue;
      this.ps[pn].out = true;
      if(team){ say(`${pname(pn)} is out through the ${e.name}.`, 'good'); this.refreshHUD(); }
      else { this.advance(`Out through the ${e.name}. Head to the assembly point.`); return true; }
    }
    if(this.players().every(pn => this.ps[pn].out)){   // also covers a partner leaving after you got out
      this.advance(team ? 'Everyone is out. Head to the assembly point.' : 'Head to the assembly point.');
      return true;
    }
    return false;
  },
};
