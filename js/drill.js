// drill.js: the drill steps. What happens when a step starts, and when a player presses E.
// To add a new step: add it to STEPS in data.js, then add a matching `case` in act() below.
// In two-player mode only the host runs this logic; the guest's E presses arrive as act(2, position).
// These functions are added to the Lab scene (see scene.js), so `this` is the scene.

const DrillMethods = {

  // The instruction for the current step, in single- or two-player wording
  stepText(){
    const st = this.step;
    if(!st) return '';
    if(this.team() && st.id === 'eyewash'){
      const s = this.s.splashed;
      return `${pname(s)} got a splash in the eye! ${pname(s)}: reach the eye wash and safety shower by the upper wall, just left of the door. ${pname(3-s)}: guide them there.`;
    }
    return (this.team() && st.teamText) || st.text;
  },

  // Sounds, the spill and the alarm for the current step (runs on both laptops)
  stepFx(){
    const st = this.step;
    this.drawSpill();
    if(!st || st.id !== 'evac') this.stopAlarm();
    if(!st) return;
    if(st.id === 'kit') beep(660, .12, 2);
    if(st.id === 'eyewash') beep(520, .2, 2);
    if(st.id === 'evac') this.startAlarm();
  },

  // Runs when a step begins (host / single player)
  enterStep(){
    const st = this.step;
    if(st && st.id === 'kit') this.s.spill = true;
    this.stepFx();
    if(!st) return this.finish();
    this.s.timer = st.timer ? st.timer : null;
    this.s.timerFailed = false; this.s.warned = false;
    log(this.stepText(), st.urgent ? 'urgent' : null);   // the guest logs it from the host's snapshot
    this.refreshHUD();
  },

  // Finish the current step and move on
  advance(msg){
    if(msg) say(msg, 'good');
    this.s.step++;
    this.enterStep();
  },

  // The E key. pn = which player pressed it, pos = where they were standing.
  // Completes the current step if that player is in the right place, otherwise reads the nearest safety note.
  act(pn=this.me, pos=null){
    pos = pos || {x:this.player.x, y:this.player.y};
    if(this.guest && pn === this.me){ if(!this.s.done) send({t:'act', x:pos.x, y:pos.y}); return; }
    if(this.s.done) return;
    const st = this.step, P = this.ps[pn], team = this.team(), at = ids => this.nearObj(ids, 38, pos);

    switch(st.id){
      case 'ppe':
        if(!P.ppe && at(['cubbyA','cubbyB'])){
          P.ppe = true;
          if(this.players().every(n => this.ps[n].ppe))
            return this.advance(team ? 'Both players are geared up: goggles, lab coats and nitrile gloves on.'
                                     : 'Bag stored. Goggles, lab coat and nitrile gloves on.');
          say(`${pname(pn)} is geared up. Waiting for ${pname(3-pn)} to gear up at the cubbies.`);
          this.refreshHUD(); return;
        }
        break;
      case 'get':
        if(at(['flam'])){
          P.carry = true;
          return this.advance(`${team ? pname(pn) + ' picked' : 'Picked'} up the acetone. Carry it with both hands.`);
        }
        break;
      case 'hood':
        if(P.carry){
          if(at(['hood'])) return this.advance('Acetone dispensed in the hood with the sash lowered.');
          const benches = OBJ.filter(o => o.kind === 'bench').map(o => o.id);
          if(at(benches)) return this.violate('bench', 'Tried to dispense acetone on an open bench. Volatile solvents go in the fume hood.', pn);
        } else if(at(['hood'])) return say(`${pname(3-pn)} has the acetone. They need to bring it here.`, null, pn);
        break;
      case 'return':
        if(P.carry && at(['flam'])){
          P.carry = false;
          return this.advance('Bottle returned and cabinet doors closed.');
        }
        if(!P.carry && at(['flam'])) return say(`${pname(3-pn)} has the acetone. They need to bring it back here.`, null, pn);
        break;
      case 'kit':
        if(at(['centri'])){
          P.kit = true;
          return this.advance(team ? `${pname(pn)} has the spill kit: absorbent pads, scoop, waste bag.`
                                   : 'Spill kit in hand: absorbent pads, scoop, waste bag.');
        }
        break;
      case 'clean':
        if(this.nearSpill(pos, 34)){
          if(team && !this.players().every(n => this.nearSpill(this.posOf(n), 60)))
            return say('You need your partner at the spill to contain it from both sides.', null, pn);
          // The player who held the kit gets the splash in the next step
          this.s.splashed = this.players().find(n => this.ps[n].kit) || pn;
          [1, 2].forEach(n => this.ps[n].kit = false);
          this.s.spill = false;
          this.drawSpill();
          return this.advance(team ? 'Together you contained the spill from both sides, absorbed it and bagged it as hazardous waste.'
                                   : 'Spill absorbed from the edges inward and bagged as hazardous waste.');
        }
        break;
      case 'eyewash':
        if(pn === this.s.splashed && at(['eyewash']))
          return this.advance('Eyewash running. In a real splash, keep flushing for 15 minutes and report it.');
        break;
    }

    // Not a step action: read the nearest object's safety note to the player who pressed E
    const o = this.nearest(38, pos);
    if(o) say(o.label + ': ' + o.note, null, pn);
  },

  // Can this player complete the current step from here? Returns the thing to press E on, or null.
  // Used for the E bubble and the "Nearby" box on both laptops.
  actionTarget(pn=this.me, pos=this.player){
    const st = this.step, P = this.ps[pn];
    if(!st || this.s.done) return null;
    const at = ids => this.nearObj(ids, 38, pos) || null;
    switch(st.id){
      case 'ppe':    return P.ppe ? null : at(['cubbyA','cubbyB']);
      case 'get':    return at(['flam']);
      case 'hood':   return P.carry ? at(['hood']) : null;
      case 'return': return P.carry ? at(['flam']) : null;
      case 'kit':    return at(['centri']);
      case 'clean':  return this.nearSpill(pos, 34) ? {label:'Spill'} : null;
      case 'eyewash':return pn === this.s.splashed ? at(['eyewash']) : null;
    }
    return null;
  },

  // Where the guide ring goes for the current step
  targetPoint(){
    const st = this.step, p = this.player;
    if(!st || this.s.done) return null;
    if(st.target[0] === 'spill') return {x:SPILL.x, y:SPILL.y, r:SPILL.r+14, label:'Spill'};
    if(st.target[0] === 'exit'){
      const e = EXITS.slice().sort((a,b) => Math.hypot(a.x-p.x,a.y-p.y) - Math.hypot(b.x-p.x,b.y-p.y))[0];
      return {x:e.x, y:e.y, r:22, label:e.name};
    }
    const o = OBJ.filter(o => st.target.includes(o.id))
                 .sort((a,b) => distToRect(p.x,p.y,a) - distToRect(p.x,p.y,b))[0];
    return {x:o.x+o.w/2, y:o.y+o.h/2, r:Math.max(o.w,o.h)/2+10, label:o.label.replace(/\n/g,' ')};
  },

  startAlarm(){
    if(this.alarm) return;
    this.tweens.add({targets:this.flash, alpha:{from:0, to:.18}, yoyo:true, repeat:-1, duration:450});
    this.alarm = this.time.addEvent({delay:900, loop:true, callback:() => beep(990, .25)});
  },
  stopAlarm(){
    if(this.alarm){ this.alarm.remove(); this.alarm = null; }
    this.tweens.killTweensOf(this.flash); this.flash.setAlpha(0);
  },

  finish(){
    this.s.done = true;
    this.player.body.setVelocity(0);
    const secs = this.s.secs = Math.round((this.time.now - this.s.t0) / 1000), v = this.s.violations;
    say(`Drill complete in ${secs} s. ${this.team() ? 'Team score' : 'Score'} ${this.s.score}/100. ${v.length ? v.length+' violation(s): '+v.join(' ') : 'No violations.'}`, v.length ? null : 'good');
    this.endShown = true;
    this.showEndScreen(secs);
  },
};
