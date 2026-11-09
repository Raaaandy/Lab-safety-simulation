// render.js: drawing. The map, the spill, the guide ring, the side-panel status and the end screen.
// These functions are added to the Lab scene (see scene.js), so `this` is the scene.

const RenderMethods = {

  // Draw the floor plan from the data in data.js
  drawMap(){
    const g = this.mapG; g.clear();
    const fill   = {hood:'--hood', flam:'--flam', wash:'--wash', cab:'--cab', hot:'--flam', cold:'--cab',
                    cubby:'--obj', bench:'--obj', equip:'--obj', table:'--obj'};
    const stroke = {hood:'--yellow', flam:'--red', wash:'--green', cab:'--blue', hot:'--red'};
    this.cameras.main.setBackgroundColor(css('--paper'));

    // drain trough (hatched)
    g.fillStyle(hex('--trough'),1).fillRect(TROUGH.x, TROUGH.y, TROUGH.w, TROUGH.h);
    g.lineStyle(1, hex('--line'), .5);
    for(let y = TROUGH.y; y < TROUGH.y+TROUGH.h; y += 7) g.lineBetween(TROUGH.x, y, TROUGH.x+TROUGH.w, y+5);

    // utility boxes
    g.lineStyle(1.5, hex('--line'), .7);
    UTILS.forEach(([x,y]) => g.strokeRect(x-11, y-8, 22, 16));

    // equipment
    OBJ.forEach(o => {
      g.fillStyle(hex(fill[o.kind] || '--obj'), 1).fillRect(o.x, o.y, o.w, o.h);
      g.lineStyle(stroke[o.kind] ? 3 : 1.5, hex(stroke[o.kind] || '--line'), 1).strokeRect(o.x, o.y, o.w, o.h);
    });

    // walls and exit markers
    g.fillStyle(hex('--line'), 1);
    WALLS.forEach(([x,y,w,h]) => g.fillRect(x, y, w, h));
    EXITS.forEach(e => g.fillStyle(hex('--green'),1).fillTriangle(e.x-8, e.y-6, e.x+8, e.y-6, e.x, e.y+6));

    // labels (tall objects get vertical labels)
    this.labels.forEach(t => t.destroy()); this.labels = [];
    const ink = css('--ink');
    OBJ.filter(o => o.label).forEach(o => {
      const vertical = o.h > o.w*1.5;
      const t = this.add.text(o.x+o.w/2, o.y+o.h/2, o.label, {fontFamily:'Atkinson Hyperlegible, sans-serif',
        fontSize: (o.w<30 || o.h<20) && !vertical ? '11px' : '14px', fontStyle:'bold', color:ink, align:'center'}).setOrigin(.5);
      if(vertical) t.setAngle(-90);
      this.labels.push(t);
    });
    if(this.player) this.children.bringToTop(this.player);
  },

  drawSpill(){
    const g = this.spillG; g.clear();
    if(!this.s.spill) return;
    g.fillStyle(0x6FB7E8, .75);
    g.fillCircle(SPILL.x, SPILL.y, SPILL.r); g.fillCircle(SPILL.x+18, SPILL.y+10, 13); g.fillCircle(SPILL.x-16, SPILL.y+12, 10);
    g.lineStyle(2, hex('--yellow'), 1).strokeCircle(SPILL.x, SPILL.y, SPILL.r+8);
  },

  // Pulsing ring around the current target (green, or red for urgent steps)
  drawTargetRing(time){
    this.ring.clear();
    if(!guide) return;
    const t = this.targetPoint(); if(!t) return;
    const pulse = 4*Math.sin(time/220);
    this.ring.lineStyle(3, hex(this.step.urgent ? '--red' : '--green'), .9).strokeCircle(t.x, t.y, t.r+pulse);
  },

  // Side panel: task card, PPE / carrying / score chips
  refreshHUD(){
    const st = this.step;
    $('stepNo').textContent = st ? `Step ${this.s.step+1} of ${STEPS.length}` : 'Complete';
    $('task').textContent = st ? st.text : `Drill finished. Score ${this.s.score}/100.`;
    $('sign').classList.toggle('urgent', !!(st && st.urgent));
    $('chipPPE').textContent = this.s.ppe ? 'PPE on' : 'PPE off';
    $('chipPPE').classList.toggle('on', this.s.ppe);
    $('chipCarry').textContent = this.s.carry ? 'Carrying acetone' : (this.s.kit ? 'Carrying spill kit' : 'Hands empty');
    $('chipCarry').classList.toggle('on', this.s.carry || this.s.kit);
    $('chipScore').textContent = 'Score ' + this.s.score;
    if(this.pCarry) this.pCarry.setVisible(this.s.carry || this.s.kit).setFillStyle(hex(this.s.carry ? '--red' : '--yellow'));
  },

  // Countdown shown on the task card (hidden from screen readers; they get a 5-second warning instead)
  showTimer(){
    if(this.s.timer === null){ $('timer').hidden = true; return; }
    $('timer').hidden = false;
    $('timer').textContent = Math.max(0, this.s.timer).toFixed(1) + ' s';
  },

  showEndScreen(secs){
    const v = this.s.violations, ink = css('--ink'), font = 'Atkinson Hyperlegible, sans-serif';
    $('timer').hidden = true; this.refreshHUD();
    this.add.rectangle(W/2, H/2, 520, 260, hex('--surface'), .96).setStrokeStyle(4, hex('--green')).setDepth(20);
    this.add.text(W/2, H/2-70, 'You made it out.', {fontFamily:font, fontSize:'34px', fontStyle:'bold', color:ink}).setOrigin(.5).setDepth(21);
    this.add.text(W/2, H/2+10, `Score ${this.s.score}/100 in ${secs} s\n${v.length} violation${v.length===1?'':'s'} — see the event log`,
      {fontFamily:font, fontSize:'20px', color:ink, align:'center'}).setOrigin(.5).setDepth(21);
    this.add.text(W/2, H/2+80, 'Press Restart to try again', {fontFamily:font, fontSize:'16px', color:css('--muted')}).setOrigin(.5).setDepth(21);
  },
};
