// utils.js: small helpers used everywhere.

// Shortcut for document.getElementById
const $ = id => document.getElementById(id);

// Read a colour (or any value) defined in css/style.css, e.g. css('--blue')
const css = name => getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// The same colour as a number, which is what Phaser drawing functions expect
const hex = name => Phaser.Display.Color.HexStringToColor(css(name)).color;

// Distance from a point to the nearest edge of a rectangle {x, y, w, h} (0 if inside)
function distToRect(px, py, o){
  const dx = Math.max(o.x - px, 0, px - (o.x + o.w));
  const dy = Math.max(o.y - py, 0, py - (o.y + o.h));
  return Math.hypot(dx, dy);
}

// Turn an offset into a compass word. North is the top of the map.
function compass(dx, dy){
  const angle = (Math.atan2(dx, -dy) * 180 / Math.PI + 360) % 360;
  return ['north','north-east','east','south-east','south','south-west','west','north-west'][Math.round(angle / 45) % 8];
}
