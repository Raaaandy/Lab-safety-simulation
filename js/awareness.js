// awareness.js: helping the player know what is around them without looking.
// Proximity checks, the Q "Describe" command, and announcing nearby objects.
// `this` is the Lab scene (see scene.js).

const AwarenessMethods = {

  // First object from `ids` within `d` pixels of the player, or undefined
  nearObj(ids, d=38){
    const p = this.player;
    return OBJ.find(o => ids.includes(o.id) && distToRect(p.x, p.y, o) <= d);
  },

  // Closest labelled object within `d` pixels, or null
  nearest(d=38){
    const p = this.player; let best = null, bd = d;
    OBJ.forEach(o => { if(!o.label) return; const k = distToRect(p.x, p.y, o); if(k <= bd){ bd = k; best = o; } });
    return best;
  },

  // Q key: the three nearest objects with distance and direction, plus the current target
  describe(){
    const p = this.player;
    const list = OBJ.filter(o => o.label)
      .map(o => ({o, d:distToRect(p.x, p.y, o)}))
      .sort((a,b) => a.d - b.d).slice(0, 3)
      .map(({o,d}) => `${o.label}, ${(d*M_PER_PX).toFixed(1)} m ${compass(o.x+o.w/2-p.x, o.y+o.h/2-p.y)}`);
    const t = this.targetPoint();
    let extra = '';
    if(t){ const d = Math.hypot(t.x-p.x, t.y-p.y) * M_PER_PX; extra = ` Current target is about ${d.toFixed(1)} m ${compass(t.x-p.x, t.y-p.y)}.`; }
    log('Nearest: ' + list.join('; ') + '.' + extra);
  },

  // Every frame: update the "Nearby" box and the E bubble, and announce changes once
  updateProximity(){
    const p = this.player, target = this.actionTarget(), o = this.nearest();
    $('near').textContent = target ? `${target.label} (press E)` : (o ? o.label : 'Nothing within reach.');
    const msg = target ? target.label + '. Press E.' : (o ? o.label : '');
    if(msg !== this.s.nearMsg){ this.s.nearMsg = msg; if(msg){ announce(msg); speakText(msg); } }
    this.prompt.setVisible(!!target).setPosition(p.x, p.y-22).setText('E');
  },
};
