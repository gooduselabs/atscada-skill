// Standard 2D equipment symbols for SCADA diagrams (P&ID / single-line practice): plain outlines, one fill that shows
// the state, no perspective, no decoration. Every symbol is drawn around its centre (cx, cy) with size r.
//
//   const sym = require('./lib/symbols')(M.C);
//   sym.pump(s, 'P1', 400, 300, 26, { state: 'Pump1.State' });          // fill: grey stopped / green running / red fault
//   sym.breaker(s, 'CB1', 400, 180, 14, { on: 'Feeder1.Closed' });      // fill follows a 0/1 tag
//   sym.tank(s, 'T1', 700, 200, 120, 220, { level: 'Tank1.Level', max: 100, low: 20, high: 90 });
//
// Options common to all: state = tag 0 stopped / 1 running / 2 fault;  on = tag 0/1 (use one or the other);
//                        run = tag 1 while turning: adds a slow rotation of the impeller mark (pump, fan, motor only -
//                        leave it out unless the running state must be visible from far away).
// State colours come from the palette: C.stop, C.run, C.fault. Tell the user the convention you used (some plants use
// red = running / green = stopped); swap C.run and C.fault-like colours in model.js to follow the site standard.
'use strict';
const lib = require('./svglib');

module.exports = function (palette) {
  const C = Object.assign({}, lib.DEFAULT_PALETTE, palette || {});
  const { b2, st3 } = lib;
  const SW = 2;                                             // outline width
  const O = `stroke="${C.text}" stroke-width="${SW}"`;      // outline

  // registers the state fill of the body and returns its id
  function body(s, id, opt) {
    const b = s.id(id + '_B');
    if (opt.state) s.color(b, opt.state, st3(C.stop, C.run, C.fault));
    else if (opt.on) s.color(b, opt.on, b2(C.stop, C.run));
    return b;
  }
  // optional rotating mark
  function spin(s, id, opt, inner) {
    if (!opt.run) { s.a(inner); return; }
    const r = s.id(id + '_R'); s.play(r, opt.run);
    s.a(`<g id="${r}" class="es-a es-spin">${inner}</g>`);
  }
  const tagText = (s, cx, y, label) => { if (label) s.text(cx, y, label, 13, C.sub, { anchor: 'middle' }); };

  return {
    // centrifugal pump: circle with a discharge triangle
    pump(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<circle id="${b}" cx="${cx}" cy="${cy}" r="${r}" fill="${C.stop}" ${O}/>`);
      spin(s, id, opt, `<path d="M${cx - r * 0.5} ${cy - r * 0.55} L${cx + r * 0.75} ${cy} L${cx - r * 0.5} ${cy + r * 0.55} Z" fill="none" stroke="${C.bg}" stroke-width="${SW}"/>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // motor: circle with M
    motor(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<circle id="${b}" cx="${cx}" cy="${cy}" r="${r}" fill="${C.stop}" ${O}/><text x="${cx}" y="${cy + r * 0.36}" font-size="${r}" font-weight="700" text-anchor="middle" fill="${C.bg}">M</text>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // fan / blower: circle with three blades
    fan(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<circle id="${b}" cx="${cx}" cy="${cy}" r="${r}" fill="${C.stop}" ${O}/>`);
      let blades = '';
      for (let i = 0; i < 3; i++) { const a = i * 2 * Math.PI / 3; blades += `<line x1="${cx}" y1="${cy}" x2="${(cx + Math.cos(a) * r * 0.78).toFixed(1)}" y2="${(cy + Math.sin(a) * r * 0.78).toFixed(1)}" stroke="${C.bg}" stroke-width="${SW + 1}"/>`; }
      spin(s, id, opt, blades);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // compressor: circle with two converging lines
    compressor(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<circle id="${b}" cx="${cx}" cy="${cy}" r="${r}" fill="${C.stop}" ${O}/>` +
        `<path d="M${cx - r * 0.7} ${cy - r * 0.6} L${cx + r * 0.7} ${cy - r * 0.25} M${cx - r * 0.7} ${cy + r * 0.6} L${cx + r * 0.7} ${cy + r * 0.25}" stroke="${C.bg}" stroke-width="${SW}"/>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // valve: bow-tie. opt.on = open (1) / closed (0); opt.vertical for a valve on a vertical line
    valve(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      const d = opt.vertical
        ? `M${cx - r * 0.7} ${cy - r} L${cx + r * 0.7} ${cy - r} L${cx - r * 0.7} ${cy + r} L${cx + r * 0.7} ${cy + r} Z`
        : `M${cx - r} ${cy - r * 0.7} L${cx - r} ${cy + r * 0.7} L${cx + r} ${cy - r * 0.7} L${cx + r} ${cy + r * 0.7} Z`;
      s.a(`<path id="${b}" d="${d}" fill="${C.stop}" ${O} stroke-linejoin="round"/>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // circuit breaker / switch on a single-line diagram: square. opt.on = closed (1) / open (0)
    breaker(s, id, cx, cy, r, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<rect id="${b}" x="${cx - r}" y="${cy - r}" width="${r * 2}" height="${r * 2}" fill="${C.stop}" ${O}/>`);
      if (opt.label) s.text(cx + r + 8, cy + 5, opt.label, 13, C.sub);
    },
    // two-winding transformer: two overlapping circles (vertical)
    transformer(s, id, cx, cy, r, opt = {}) {
      s.a(`<circle cx="${cx}" cy="${cy - r * 0.6}" r="${r}" fill="none" ${O}/><circle cx="${cx}" cy="${cy + r * 0.6}" r="${r}" fill="none" ${O}/>`);
      if (opt.label) s.text(cx + r + 10, cy + 5, opt.label, 13, C.sub);
    },
    // measuring point: circle with a letter (P, T, F, L, kW...)
    meter(s, id, cx, cy, r, letter, opt = {}) {
      s.a(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.panel2 || C.bg}" ${O}/><text x="${cx}" y="${cy + r * 0.3}" font-size="${Math.round(r * 0.8)}" font-weight="600" text-anchor="middle" fill="${C.text}">${letter}</text>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // incoming supply (grid): arrow into the diagram
    source(s, id, cx, cy, r, opt = {}) {
      s.a(`<path d="M${cx - r} ${cy - r} L${cx + r} ${cy - r} L${cx} ${cy + r * 0.6} Z" fill="none" ${O} stroke-linejoin="round"/>`);
      if (opt.label) s.text(cx, cy - r - 8, opt.label, 13, C.sub, { anchor: 'middle' });
    },
    // busbar: thick horizontal bar
    busbar(s, x1, x2, y, label) {
      s.a(`<line x1="${x1}" y1="${y}" x2="${x2}" y2="${y}" stroke="${C.text}" stroke-width="6"/>`);
      if (label) s.text(x2, y - 12, label, 13, C.sub, { anchor: 'end' });
    },
    // vessel / tank with a level bar inside. opt.level = tag, opt.max; amber below opt.low or above opt.high
    tank(s, id, x, y, w, h, opt = {}) {
      s.a(`<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.panel2 || C.bg}" ${O}/>`);
      if (opt.level) s.vbar(id, opt.level, x + 6, y + 6, w - 12, h - 12, opt.max || 100,
        `${opt.low === undefined ? 0 : opt.low}-${C.warn},${C.stop},${opt.high === undefined ? 999999 : opt.high}-${C.warn}`);
      tagText(s, x + w / 2, y + h + 18, opt.label);
    },
    // conveyor: two rollers and a belt
    conveyor(s, id, x, y, w, opt = {}) {
      const b = body(s, id, opt), r = 9;
      s.a(`<rect id="${b}" x="${x}" y="${y - r}" width="${w}" height="${r * 2}" rx="${r}" fill="${C.stop}" ${O}/>` +
        `<circle cx="${x + r}" cy="${y}" r="${r - 4}" fill="${C.bg}"/><circle cx="${x + w - r}" cy="${y}" r="${r - 4}" fill="${C.bg}"/>`);
      tagText(s, x + w / 2, y + r + 18, opt.label);
    },
    // heat exchanger: circle with a zig-zag
    exchanger(s, id, cx, cy, r, opt = {}) {
      s.a(`<circle cx="${cx}" cy="${cy}" r="${r}" fill="${C.panel2 || C.bg}" ${O}/>` +
        `<path d="M${cx - r} ${cy} L${cx - r * 0.5} ${cy - r * 0.5} L${cx} ${cy + r * 0.5} L${cx + r * 0.5} ${cy - r * 0.5} L${cx + r} ${cy}" fill="none" ${O}/>`);
      tagText(s, cx, cy + r + 18, opt.label);
    },
    // generic machine: labelled rectangle whose fill is the state (use when no standard symbol fits)
    unit(s, id, x, y, w, h, label, opt = {}) {
      const b = body(s, id, opt);
      s.a(`<rect id="${b}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.stop}" ${O}/>`);
      s.text(x + w / 2, y + h / 2 + 5, label, 14, C.bg, { anchor: 'middle', weight: 700 });
    },
  };
};
