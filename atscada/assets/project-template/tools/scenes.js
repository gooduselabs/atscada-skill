// SVG diagrams of the project (EXAMPLE: two incomers on one busbar). One function per diagram, each returns an Svg.
// The look comes from SVG_STYLE in model.js (ask the user); the code below is the same for every style. Layout: the canvas is sized to the content and the panels FILL it:
// title band, a row of panels with equal gaps and margins, one footer line. See references/svg.md and design.md.
'use strict';
const M = require('./model');
const { Svg, C, grid } = require('./lib/svglib')(M.C);
const sym = require('./lib/symbols')(M.C);

function overviewSvg() {
  const W = 1600, H = 676, MARGIN = 24, GAP = 16, TOP = 80, BODY = 532;
  const s = new Svg(W, H);
  s.header('DEMO PLANT', 'Power overview');
  s.tiles(M.METERS.map(m => [m.name.toUpperCase() + ' POWER', `TXT_T_${m.id}`, `${m.id}.Power_P`, 'kW']));

  // ---- left: single-line diagram --------------------------------------------------------------------------------
  const sw = 560;
  s.panel(MARGIN, TOP, sw, BODY, 'SINGLE-LINE DIAGRAM');
  const busY = TOP + 370, x1 = MARGIN + 60, x2 = MARGIN + sw - 60;
  M.METERS.forEach((m, i) => {
    const cx = Math.round(x1 + (x2 - x1) * (i + 0.5) / M.METERS.length), X = m.id;
    sym.source(s, `SRC_${X}`, cx, TOP + 100, 16, { label: m.name });
    s.line(`${cx},${TOP + 110} ${cx},${TOP + 196}`);
    sym.meter(s, `MTR_${X}`, cx, TOP + 220, 24, 'kW');
    s.line(`${cx},${TOP + 244} ${cx},${busY}`);
    s.num(`TXT_S_${X}`, `${X}.Power_P`, cx + 104, TOP + 227, 22); s.text(cx + 110, TOP + 227, 'kW', 13, C.sub);
    s.warn(`ALM_S_${X}`, `${X}.Power_P`, `${X}_Cfg.Lo_Power_P`, `${X}_Cfg.Hi_Power_P`, cx - 52, TOP + 208);
  });
  sym.busbar(s, x1, x2, busY, 'MAIN BUSBAR');
  for (let k = 0; k < 4; k++) {                                   // outgoing feeders (static: not measured in this example)
    const fx = Math.round(x1 + 40 + (x2 - x1 - 80) * k / 3);
    s.line(`${fx},${busY} ${fx},${busY + 96}`);
    s.a(`<path d="M${fx - 7} ${busY + 96} h14 l-7 12 z" fill="${C.pipe}"/>`);
  }
  s.text(MARGIN + sw / 2, busY + 136, 'TO LOADS', 13, C.sub, { anchor: 'middle', ls: 1 });

  // ---- right: one panel per meter, filling the rest of the width --------------------------------------------------
  const cells = grid(M.METERS.length, { x: MARGIN + sw + GAP, y: TOP, w: W - MARGIN * 2 - sw - GAP, h: BODY }, { cols: M.METERS.length, gap: GAP });
  M.METERS.forEach((m, i) => {
    const X = m.id, c = cells[i], L = c.x + 20, R = c.x + c.w - 20, y = s.panel(c.x, c.y, c.w, c.h, m.name.toUpperCase());
    s.text(L, y + 12, 'Active power', 14, C.sub);                 // C.Q(...) below: accent colour only in styles that have one
    s.num(`TXT_${X}_P`, `${X}.Power_P`, R - 44, y + 62, 48, C.Q('power')); s.text(R - 36, y + 62, 'kW', 18, C.sub);
    s.warn(`ALM_${X}`, `${X}.Power_P`, `${X}_Cfg.Lo_Power_P`, `${X}_Cfg.Hi_Power_P`, L + 12, y + 30, 24);
    s.bar(`BAR_${X}_P`, `${X}.Power_P`, L, y + 80, c.w - 40, 10, 150, null, 100);
    s.a(`<line x1="${L}" y1="${y + 110}" x2="${R}" y2="${y + 110}" stroke="${C.line}"/>`);

    const cV = c.x + c.w * 0.58, cI = R - 20;                     // right edges of the two number columns
    s.text(cV, y + 136, 'Voltage', 13, C.sub, { anchor: 'end' }); s.text(cV + 6, y + 136, 'V', 13, C.sub);
    s.text(cI, y + 136, 'Current', 13, C.sub, { anchor: 'end' }); s.text(cI + 6, y + 136, 'A', 13, C.sub);
    ['L1', 'L2', 'L3'].forEach((l, k) => {
      const ry = y + 170 + k * 34;
      s.text(L, ry, l, 15, C.sub, { weight: 600 });
      s.num(`TXT_${X}_V${l}`, `${X}.Voltage_${l}`, cV, ry, 20);
      s.num(`TXT_${X}_I${l}`, `${X}.Current_${l}`, cI, ry, 20);
    });
    s.a(`<line x1="${L}" y1="${y + 262}" x2="${R}" y2="${y + 262}" stroke="${C.line}"/>`);
    s.kv(L, y + 294, 'Power factor', `TXT_${X}_PF`, `${X}.PF`, '', R - 44);
    s.text(L, y + 328, 'Total energy', 14, C.sub); s.num(`TXT_${X}_E`, `${X}.Energy_total`, R - 44, y + 328, 18, C.Q('energy')); s.text(R - 38, y + 328, 'kWh', 13, C.sub);
    s.a(`<line x1="${L}" y1="${y + 350}" x2="${R}" y2="${y + 350}" stroke="${C.line}"/>`);
    s.text(L, y + 378, 'ALARM LIMITS', 12, C.mute, { ls: 1 });
    s.kv(L, y + 410, 'Power high', `TXT_${X}_HI`, `${X}_Cfg.Hi_Power_P`, 'kW', R - 44);
    s.kv(L, y + 444, 'Power low', `TXT_${X}_LO`, `${X}_Cfg.Lo_Power_P`, 'kW', R - 44);
    s.hit(`LINK_${X}`, `${X}_Cfg.Link`, c.x, c.y, c.w, c.h);       // LAST: the click area lies on top of the panel
  });

  // ---- footer: navigation left, legend right -------------------------------------------------------------------------
  let bx = MARGIN;
  for (const [id, label, w] of [['History', 'History', 130], ['Alarm', 'Alarms', 130], ['Setting', 'Settings', 130]]) { s.navBtn(`NAV_${id}`, `Nav.${id}`, bx, TOP + BODY + 16, w, label); bx += w + 10; }
  s.text(W / 2, TOP + BODY + 38, 'Click a meter panel for details', 13, C.mute, { anchor: 'middle' });
  s.legend(W - MARGIN, TOP + BODY + 38, [[C.fault, 'Outside alarm limits'], [C.warn, 'Above 100 kW']]);
  return s;
}

module.exports = { overviewSvg };
