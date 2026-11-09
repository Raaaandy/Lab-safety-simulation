// data.js: the room and the drill script.
// To change the room or the drill, you usually only need to edit this file.
// Coordinates are pixels on the traced floor plan (BNS_035_Floor_Plan.pdf); 1 px is about 1.8 cm.
// Rectangles are [x, y, width, height]; x grows to the right, y grows downward (north is up).

const W = 770, H = 1120, M_PER_PX = 0.018;
const WALLS = [
  [22,22,68,4],[155,22,440,4],[650,22,94,4],             // top (door gaps at 90–155, 595–650)
  [22,22,4,82],[22,102,68,4],[86,102,4,395],[22,495,68,4],[22,495,4,392],[22,885,77,4],[95,885,4,217], // left
  [95,1099,515,4],[680,1035,64,68],                        // bottom (door gap 610–680)
  [740,22,4,118],[740,190,4,795]                           // right (door gaps 140–190, 985–1035)
];
const EXITS = [
  {name:'top-left door',x:122,y:14},{name:'top-right door',x:622,y:14},
  {name:'east door (upper)',x:754,y:165},{name:'east door (lower)',x:754,y:1010},{name:'south door',x:645,y:1110}
];
// kind controls colour + whether it is solid
const OBJ = [
  {id:'hood',label:'Fume Hoods',x:155,y:26,w:198,h:52,kind:'hood',note:'Work with volatile or toxic chemicals here, sash lowered to the marked height.'},
  {id:'pdpump',label:'PD Pump',x:416,y:26,w:90,h:46,kind:'equip',note:'Positive displacement pump. Never run against a closed outlet valve.'},
  {id:'benchT',label:'Bench',x:520,y:26,w:75,h:52,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'cubbyA',label:'Cubbies',x:650,y:26,w:60,h:18,kind:'cubby',note:'Store bags here and put on goggles, lab coat and gloves.'},
  {id:'cubbyB',label:'Cubbies',x:722,y:40,w:18,h:58,kind:'cubby',note:'Store bags here and put on goggles, lab coat and gloves.'},
  {id:'flamTop',label:'',x:185,y:145,w:92,h:20,kind:'equip',note:'Storage shelf.'},
  {id:'flam',label:'Flammables',x:185,y:182,w:42,h:85,kind:'flam',note:'Flammables cabinet. Keep doors closed; return containers right after use.'},
  {id:'freezer',label:'-80° Freezer',x:237,y:168,w:42,h:98,kind:'cold',note:'Ultra-low freezer. Wear cryo gloves; frostbite risk on contact.'},
  {id:'flamBot',label:'',x:185,y:270,w:92,h:20,kind:'equip',note:'Storage shelf.'},
  {id:'fluid',label:'Fluid Friction',x:402,y:232,w:25,h:124,kind:'equip',note:'Fluid friction rig. Check fittings for leaks before running.'},
  {id:'tote',label:'Pump Tote',x:364,y:356,w:62,h:40,kind:'equip',note:'Water tote. Wipe up drips; wet floors are a slip hazard.'},
  {id:'centri',label:'Centrifugal Pump',x:343,y:405,w:64,h:135,kind:'equip',note:'Centrifugal pump. Keep guards on and loose clothing away from the shaft.'},
  {id:'benchL1',label:'Bench',x:204,y:357,w:54,h:100,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'benchL2',label:'Bench',x:207,y:510,w:48,h:98,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'osm',label:'OSM/4000',x:88,y:385,w:37,h:112,kind:'equip',note:'OSM/4000 unit.'},
  {id:'benchW',label:'Bench',x:42,y:498,w:55,h:100,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'gc',label:'GC Bench',x:42,y:600,w:55,h:135,kind:'bench',note:'Gas chromatograph. Compressed gas lines; check cylinders are chained.'},
  {id:'bump',label:'Bumpout',x:26,y:499,w:16,h:261,kind:'equip',note:'Wall bump-out.'},
  {id:'box',label:'',x:213,y:690,w:33,h:32,kind:'equip',note:'Structural column.'},
  {id:'sink',label:'Sink',x:26,y:760,w:50,h:97,kind:'wash',note:'Sink. Wash your hands before leaving the lab.'},
  {id:'eyewash',label:'Eyewash',x:310,y:566,w:60,h:42,kind:'wash',note:'Eyewash station. Flush eyes for at least 15 minutes after a splash.'},
  {id:'dvi',label:'DVI/3000',x:298,y:773,w:66,h:37,kind:'equip',note:'DVI/3000 unit.'},
  {id:'coldisp',label:'Column Display',x:311,y:811,w:54,h:101,kind:'equip',note:'Distillation column display.'},
  {id:'piping',label:'Piping',x:365,y:844,w:98,h:14,kind:'equip',note:'Overhead piping run. Mind your head and step.'},
  {id:'gantry',label:'Gantry',x:239,y:913,w:125,h:47,kind:'equip',note:'Gantry crane. Stay clear of suspended loads.'},
  {id:'tableW',label:'Table',x:99,y:887,w:82,h:40,kind:'table',note:'Work table.'},
  {id:'steam',label:'Steam Bench',x:109,y:1052,w:182,h:47,kind:'hot',note:'Steam bench. Hot surfaces and an ignition source; keep solvents away.'},
  {id:'column',label:'Column',x:291,y:1057,w:43,h:42,kind:'equip',note:'Column base.'},
  {id:'hx',label:'Heat Exchange',x:334,y:1047,w:100,h:52,kind:'hot',note:'Heat exchanger. Hot lines; do not touch without heat-resistant gloves.'},
  {id:'blue',label:'Blue Cabinet',x:514,y:1064,w:94,h:35,kind:'cab',note:'Blue cabinet. In this demo it holds the spill kit.'},
  {id:'benchR1',label:'Bench',x:508,y:247,w:55,h:100,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'benchR2',label:'Bench',x:508,y:392,w:55,h:100,kind:'bench',note:'Open bench. No volatile solvent dispensing here.'},
  {id:'rap',label:'RAP/4000',x:704,y:292,w:36,h:94,kind:'equip',note:'RAP/4000 unit.'},
  {id:'di',label:'DI',x:713,y:445,w:27,h:30,kind:'wash',note:'Deionised water tap.'},
  {id:'abs',label:'ABS/2000',x:712,y:552,w:28,h:62,kind:'equip',note:'ABS/2000 unit.'},
  {id:'colE1',label:'',x:712,y:200,w:28,h:36,kind:'equip',note:'Structural column.'},
  {id:'colE2',label:'',x:715,y:688,w:25,h:35,kind:'equip',note:'Structural column.'},
  {id:'tableE',label:'Table',x:580,y:846,w:98,h:40,kind:'table',note:'Work table.'},
];
const UTILS = [[502,266],[686,268],[313,512],[526,512],[680,510],[83,510],[89,822],[515,818],[309,1059]];
const TROUGH = {x:428,y:46,w:20,h:1052};
const SPILL = {x:290,y:478,r:24};

// The drill, in order. Each step needs:
//   id      a short name, used in drill.js (act) and rules.js
//   text    the instruction shown on the task card and read aloud
//   target  object ids from OBJ (or 'spill' / 'exit') that the guide ring points to
//   urgent  (optional) shows the task card in red
//   timer   (optional) seconds allowed before it counts as a violation
const STEPS = [
  {id:'ppe',   text:'Put on your PPE at the cubbies by the entrance.', target:['cubbyA','cubbyB']},
  {id:'get',   text:'Collect the acetone bottle from the flammables cabinet.', target:['flam']},
  {id:'hood',  text:'Dispense the acetone inside the fume hood.', target:['hood']},
  {id:'return',text:'Return the bottle to the flammables cabinet.', target:['flam']},
  {id:'kit',   text:'Spill by the benches! Fetch the spill kit from the blue cabinet.', target:['blue'], urgent:true},
  {id:'clean', text:'Clean up the spill. Don’t walk through it.', target:['spill'], urgent:true},
  {id:'eyewash',text:'A drop splashed into your eye. Reach the eyewash station below the centrifugal pump.', target:['eyewash'], urgent:true, timer:10},
  {id:'evac',  text:'Fire alarm. Leave by the nearest exit, don’t stop for belongings.', target:['exit'], urgent:true, timer:25},
];
