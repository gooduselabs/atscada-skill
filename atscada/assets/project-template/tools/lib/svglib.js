// SVG drawing library + tag links (atscada-svg...-item) for Fastweb diagrams.
// The LOOK is chosen per project (SVG_STYLE in model.js) - ask the user, do not assume:
//   'scada-dark'   SCADA / high-performance HMI (ISA-101 practice) on dark grey: neutral numbers, colour only for state and alarms
//   'scada-light'  the same on light grey
//   'dashboard'    modern dark dashboard: rounded panels, one accent colour per quantity
//   'illustrated'  dashboard colours + drawings of machines and plant buildings with moving parts (lib/art.js)
//   or the user's own plant standard: start from the nearest style and override colours in model.js
// Whatever the style: panels that fill the canvas, state shown by colour AND words, motion only while something runs.
//
//   const { Svg, C, b2, st3 } = require('./lib/svglib')(M.C);
//   const s = new Svg(1600, 700);                                   // size the canvas to the content (see grid())
//   s.header('PUMP STATION 1', 'Overview');
//   s.num('TXT_P1_Flow', 'Pump1.Flow', 300, 200, 28);                // draws the <text> AND registers the tag link
//   W.svg('overview', s)                                             // lib/web.js embeds it in the page
//
// Every method that takes an id + tag does both jobs (element in the drawing, item in the web config), so a link can
// never point to an id that does not exist. Ids: letters, digits, underscore; unique inside the drawing and in the PAGE.
'use strict';

// Dark neutral palette (matches the web's dark mode). Colour meaning is fixed for the whole project:
//   run / stop / fault / warn = equipment state and alarms only;  link = things you can click;  everything else is grey.
const PALETTE_DARK = {
  bg: '#1b1f24', panel: '#242a31', panel2: '#2c333b', line: '#48515c', track: '#161a1e',
  text: '#e6e9ec', sub: '#9aa4af', mute: '#6b7682',
  run: '#3fb950', stop: '#8b949e', fault: '#e5484d', warn: '#f5a524', link: '#58a6ff',
  off: '#3a424c',                       // inactive lamp / empty state
  pipe: '#7d8894',                      // process lines, wires at rest
  // series colours for CHARTS on the web pages only (not for diagrams): distinguishable, not saturated
  pal: ['#58a6ff', '#3fb950', '#f5a524', '#e5484d', '#a78bfa', '#2dd4bf', '#fb923c', '#f472b6'],
  L1: '#d4a72c', L2: '#3fb950', L3: '#e5484d',
  r: 0,                                 // corner radius of panels
  q: {},                                // colour per quantity (power, energy, current, voltage, temp, flow, level); empty = neutral text
};
// Light neutral palette (classic ISA-101 grey). Use with at-dark-mode="false".
const PALETTE_LIGHT = {
  bg: '#d5d9dd', panel: '#e4e7ea', panel2: '#eef0f2', line: '#8e98a3', track: '#c3c9cf',
  text: '#1c2228', sub: '#4d5863', mute: '#77828d',
  run: '#1a7f37', stop: '#6e7781', fault: '#cf222e', warn: '#bf8700', link: '#0969da',
  off: '#b4bcc4', pipe: '#57606a',
  pal: ['#0969da', '#1a7f37', '#bf8700', '#cf222e', '#8250df', '#0f766e', '#bc4c00', '#bf3989'],
  L1: '#9a6700', L2: '#1a7f37', L3: '#cf222e',
  r: 0, q: {},
};
// Modern dark dashboard: deep blue background, rounded panels, one accent colour per quantity. Still flat (no gradients,
// shadows or glow) and the state colours keep their meaning.
const PALETTE_DASHBOARD = {
  bg: '#0b1220', panel: '#162033', panel2: '#1e293b', line: '#33445f', track: '#0b1424',
  text: '#f1f5f9', sub: '#8fa3c0', mute: '#64748b',
  run: '#42ec9d', stop: '#94a3b8', fault: '#ff6b7f', warn: '#ffd057', link: '#53b8ff',
  off: '#334155', pipe: '#64748b',
  pal: ['#38bdf8', '#4ade80', '#fbbf24', '#f87171', '#a78bfa', '#2dd4bf', '#fb923c', '#f472b6'],
  L1: '#4ade80', L2: '#fbbf24', L3: '#f87171',
  r: 12,
  q: { power: '#53b8ff', energy: '#fbbf24', current: '#f472b6', voltage: '#a78bfa', temp: '#fb923c', flow: '#22d3ee', level: '#22d3ee' },
};
// Illustrated: the dashboard colours plus machine / plant drawings with moving parts (lib/art.js). For show screens.
const PALETTE_ILLUSTRATED = Object.assign({}, PALETTE_DASHBOARD, { r: 16, art: true });
// Named styles for SVG_STYLE in model.js. ASK THE USER which look they want (or their own plant standard).
const STYLES = { 'scada-dark': PALETTE_DARK, 'scada-light': PALETTE_LIGHT, dashboard: PALETTE_DASHBOARD, illustrated: PALETTE_ILLUSTRATED };
const styleOf = name => { if (name && !STYLES[name]) throw new Error('unknown SVG style "' + name + '" - use one of: ' + Object.keys(STYLES).join(', ')); return STYLES[name || 'scada-dark']; };

const FONT = 'Segoe UI, Roboto, Arial, sans-serif';
const T = 'transparent';

// Colour map strings for the option attribute (at-bad) of atscada-svgvalue-item with at-type="Color".
// Rule used by the web: value < first key -> first colour; key[i] <= value <= key[i+1] -> colour of key[i+1];
// value > last key -> last colour. Keys are integers.
//   bool 0/1        -> b2(off, on)            = "1-<off>,2-<on>"
//   state 0/1/2     -> st3(stop, run, fault)  = "1-<stop>,1-<run>,2-<fault>"
//   analog ranges   -> "10-<c1>,40-<c2>,80-<c3>" written by hand
const b2 = (off, on) => `1-${off},2-${on}`;
const st3 = (stop, run, fault) => `1-${stop},1-${run},2-${fault}`;

// Cells that FILL a rectangle: n items in the given area, equal size, equal gaps. Use it instead of fixed card sizes
// so that no band of the canvas is left empty.   grid(8, { x: 24, y: 96, w: 1552, h: 520 }, { cols: 4, gap: 16 })
function grid(n, area, opt = {}) {
  const gap = opt.gap === undefined ? 16 : opt.gap;
  const cols = opt.cols || Math.ceil(Math.sqrt(n * (area.w / area.h) / (opt.aspect || 1.4)));
  const rows = Math.ceil(n / cols);
  const w = (area.w - gap * (cols - 1)) / cols, h = (area.h - gap * (rows - 1)) / rows;
  return Array.from({ length: n }, (_, i) => ({ x: Math.round(area.x + (i % cols) * (w + gap)), y: Math.round(area.y + Math.floor(i / cols) * (h + gap)), w: Math.round(w), h: Math.round(h), col: i % cols, row: Math.floor(i / cols) }));
}

module.exports = function (palette) {
  const C = Object.assign({}, PALETTE_DARK, palette || {});
  // C.Q(name) = accent colour of a quantity in styles that have one, otherwise the neutral text colour
  C.Q = name => (C.q && C.q[name]) || C.text;

  // Animations are PAUSED until a tag turns them on, so motion always means "running" / "flowing".
  // SCADA styles use only es-spin and es-flow, sparingly. The other classes serve the drawings of lib/art.js (illustrated style).
  const DEFS = `<defs>
<linearGradient id="es-steel" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cbd5e1"/><stop offset="1" stop-color="#64748b"/></linearGradient>
<linearGradient id="es-glass" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#1e3a5f"/><stop offset="1" stop-color="#0b1424"/></linearGradient>
<style>
.es-a{transform-box:fill-box;transform-origin:center}
.es-spin{animation:es-spin 2.4s linear infinite paused}
.es-flow{fill:none;stroke-dasharray:10 8;animation:es-flow 1.2s linear infinite paused}
.es-hold{animation:es-hold 1s linear infinite paused}
.es-sx{animation:es-sx 1.6s ease-in-out infinite paused}
.es-sy{animation:es-sy 1.2s ease-in-out infinite paused}
.es-swing{transform-origin:0% 100%;animation:es-swing 2.4s ease-in-out infinite paused}
.es-move{animation:es-move 3s linear infinite paused}
.es-rise{animation:es-rise 3s ease-out infinite paused}
.es-spark{transform-box:fill-box;transform-origin:center;animation:es-spark .5s ease-in-out infinite}
.es-hit{cursor:pointer}
.es-hit:hover{stroke:${C.link}}
@keyframes es-hold{to{opacity:1}}
@keyframes es-spin{to{transform:rotate(360deg)}}
@keyframes es-flow{to{stroke-dashoffset:-18}}
@keyframes es-sx{0%,100%{transform:translateX(0)}50%{transform:translateX(var(--d,12px))}}
@keyframes es-sy{0%,100%{transform:translateY(0)}50%{transform:translateY(var(--d,12px))}}
@keyframes es-swing{0%,100%{transform:rotate(0deg)}35%{transform:rotate(var(--r,-14deg))}70%{transform:rotate(var(--r2,8deg))}}
@keyframes es-move{0%{transform:translate(0,0);opacity:0}8%{opacity:1}92%{opacity:1}100%{transform:translate(var(--dx,100px),var(--dy,0px));opacity:0}}
@keyframes es-rise{0%{transform:translate(0,0) scale(.6);opacity:0}20%{opacity:.55}100%{transform:translate(var(--dx,14px),var(--dy,-46px)) scale(1.5);opacity:0}}
@keyframes es-spark{0%,100%{transform:scale(.6);opacity:.5}50%{transform:scale(1.25);opacity:1}}
</style></defs>`;

  class Svg {
    // Choose w x h to FIT THE CONTENT (16:9 is not required): the page scales the drawing to the column width.
    // opts.prefix: prepended to every id.
    constructor(w, h, opts = {}) {
      this.w = w; this.h = h; this.out = []; this.items = []; this.ids = new Set(); this.prefix = opts.prefix || ''; this.covered = 0;
      this.out.push(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid meet" font-family="${FONT}">`);
      this.out.push(DEFS);
      this.a(`<rect width="${w}" height="${h}" fill="${C.bg}"/>`);
    }
    a(s) { this.out.push(s); return this; }                                            // raw SVG
    id(name) {                                                                         // register an id; throws on a bad or repeated one
      name = this.prefix + name;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) throw new Error('SVG id not allowed: ' + name);
      if (this.ids.has(name)) throw new Error('duplicate SVG id: ' + name);
      this.ids.add(name); return name;
    }

    // ---- tag links (the element with this id must exist; the helpers below create it for you) ----
    _v(id, tag, prop, type, opt) {
      this.items.push({ el: 'atscada-svgvalue-item', a: { 'at-name': id, 'at-min': '0', 'at-type': type, 'at-max': '999999999', 'at-properties': prop, 'at-content': 'SVGValue Item', 'at-data-tag-name': tag, 'at-bad': opt } });
    }
    val(id, tag) { this._v(id, tag, 'Value', 'Double', ''); }                        // text content = tag value
    color(id, tag, map) { this._v(id, tag, 'Animation', 'Color', map); }             // fill by value, map from b2() / st3()
    play(id, tag) { this._v(id, tag, 'Animation', 'Rotate', 'Rotate'); }             // run the element's own CSS animation while tag = 1
    flow(id, tag) { this._v(id, tag, 'Animation', 'Conveyor', 'Conveyor'); }         // run a dashed-line animation while tag = 1
    // level bar: frame = reference rectangle, fill = the rectangle that grows; size = value / max
    cut(frame, fill, tag, max, attr) {
      this.items.push({ el: 'atscada-svgcutaway-item', a: { 'at-name': frame, 'at-id2': fill, 'at-min': '0', 'at-max': String(max), 'at-data-tag-name': tag, 'at-atribute': attr } });
    }
    // turns red and blinks while value > high-limit tag or < low-limit tag (the one place blinking is right: an alarm)
    alarm(id, tag, lowTag, highTag) {
      this.items.push({ el: 'atscada-svgalarm-item', a: { 'at-name': id, 'at-content': 'SVGAlarm Item', 'at-highalarm': highTag, 'at-Lowalarm': lowTag, 'at-data-tag-name': tag } });
    }
    // click = open the page whose URL ("#/location") is the VALUE of the tag (the desktop app writes it at start-up)
    link(id, tag) {
      this.items.push({ el: 'atscada-svghyperlink-item', a: { 'at-name': id, 'at-type': 'Link', 'at-color': C.link, 'at-data-tag-name': tag } });
    }
    // click = write to the tag. 'Switch' toggles 0/1; 'Analog' asks for a number.
    control(id, tag, type = 'Switch') {
      this.items.push({ el: 'atscada-svgcontrolvalue-item', a: { 'at-name': id, 'at-type': type, 'at-data-tag-name': tag } });
    }

    // ---- live elements ----
    // Number. Neutral colour by default: a value is not an alarm. Its whole text is overwritten, so the unit is a
    // separate static text(). Right aligned so that columns of numbers line up.
    num(id, tag, x, y, size, fill, opt = {}) {
      id = this.id(id); this.val(id, tag);
      this.a(`<text id="${id}" x="${x}" y="${y}" font-size="${size}" font-weight="${opt.weight || 600}" fill="${fill || C.text}" text-anchor="${opt.anchor || 'end'}">--</text>`);
    }
    // "label ........ value unit" on one line; xVal = right edge of the number
    kv(x, y, label, id, tag, unit, xVal, size = 18) {
      this.text(x, y, label, 14, C.sub);
      this.num(id, tag, xVal, y, size);
      if (unit) this.text(xVal + 6, y, unit, 13, C.sub);
    }
    // horizontal bar; colors = "lo-colourBelow,colourBetween,hi-colourAbove". Default: grey, amber above `warnAt`.
    bar(id, tag, x, y, w, h, max, colors, warnAt) {
      const f = this.id(id + '_FR'), l = this.id(id + '_LV');
      this.a(`<rect id="${f}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.track}" stroke="${C.line}"/>`);
      this.a(`<rect id="${l}" x="${x}" y="${y}" width="0" height="${h}" fill="${C.stop}"/>`);
      this.cut(f, l, tag, max, (colors || `0-${C.stop},${C.stop},${warnAt === undefined ? 999999 : warnAt}-${C.warn}`) + ';Dir=Right');
    }
    // vertical bar (tank level): colors as above, e.g. `20-${C.warn},${C.stop},90-${C.warn}` = amber outside 20..90
    vbar(id, tag, x, y, w, h, max, colors) {
      const f = this.id(id + '_FR'), l = this.id(id + '_LV');
      this.a(`<rect id="${f}" x="${x}" y="${y}" width="${w}" height="${h}" fill="${C.track}" stroke="${C.line}"/>`);
      this.a(`<rect id="${l}" x="${x}" y="${y + h}" width="${w}" height="0" fill="${C.stop}"/>`);
      this.cut(f, l, tag, max, (colors || `0-${C.stop},${C.stop},999999-${C.stop}`) + ';Dir=Up');
    }
    // State label for a 0/1/2 tag: a small filled square + the state in WORDS (never colour alone).
    // Three stacked <text>, two of them transparent at any time.
    state(id, tag, x, y, labels = ['STOPPED', 'RUNNING', 'FAULT'], size = 14) {
      const d = this.id(id + '_D'), s = this.id(id + '_S'), r = this.id(id + '_R'), f = this.id(id + '_F');
      this.a(`<rect id="${d}" x="${x}" y="${y - size + 2}" width="${size - 2}" height="${size - 2}" fill="${C.stop}"/>`);
      const tx = x + size + 6;
      this.a(`<text id="${s}" x="${tx}" y="${y}" font-size="${size}" font-weight="600" fill="${C.sub}">${labels[0]}</text>`);
      this.a(`<text id="${r}" x="${tx}" y="${y}" font-size="${size}" font-weight="600" fill="${T}">${labels[1]}</text>`);
      this.a(`<text id="${f}" x="${tx}" y="${y}" font-size="${size}" font-weight="600" fill="${T}">${labels[2]}</text>`);
      this.color(d, tag, st3(C.stop, C.run, C.fault));
      this.color(s, tag, st3(C.sub, T, T));
      this.color(r, tag, st3(T, C.run, T));
      this.color(f, tag, st3(T, T, C.fault));
    }
    // Same for a 0/1 tag
    state2(id, tag, x, y, labels = ['OFF', 'ON'], size = 14) {
      const d = this.id(id + '_D'), o = this.id(id + '_0'), n = this.id(id + '_1');
      this.a(`<rect id="${d}" x="${x}" y="${y - size + 2}" width="${size - 2}" height="${size - 2}" fill="${C.stop}"/>`);
      const tx = x + size + 6;
      this.a(`<text id="${o}" x="${tx}" y="${y}" font-size="${size}" font-weight="600" fill="${C.sub}">${labels[0]}</text>`);
      this.a(`<text id="${n}" x="${tx}" y="${y}" font-size="${size}" font-weight="600" fill="${T}">${labels[1]}</text>`);
      this.color(d, tag, b2(C.stop, C.run));
      this.color(o, tag, b2(C.sub, T));
      this.color(n, tag, b2(T, C.run));
    }
    // Alarm marker: a triangle that is invisible-grey when normal and turns red + blinks while the tag is outside its limits
    warn(id, tag, lowTag, highTag, x, y, size = 20) {
      id = this.id(id); this.alarm(id, tag, lowTag, highTag);
      const h = size * 0.87;
      this.a(`<path id="${id}" d="M${x} ${y} l${size / 2} ${h} h-${size} z" fill="${C.off}"/><text x="${x}" y="${y + h - 3}" font-size="${Math.round(size * 0.6)}" font-weight="700" text-anchor="middle" fill="${C.bg}">!</text>`);
    }
    // Process line / wire. With a tag: dashes move while tag = 1 (flow present). Without: static.
    line(pts, opt = {}) {
      const col = opt.color || C.pipe, w = opt.width || 3;
      if (!opt.tag) { this.a(`<polyline points="${pts}" fill="none" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`); return; }
      const id = this.id(opt.id); this.flow(id, opt.tag);
      this.a(`<polyline points="${pts}" fill="none" stroke="${C.track}" stroke-width="${w + 2}" stroke-linejoin="round"/>`);
      this.a(`<polyline id="${id}" class="es-flow" points="${pts}" stroke="${col}" stroke-width="${w}" stroke-linejoin="round"/>`);
    }
    // Clickable area: a transparent rectangle added LAST so it lies on top; hover shows an outline.
    hit(id, tag, x, y, w, h) {
      id = this.id(id); this.link(id, tag);
      this.a(`<rect id="${id}" class="es-hit" x="${x}" y="${y}" width="${w}" height="${h}" fill="transparent" stroke="transparent" stroke-width="2"/>`);
    }

    // ---- static building blocks ----
    text(x, y, s, size, fill, opt = {}) {
      this.a(`<text x="${x}" y="${y}" font-size="${size}" fill="${fill || C.text}"${opt.weight ? ` font-weight="${opt.weight}"` : ''}${opt.anchor ? ` text-anchor="${opt.anchor}"` : ''}${opt.ls ? ` letter-spacing="${opt.ls}"` : ''}>${esc(s)}</text>`);
    }
    // Flat panel with an optional caption bar. Returns the y where content can start.
    panel(x, y, w, h, title) {
      this.covered += w * h;
      this.a(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${C.r || 0}" fill="${C.panel}" stroke="${C.line}"/>`);
      if (!title) return y + 16;
      if (C.r) this.a(`<path d="M${x} ${y + 34} v-${34 - C.r} a${C.r} ${C.r} 0 0 1 ${C.r} -${C.r} h${w - 2 * C.r} a${C.r} ${C.r} 0 0 1 ${C.r} ${C.r} v${34 - C.r} z" fill="${C.panel2}" stroke="${C.line}"/>`);
      else this.a(`<rect x="${x}" y="${y}" width="${w}" height="34" fill="${C.panel2}" stroke="${C.line}"/>`);
      this.text(x + 14, y + 23, title, 15, C.text, { weight: 600, ls: 0.5 });
      return y + 34 + 16;
    }
    // Title band, 64 px high: title left, optional subtitle, KPI tiles are placed on its right with tile().
    header(title, sub) {
      this.covered += this.w * 64;
      this.a(`<rect x="0" y="0" width="${this.w}" height="64" fill="${C.panel2}"/><line x1="0" y1="64" x2="${this.w}" y2="64" stroke="${C.line}"/>`);
      this.text(24, sub ? 30 : 40, title, 22, C.text, { weight: 700, ls: 0.5 });
      if (sub) this.text(24, 52, sub, 13, C.sub);
    }
    // KPI in the title band: label over value + unit. Place several with tiles().
    tile(x, w, label, id, tag, unit) {
      this.a(`<line x1="${x}" y1="10" x2="${x}" y2="54" stroke="${C.line}"/>`);
      this.text(x + 14, 24, label, 12, C.sub, { ls: 0.5 });
      this.num(id, tag, x + 14, 51, 24, C.text, { anchor: 'start' });
      if (unit) this.text(x + w - 12, 51, unit, 13, C.sub, { anchor: 'end' });
    }
    // Right-aligned row of KPI tiles in the title band: list = [[label, id, tag, unit], ...]
    tiles(list, w = 190) { list.forEach((t, i) => this.tile(this.w - (list.length - i) * w, w, t[0], t[1], t[2], t[3])); }
    // Text button that opens another page
    navBtn(id, tag, x, y, w, label, h = 34) {
      this.a(`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="${C.r ? h / 2 : 0}" fill="${C.panel2}" stroke="${C.line}"/>`);
      this.text(x + w / 2, y + h / 2 + 5, label, 14, C.link, { anchor: 'middle', weight: 600 });
      this.hit(id, tag, x, y, w, h);
    }
    // Legend of state colours, right aligned at xRight: entries [[colour, label], ...]
    legend(xRight, y, entries) {
      let s = '', x = xRight;
      for (const [col, label] of entries.slice().reverse()) { const tw = label.length * 6.7; x -= tw; s = `<text x="${x}" y="${y}" font-size="13" fill="${C.sub}">${esc(label)}</text>` + s; x -= 18; s = `<rect x="${x}" y="${y - 11}" width="12" height="12" fill="${col}"/>` + s; x -= 22; }
      this.a(s);
    }

    // Share of the canvas covered by the title band and panels. gen.js warns below 0.7: too much empty background.
    coverage() { return Math.min(1, this.covered / (this.w * this.h)); }
    toString() { return this.out.join('\n') + '\n</svg>'; }
    itemsXml(xe) { return this.items.map(it => `<${it.el} ` + Object.entries(it.a).map(([k, v]) => `${k}="${xe(v)}"`).join(' ') + ' />').join(''); }
    allIds() { return [...this.toString().matchAll(/\sid="([^"]+)"/g)].map(m => m[1]); }
  }

  return { Svg, C, DEFS, FONT, T, b2, st3, grid };
};

// text content escape (labels may contain & or <)
function esc(s) { return String(s).replace(/&(?!#?\w+;)/g, '&amp;').replace(/</g, '&lt;'); }

module.exports.DEFAULT_PALETTE = PALETTE_DARK;
module.exports.PALETTE_DARK = PALETTE_DARK; module.exports.PALETTE_LIGHT = PALETTE_LIGHT;
module.exports.PALETTE_DASHBOARD = PALETTE_DASHBOARD; module.exports.PALETTE_ILLUSTRATED = PALETTE_ILLUSTRATED; module.exports.STYLES = STYLES; module.exports.styleOf = styleOf;
module.exports.b2 = b2; module.exports.st3 = st3; module.exports.T = T; module.exports.FONT = FONT; module.exports.grid = grid;
