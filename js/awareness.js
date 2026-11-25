// awareness.js: helping the player know what is around them without looking.
// Proximity checks, the Q "Describe" command, and announcing nearby objects.
// `this` is the Lab scene (see scene.js).

const AwarenessMethods = {

  // First object from `ids` within `d` pixels of pos (default: this laptop's player), or undefined
  nearObj(ids, d=38, pos=this.player){
    return pos ? OBJ.find(o => ids.includes(o.id) && distToRect(pos.x, pos.y, o) <= d) : undefined;
  },

  // Closest labelled object within `d` pixels of pos, or null
  nearest(d=38, pos=this.player){
    let best = null, bd = d;
    OBJ.forEach(o => { if(!o.label) return; const k = distToRect(pos.x, pos.y, o); if(k <= bd){ bd = k; best = o; } });
    return best;
  },

  // Is pos within `extra` pixels of the spill's edge?
  nearSpill(pos, extra){
    return !!pos && Math.hypot(pos.x-SPILL.x, pos.y-SPILL.y) < SPILL.r + extra;
  },

  // Q key: the three nearest objects with distance and direction, the current target, and the partner
  describe(){
    const p = this.player;
    const sorted = OBJ.filter(o => o.label)
      .map(o => ({o, d:distToRect(p.x, p.y, o)}))
      .sort((a,b) => a.d - b.d);
    const list = sorted.slice(0, 3)
      .map(({o,d}) => `${o.label}, ${(d*M_PER_PX).toFixed(1)} m ${compass(o.x+o.w/2-p.x, o.y+o.h/2-p.y)}`);
    const t = this.targetPoint();
    let extra = '';
    if(t){ const d = Math.hypot(t.x-p.x, t.y-p.y) * M_PER_PX; extra = ` Current target is about ${d.toFixed(1)} m ${compass(t.x-p.x, t.y-p.y)}.`; }
    const q = this.team() && this.posOf(this.other);
    if(q){ const d = Math.hypot(q.x-p.x, q.y-p.y) * M_PER_PX; extra += ` Your partner is ${d.toFixed(1)} m ${compass(q.x-p.x, q.y-p.y)}.`; }
    say('Nearest: ' + list.join('; ') + '.' + extra, null, this.me);
  },

  showPic(o){
    const box = $('objPicBox');
    if(!box) return;
    this.picObj = o && o.pic ? o : null;
    box.hidden = !this.picObj;
    if(!this.picObj) return;
    $('objPic').src = o.pic;
    $('objPic').alt = o.alt || (o.label + '. ' + (o.note || ''));
    // $('objPicCap').textContent = o.label;
  },

  // Show the picture for whatever the player is standing next to (called when E is pressed)
  showPicHere(){
    const p = this.player;
    if(this.s.spill && this.nearSpill(p, 30)) this.showPic(SPILL);
    else this.showPic(this.nearest());
  },

  // Every frame: update the "Nearby" box and the E bubble, and announce changes once
  updateProximity(){
    if(this.picObj){
      const pl = this.player;
      const away = this.picObj === SPILL
        ? !(this.s.spill && this.nearSpill(pl, 30))
        : distToRect(pl.x, pl.y, this.picObj) > 38;
      if(away) this.showPic(null);
    }
    const p = this.player, target = this.actionTarget(), o = this.nearest();
    $('near').textContent = target ? `${target.label} (press E)` : (o ? o.label : 'Nothing within reach.');
    const msg = target ? target.label + '. Press E.' : (o ? o.label : '');
    if(msg !== this.s.nearMsg){ this.s.nearMsg = msg; if(msg){ announce(msg); speakText(msg); } }
    this.prompt.setVisible(!!target).setPosition(p.x, p.y - DOT_R - (NET.on ? 36 : 10)).setText('E');   // above the name tag in two-player mode
  },
};
