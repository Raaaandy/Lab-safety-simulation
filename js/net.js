// net.js: optional two-player co-op on two laptops (see TWO-PLAYER.md).
// Only switches on when the page is served by server.py. Opened any other way (double-click,
// GitHub Pages) the join fails silently and the game stays exactly single-player.
// Player 1 (host) runs all drill logic. Player 2 (guest) moves locally, sends its position,
// E presses and running violations, and draws the drill from the host's snapshot.
// NetMethods at the bottom are added to the Lab scene (see scene.js), so `this` is the scene.

const NET = {on:false, role:1, id:null, peer:null, peerSeen:0, out:[], inbox:[], busy:false,
             game:null, lastRun:null, staleRun:null, roleChanged:false};
const peerOnline = () => NET.on && !!NET.peer && Date.now() - NET.peerSeen < 1500;
const pname = pn => 'Player ' + pn;
const send = m => { if(NET.on) NET.out.push(m); };

// The one message path for game events. Logs locally (Latest bar, event log, screen reader,
// read aloud) and sends the same text to the partner, who logs it the same way.
// to = 0 for both players, or a player number to tell only that player.
function say(msg, cls=null, to=0){
  const me = NET.on ? NET.role : 1;
  if(to === 0 || to === me) log(msg, cls);
  if(NET.on && to !== me) send({t:'log', msg, cls});
}

async function post(path, body, ms=2000){
  const ctl = new AbortController(), timer = setTimeout(() => ctl.abort(), ms);
  try{
    return await fetch(path, {method:'POST', headers:{'Content-Type':'application/json'},
                              body:JSON.stringify(body || {}), signal:ctl.signal});
  } finally { clearTimeout(timer); }
}

// Called once before the game starts. Any failure means single-player.
async function netJoin(){
  if(!location.protocol.startsWith('http') || location.hostname.endsWith('github.io')) return;
  try{
    const r = await post('/api/join');
    if(!r.ok) return;
    const j = await r.json();
    if(j.role === 0){ NET.full = true; return; }
    if(!j.role || !j.id) return;
    Object.assign(NET, {on:true, role:j.role, id:j.id});
    addEventListener('pagehide', () => navigator.sendBeacon('/api/leave', JSON.stringify({id:NET.id})));
    await netTick();                 // learn whether a partner is already here before the scene starts
    setInterval(netTick, 100);
  }catch(e){}
}

// ~10 times a second: send my position (and the host's snapshot), get the partner's and any messages
async function netTick(){
  if(NET.busy || !NET.on) return;
  NET.busy = true;
  const sc = NET.game && NET.game.scene.getScene('lab');
  const ready = sc && sc.player && sc.s;
  const out = NET.out.splice(0);
  const body = {id:NET.id, out,
    pos: ready ? {x:sc.player.x, y:sc.player.y, r:sc.player.rotation} : null,
    share: ready && !sc.guest ? sc.snapshot() : null};
  try{
    const r = await post('/api/sync', body);
    if(r.status === 410) await rejoin();         // the server forgot us (laptop slept, server restarted)
    else {
      const j = await r.json();
      NET.peer = j.peer || null;
      if(j.peer) NET.peerSeen = Date.now();
      NET.inbox.push(...(j.inbox || []));
    }
  }catch(e){ NET.out.unshift(...out); }
  NET.busy = false;
}

async function rejoin(){
  const j = await (await post('/api/join')).json();
  if(!j.role){ NET.on = false; NET.peer = null; return; }
  if(j.role !== NET.role) NET.roleChanged = true;
  Object.assign(NET, {role:j.role, id:j.id});
}

const NetMethods = {

  team(){ return peerOnline(); },
  players(){ return this.team() ? [1, 2] : [this.me]; },
  posOf(pn){
    if(pn === this.me) return {x:this.player.x, y:this.player.y};
    return NET.peer && NET.peer.pos ? NET.peer.pos : null;
  },

  // What the host shares with the guest
  snapshot(){
    const s = this.s;
    return {run:s.run, step:s.step, score:s.score, spill:s.spill, timer:s.timer, timerFailed:s.timerFailed,
            warned:s.warned, done:s.done, splashed:s.splashed, secs:s.secs, flags:s.flags, violations:s.violations,
            elapsed:(this.time.now - s.t0) / 1000, ps:this.ps};
  },

  // Guest: copy the host's snapshot into this scene
  applyShare(sh){
    if(!sh || sh.run === NET.staleRun) return;
    NET.lastRun = sh.run;
    const key = JSON.stringify([sh.step, sh.score, sh.spill, sh.splashed, sh.done, sh.ps]);
    const stepChanged = sh.step !== this.shownStep;
    const warned = this.s.warned && !stepChanged;
    Object.assign(this.s, sh, {t0:this.time.now - sh.elapsed*1000, warned});
    this.ps = sh.ps;
    if(stepChanged){
      this.shownStep = sh.step;
      this.stepFx();
      if(this.step) log(this.stepText(), this.step.urgent ? 'bad' : null);
    } else if(this.s.spill !== this.spillShown) this.drawSpill();
    this.spillShown = this.s.spill;
    if(sh.done && !this.endShown){ this.endShown = true; this.player.body.setVelocity(0); this.showEndScreen(sh.secs); }
    if(key !== this.shareKey){ this.shareKey = key; this.refreshHUD(); }
  },

  // Handle one message from the partner. Returns true if the scene is restarting.
  onNet(m){
    if(m.t === 'log') log(m.msg, m.cls);
    else if(m.t === 'fx'){ beep(220, .25); if(m.shake) this.cameras.main.shake(180, .004); }
    else if(m.t === 'act' && !this.guest) this.act(this.other, {x:m.x, y:m.y});
    else if(m.t === 'run' && !this.guest) this.violate(m.key, m.msg, this.other);
    else if(m.t === 'restart'){
      if('speechSynthesis' in window) speechSynthesis.cancel();
      this.scene.restart();
      return true;
    }
    return false;
  },

  // Every frame: messages, the partner's circle, connects / disconnects, the host's snapshot.
  // Returns true if the scene is restarting.
  updateNet(){
    if(!NET.on && !this._online) return false;
    if(NET.roleChanged){ NET.roleChanged = false; this.scene.restart(); return true; }
    while(NET.inbox.length) if(this.onNet(NET.inbox.shift())) return true;

    const online = peerOnline(), q = online && NET.peer.pos;
    this.partner.setVisible(!!q); this.qTag.setVisible(!!q);
    if(q){
      this.partner.x += (q.x - this.partner.x) * .35;
      this.partner.y += (q.y - this.partner.y) * .35;
      this.partner.rotation = q.r || 0;
      this.qTag.setPosition(this.partner.x, this.partner.y - DOT_R - 12);
    }

    if(online !== this._online){
      this._online = online;
      if(online){
        // Partner joined mid-drill (or this guest was playing alone): start again together
        if(!this.guest && NET.role === 2){ NET.staleRun = NET.lastRun; this.scene.restart(); return true; }
        if(!this.guest && (this.s.step > 0 || this.s.done)){ send({t:'restart'}); this.scene.restart(); return true; }
        log(`${pname(this.other)} connected. You are ${pname(this.me)}, the blue circle; your partner is the orange circle.`, 'good');
        if(!this.guest && this.step) log(this.stepText(), this.step.urgent ? 'bad' : null);
      } else {
        log(`${pname(this.other)} disconnected. You can keep playing on your own.`);
        this.partnerLeft();
      }
      this.refreshHUD();
    }
    if(this.guest && NET.peer) this.applyShare(NET.peer.share);
    return false;
  },

  // Partner gone: carry on single-player from where the drill is
  partnerLeft(){
    this.guest = false;                     // a guest now runs the drill itself
    const P = this.ps[this.me], Q = this.ps[this.other];
    if(Q.carry || Q.kit){
      P.carry = P.carry || Q.carry; P.kit = P.kit || Q.kit; Q.carry = Q.kit = false;
      log(`You take over what ${pname(this.other)} was carrying.`);
    }
    if(this.s.splashed === this.other) this.s.splashed = this.me;
    if(!this.s.done && this.step && this.step.id === 'ppe' && P.ppe) this.advance();
  },
};
