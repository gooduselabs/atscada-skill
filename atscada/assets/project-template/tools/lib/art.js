// ILLUSTRATED style only (SVG_STYLE = 'illustrated'): machine drawings with moving parts, and isometric building blocks
// for a plant view. Use them when the user asks for a lively, pictorial screen (show floor, lobby display, demo).
// For an operator screen in SCADA style use lib/symbols.js instead.
//
//   const art = require('./lib/art')(M.C);
//   s.a(`<g transform="translate(${x},${y}) scale(1.2)">${art.machineArt(s, 'press', 'P1', 'Press1.State', 'Press1.Run')}</g>`);
//
// machineArt(svg, type, pid, tagState, tagRun)  - each drawing fits a 300 x 150 box
//   type:     inject | blow | crusher | chiller | cnc | press | weld | paint | print | cut | glue | pack
//   pid:      id prefix, unique per machine in the drawing (creates <pid>_ACC, <pid>_RUN, ...)
//   tagState: 0 stopped / 1 running / 2 fault -> body colour grey / blue / red
//   tagRun:   1 = the moving parts animate (they stand still when the machine is stopped: motion always means "running")
// How a drawing is built (follow this for new equipment):
//   - ACC(...)  : the coloured body parts, one <g> whose fill follows the state tag
//   - A(cls, style, inner): an animated part; cls = es-spin | es-sx | es-sy | es-swing | es-move | es-rise, tuned with
//                 CSS variables (--d distance, --dx/--dy travel, --r angle) and animation-duration
//   - F(points, stroke): a dashed line that flows (web, pipe, belt)
//   - simple shapes only (rect, circle, polygon, short paths) so it still reads when scaled down
//
// iso(ox, oy, k): isometric helpers for buildings, tanks and yards -> { P, box, cyl, poly, shade }
//   const I = art.iso(960, 220, 0.74);
//   s.a(I.box(0, 0, 300, 200, 90, '#38bdf8'));                 // a building: x, y, width, depth, height, colour
//   s.a(I.cyl(380, 60, 40, 110, '#22d3ee'));                   // a tank: centre x, y, radius, height, colour
//   s.a(`<polygon points="${I.poly([[0, 0], [300, 0], [300, 200], [0, 200]], 91)}" fill="..."/>`);   // roof detail at height 91
//   Draw from the back to the front (larger x + y last) so nearer blocks cover farther ones.
'use strict';
const lib = require('./svglib');

module.exports = function (palette) {
const P0 = Object.assign({}, lib.STYLES.illustrated, palette || {});
// colour names used by the drawings
const C = Object.assign({}, P0, { info: P0.link, energy: (P0.q && P0.q.energy) || '#fbbf24' });
const { b2, st3, T } = lib;

const BODY = '#334155', BODY2 = '#475569', DARK = '#0f172a', OUT = '#0b1220', LIGHT = '#e2e8f0', MID = '#94a3b8';
const ACC_MAP = st3('#475569', '#3b9eea', '#ef5a6f');

function rotor(cx, cy, r) {
  const k = r * 0.28;
  return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${DARK}" stroke="${MID}" stroke-width="2"/>` +
    `<path d="M${cx} ${cy - r + 3} L${cx + k} ${cy} L${cx} ${cy + r - 3} L${cx - k} ${cy} Z M${cx - r + 3} ${cy} L${cx} ${cy - k} L${cx + r - 3} ${cy} L${cx} ${cy + k} Z" fill="url(#es-steel)"/>` +
    `<circle cx="${cx}" cy="${cy}" r="${Math.max(2.5, r * 0.16)}" fill="${OUT}"/>`;
}

function machineArt(svg, type, pid, tagState, tagRun) {
  let n = 0;
  const A = (cls, style, inner) => `<g class="es-a ${cls}" style="${style ? style + ';' : ''}animation-play-state:inherit">${inner}</g>`;
  const F = (pts, stroke, w = 3) => `<polyline class="es-flow" style="animation-play-state:inherit" points="${pts}" stroke="${stroke}" stroke-width="${w}"/>`;
  const acc = svg.id(`${pid}_ACC`); svg.color(acc, tagState, ACC_MAP);
  const ACC = inner => `<g id="${acc}" fill="#475569" stroke="${OUT}" stroke-width="2">${inner}</g>`;
  const base = `<rect x="8" y="132" width="284" height="6" rx="3" fill="${DARK}"/>`;
  let s = '';
  switch (type) {
    case 'inject':
      s = `<rect x="10" y="116" width="280" height="16" rx="5" fill="${DARK}" stroke="${BODY}"/>` +
        ACC(`<rect x="16" y="42" width="24" height="74" rx="5"/><rect x="126" y="64" width="132" height="32" rx="8"/><rect x="258" y="54" width="32" height="52" rx="6"/>`) +
        `<rect x="16" y="54" width="96" height="5" fill="url(#es-steel)"/><rect x="16" y="100" width="96" height="5" fill="url(#es-steel)"/>` +
        A('es-sx', '--d:14px', `<rect x="54" y="46" width="12" height="66" rx="2" fill="url(#es-steel)"/><rect x="66" y="56" width="14" height="46" rx="2" fill="${MID}" stroke="${OUT}"/>`) +
        `<rect x="100" y="46" width="12" height="66" rx="2" fill="url(#es-steel)"/><polygon points="112,76 126,72 126,88 112,84" fill="${MID}"/>` +
        `<rect x="142" y="64" width="9" height="32" fill="${C.energy}" fill-opacity=".75"/><rect x="170" y="64" width="9" height="32" fill="${C.energy}" fill-opacity=".75"/><rect x="198" y="64" width="9" height="32" fill="${C.energy}" fill-opacity=".75"/>` +
        `<polygon points="176,64 240,64 224,26 192,26" fill="${LIGHT}" fill-opacity=".92" stroke="${OUT}"/><rect x="188" y="20" width="40" height="8" rx="2" fill="${MID}"/>` +
        `<rect x="265" y="66" width="18" height="5" rx="2" fill="${OUT}" fill-opacity=".5"/><rect x="265" y="78" width="18" height="5" rx="2" fill="${OUT}" fill-opacity=".5"/>`;
      break;
    case 'blow':
      s = base + `<rect x="28" y="30" width="16" height="102" fill="${BODY}"/><rect x="236" y="96" width="50" height="8" rx="3" fill="${DARK}" stroke="${BODY}"/><rect x="246" y="104" width="6" height="28" fill="${BODY}"/><rect x="272" y="104" width="6" height="28" fill="${BODY}"/>` +
        ACC(`<rect x="36" y="20" width="160" height="26" rx="8"/><rect x="212" y="40" width="34" height="56" rx="4"/>`) +
        `<polygon points="150,20 190,20 182,2 158,2" fill="${LIGHT}" fill-opacity=".92" stroke="${OUT}"/>` +
        `<rect x="128" y="46" width="24" height="16" fill="url(#es-steel)"/><rect x="138" y="62" width="4" height="12" fill="${LIGHT}"/>` +
        A('es-sx', '--d:9px', `<rect x="98" y="72" width="32" height="50" rx="3" fill="url(#es-steel)" stroke="${OUT}"/>`) +
        A('es-sx', '--d:-9px', `<rect x="150" y="72" width="32" height="50" rx="3" fill="url(#es-steel)" stroke="${OUT}"/>`) +
        `<path d="M136 78 h8 v6 q5 3 5 10 v22 h-18 v-22 q0 -7 5 -10 z" fill="#93c5fd" fill-opacity=".85"/>` +
        `<rect x="218" y="48" width="22" height="14" rx="2" fill="${C.info}" fill-opacity=".8"/>` +
        `<path d="M250 82 h6 v4 q3 2 3 5 v5 h-12 v-5 q0 -3 3 -5 z" fill="#93c5fd" fill-opacity=".8"/><path d="M268 82 h6 v4 q3 2 3 5 v5 h-12 v-5 q0 -3 3 -5 z" fill="#93c5fd" fill-opacity=".8"/>`;
      break;
    case 'crusher':
      s = base + `<polygon points="84,14 216,14 196,54 104,54" fill="${LIGHT}" fill-opacity=".92" stroke="${OUT}"/>` +
        ACC(`<rect x="92" y="54" width="116" height="62" rx="10"/>`) +
        A('es-spin', 'animation-duration:.7s', rotor(150, 85, 24)) +
        `<rect x="106" y="116" width="88" height="16" rx="2" fill="${BODY}" stroke="${OUT}"/>` +
        `<rect x="220" y="76" width="56" height="38" rx="6" fill="${BODY2}" stroke="${OUT}" stroke-width="2"/><rect x="228" y="86" width="40" height="5" rx="2" fill="${OUT}" fill-opacity=".5"/><rect x="228" y="97" width="40" height="5" rx="2" fill="${OUT}" fill-opacity=".5"/><rect x="232" y="114" width="32" height="18" fill="${BODY}"/>` +
        `<line x1="174" y1="85" x2="220" y2="95" stroke="${MID}" stroke-width="3"/>` +
        `<circle cx="120" cy="124" r="3" fill="#93c5fd"/><circle cx="134" cy="126" r="3" fill="#fca5a5"/><circle cx="150" cy="123" r="3" fill="#86efac"/><circle cx="166" cy="126" r="3" fill="#93c5fd"/><circle cx="180" cy="124" r="3" fill="#fde68a"/>` +
        `<rect x="24" y="96" width="50" height="36" rx="4" fill="${BODY}" stroke="${OUT}"/><path d="M30 104 h38 M30 112 h38 M30 120 h38" stroke="${OUT}" stroke-opacity=".5" stroke-width="3"/>`;
      break;
    case 'chiller':
      s = base + ACC(`<rect x="34" y="40" width="232" height="92" rx="10"/>`) +
        `<rect x="46" y="52" width="208" height="68" rx="6" fill="${DARK}" fill-opacity=".55"/>` +
        A('es-spin', 'animation-duration:.9s', rotor(98, 86, 28)) + A('es-spin', 'animation-duration:.9s', rotor(202, 86, 28)) +
        `<rect x="140" y="60" width="20" height="52" rx="3" fill="${BODY}"/><rect x="144" y="66" width="12" height="8" rx="1" fill="${C.info}"/><circle cx="150" cy="86" r="3" fill="${C.run}"/><circle cx="150" cy="98" r="3" fill="${C.warn}"/>` +
        `<path d="M34 60 H12 V20" fill="none" stroke="${BODY2}" stroke-width="8"/><path d="M266 112 H288 V20" fill="none" stroke="${BODY2}" stroke-width="8"/>` +
        F('12,20 12,60 34,60', '#7dd3fc') + F('266,112 288,112 288,20', '#fda4af');
      break;
    case 'cnc':
      s = base + ACC(`<rect x="24" y="26" width="212" height="100" rx="10"/>`) +
        `<rect x="40" y="40" width="136" height="66" rx="5" fill="url(#es-glass)" stroke="${OUT}" stroke-width="2"/>` +
        `<rect x="54" y="92" width="108" height="8" fill="url(#es-steel)"/><rect x="84" y="78" width="46" height="14" rx="1" fill="${MID}" stroke="${OUT}"/>` +
        A('es-sx', '--d:26px;animation-duration:2.2s', `<rect x="78" y="42" width="24" height="24" rx="2" fill="url(#es-steel)" stroke="${OUT}"/><rect x="88" y="66" width="4" height="12" fill="${LIGHT}"/>`) +
        `<rect x="186" y="44" width="38" height="24" rx="3" fill="${DARK}"/><rect x="190" y="48" width="30" height="16" rx="2" fill="${C.info}" fill-opacity=".85"/><circle cx="194" cy="80" r="4" fill="${C.run}"/><circle cx="206" cy="80" r="4" fill="${C.warn}"/><circle cx="218" cy="80" r="4" fill="${C.fault}"/><rect x="190" y="92" width="30" height="14" rx="2" fill="${OUT}" fill-opacity=".45"/>` +
        `<rect x="24" y="126" width="212" height="6" fill="${DARK}"/>` +
        `<rect x="244" y="98" width="44" height="34" rx="3" fill="${BODY}" stroke="${OUT}"/><path d="M250 106 q8 -8 16 0 t16 0" fill="none" stroke="${MID}" stroke-width="3"/><path d="M250 118 q8 -8 16 0 t16 0" fill="none" stroke="${MID}" stroke-width="3"/>`;
      break;
    case 'press':
      s = `<rect x="56" y="114" width="188" height="20" rx="3" fill="${DARK}" stroke="${BODY}"/>` +
        ACC(`<rect x="62" y="14" width="176" height="30" rx="5"/><rect x="72" y="44" width="24" height="70"/><rect x="204" y="44" width="24" height="70"/>`) +
        A('es-sy', '--d:18px;animation-duration:.8s', `<rect x="108" y="44" width="84" height="26" rx="3" fill="url(#es-steel)" stroke="${OUT}"/><rect x="122" y="70" width="56" height="9" fill="${MID}" stroke="${OUT}"/>`) +
        `<rect x="118" y="102" width="64" height="12" fill="${MID}" stroke="${OUT}"/><rect x="100" y="99" width="100" height="3" fill="${LIGHT}"/>` +
        A('es-spin', 'animation-duration:.8s', rotor(262, 40, 22)) + `<line x1="238" y1="30" x2="246" y2="34" stroke="${MID}" stroke-width="3"/>` +
        `<rect x="16" y="78" width="34" height="56" rx="4" fill="${BODY}" stroke="${OUT}"/><rect x="21" y="84" width="24" height="14" rx="2" fill="${C.info}" fill-opacity=".8"/><circle cx="27" cy="110" r="4" fill="${C.run}"/><circle cx="39" cy="110" r="4" fill="${C.fault}"/>`;
      break;
    case 'weld': {
      const sp = svg.id(`${pid}_SPK`); svg.color(sp, tagRun, b2(T, '#fde047'));
      s = base + ACC(`<rect x="12" y="66" width="36" height="66" rx="5"/><circle cx="92" cy="104" r="16"/>`) +
        `<rect x="18" y="74" width="24" height="14" rx="2" fill="${C.info}" fill-opacity=".8" stroke="none"/>` +
        `<rect x="70" y="112" width="44" height="20" rx="3" fill="${BODY}" stroke="${OUT}"/>` +
        `<rect x="166" y="106" width="118" height="8" fill="url(#es-steel)"/><rect x="176" y="114" width="6" height="18" fill="${BODY}"/><rect x="268" y="114" width="6" height="18" fill="${BODY}"/><rect x="186" y="94" width="78" height="12" rx="1" fill="${MID}" stroke="${OUT}"/>` +
        A('es-swing', '--r:-12deg;--r2:6deg', `<path d="M92 104 L134 48 L186 78" fill="none" stroke="url(#es-steel)" stroke-width="12" stroke-linejoin="round" stroke-linecap="round"/><circle cx="134" cy="48" r="8" fill="${BODY}" stroke="${OUT}" stroke-width="2"/><path d="M186 78 L194 90" stroke="${LIGHT}" stroke-width="5" stroke-linecap="round"/>`) +
        `<g class="es-spark"><polygon id="${sp}" points="196,84 199,91 206,92 200,96 202,103 196,99 190,103 192,96 186,92 193,91" fill="${T}"/></g>`;
      break;
    }
    case 'paint': {
      const mist = svg.id(`${pid}_MST`); svg.color(mist, tagRun, b2(T, '#7dd3fc'));
      s = base + `<rect x="204" y="6" width="22" height="26" fill="${BODY}" stroke="${OUT}"/>` +
        ACC(`<rect x="24" y="30" width="252" height="102" rx="8"/>`) +
        `<rect x="38" y="44" width="164" height="76" rx="5" fill="url(#es-glass)" stroke="${OUT}" stroke-width="2"/>` +
        `<line x1="44" y1="52" x2="196" y2="52" stroke="${MID}" stroke-width="3"/><line x1="140" y1="52" x2="140" y2="64" stroke="${MID}" stroke-width="2"/>` +
        `<rect x="112" y="64" width="56" height="40" rx="6" fill="${MID}" stroke="${OUT}"/>` +
        A('es-sy', '--d:22px;animation-duration:1.8s', `<rect x="52" y="66" width="16" height="9" rx="2" fill="url(#es-steel)"/><polygon id="${mist}" points="68,70 106,58 106,84" fill="${T}" fill-opacity=".4"/>`) +
        A('es-spin', 'animation-duration:.8s', rotor(240, 78, 22)) +
        `<rect x="220" y="108" width="40" height="14" rx="2" fill="${OUT}" fill-opacity=".45"/>`;
      break;
    }
    case 'print':
      s = base + `<circle cx="32" cy="98" r="22" fill="${LIGHT}" stroke="${OUT}" stroke-width="2"/><circle cx="32" cy="98" r="6" fill="${BODY}"/><circle cx="270" cy="100" r="18" fill="${LIGHT}" stroke="${OUT}" stroke-width="2"/><circle cx="270" cy="100" r="6" fill="${BODY}"/>` +
        ACC(`<rect x="64" y="30" width="172" height="102" rx="8"/>`) +
        `<rect x="76" y="100" width="36" height="12" rx="2" fill="#22d3ee"/><rect x="132" y="100" width="36" height="12" rx="2" fill="#e879f9"/><rect x="188" y="100" width="36" height="12" rx="2" fill="#fde047"/>` +
        F('32,76 94,56 150,94 206,56 270,82', LIGHT, 3) +
        A('es-spin', 'animation-duration:1.2s', rotor(94, 74, 17)) + A('es-spin', 'animation-duration:1.2s', rotor(150, 74, 17)) + A('es-spin', 'animation-duration:1.2s', rotor(206, 74, 17)) +
        `<rect x="76" y="38" width="148" height="8" rx="3" fill="${OUT}" fill-opacity=".4"/>`;
      break;
    case 'cut':
      s = base + `<rect x="8" y="98" width="52" height="8" fill="url(#es-steel)"/><rect x="16" y="106" width="6" height="26" fill="${BODY}"/><rect x="46" y="106" width="6" height="26" fill="${BODY}"/>` +
        ACC(`<rect x="60" y="24" width="150" height="108" rx="8"/>`) +
        `<rect x="74" y="38" width="122" height="80" rx="4" fill="${DARK}" fill-opacity=".6"/>` +
        A('es-sy', '--d:13px;animation-duration:.9s', `<rect x="80" y="44" width="110" height="24" rx="3" fill="url(#es-steel)" stroke="${OUT}"/><path d="M90 68 v6 M110 68 v6 M130 68 v6 M150 68 v6 M170 68 v6" stroke="${LIGHT}" stroke-width="3"/>`) +
        `<rect x="80" y="98" width="110" height="14" rx="2" fill="url(#es-steel)" stroke="${OUT}"/>` +
        F('8,94 292,94', '#d6b98c', 4) +
        A('es-spin', 'animation-duration:.9s', rotor(232, 46, 15)) +
        `<rect x="224" y="100" width="62" height="6" fill="#d6b98c"/><rect x="224" y="108" width="62" height="6" fill="#c9a877"/><rect x="224" y="116" width="62" height="6" fill="#d6b98c"/><rect x="224" y="124" width="62" height="6" fill="#c9a877"/>`;
      break;
    case 'glue':
      s = base + `<rect x="14" y="100" width="272" height="10" rx="5" fill="${DARK}" stroke="${BODY}"/><rect x="34" y="110" width="6" height="22" fill="${BODY}"/><rect x="147" y="110" width="6" height="22" fill="${BODY}"/><rect x="260" y="110" width="6" height="22" fill="${BODY}"/>` +
        ACC(`<rect x="40" y="46" width="54" height="38" rx="5"/><rect x="123" y="46" width="54" height="38" rx="5"/><rect x="206" y="46" width="54" height="38" rx="5"/>`) +
        `<rect x="48" y="54" width="38" height="8" rx="2" fill="${OUT}" fill-opacity=".45"/><rect x="131" y="54" width="38" height="8" rx="2" fill="${OUT}" fill-opacity=".45"/><rect x="214" y="54" width="38" height="8" rx="2" fill="${C.info}" fill-opacity=".8"/>` +
        `<polygon points="144,84 156,84 150,96" fill="${C.energy}"/><path d="M60 84 l14 12 M72 84 l-14 12" stroke="${MID}" stroke-width="3"/>` +
        A('es-spin', 'animation-duration:1s', rotor(22, 105, 9)) + A('es-spin', 'animation-duration:1s', rotor(278, 105, 9)) +
        A('es-move', '--dx:214px;animation-duration:3.2s', `<rect x="26" y="84" width="24" height="16" rx="2" fill="#d6b98c" stroke="${OUT}"/>`) +
        A('es-move', '--dx:214px;animation-duration:3.2s;animation-delay:-1.6s', `<rect x="26" y="84" width="24" height="16" rx="2" fill="#c9a877" stroke="${OUT}"/>`);
      break;
    case 'pack':
      s = base + `<rect x="10" y="104" width="124" height="9" rx="4" fill="${DARK}" stroke="${BODY}"/><rect x="24" y="113" width="6" height="19" fill="${BODY}"/><rect x="112" y="113" width="6" height="19" fill="${BODY}"/>` +
        A('es-move', '--dx:88px;animation-duration:2.6s', `<rect x="16" y="82" width="26" height="22" rx="2" fill="#d6b98c" stroke="${OUT}"/><path d="M16 93 h26" stroke="#a8875a" stroke-width="2"/>`) +
        ACC(`<rect x="132" y="56" width="36" height="76" rx="5"/><rect x="266" y="18" width="14" height="114" rx="3"/>`) +
        `<rect x="138" y="64" width="24" height="14" rx="2" fill="${C.info}" fill-opacity=".8"/><circle cx="144" cy="92" r="4" fill="${C.run}"/><circle cx="156" cy="92" r="4" fill="${C.fault}"/>` +
        `<ellipse cx="218" cy="124" rx="44" ry="8" fill="${DARK}" stroke="${BODY2}" stroke-width="2"/>` +
        `<rect x="190" y="58" width="56" height="64" rx="2" fill="#d6b98c" stroke="${OUT}"/><path d="M190 80 h56 M190 100 h56 M218 58 v64" stroke="#a8875a" stroke-width="2"/>` +
        `<rect x="188" y="62" width="60" height="40" fill="#93c5fd" fill-opacity=".28"/>` +
        A('es-sy', '--d:44px;animation-duration:2.4s', `<rect x="250" y="56" width="24" height="16" rx="2" fill="url(#es-steel)" stroke="${OUT}"/><line x1="250" y1="64" x2="246" y2="64" stroke="#93c5fd" stroke-width="3"/>`);
      break;
    default: throw new Error('no drawing for machine type: ' + type);
  }
  // one single link: the outer group holds the run / stop state, the animated children inherit it (animation-play-state:inherit)
  const run = svg.id(`${pid}_RUN`); svg.play(run, tagRun);
  return `<g id="${run}" class="es-hold">${s}</g>`;
}

const TYPE_NAME = { inject: 'Injection molding', blow: 'Blow molding', crusher: 'Granulator', chiller: 'Chiller', cnc: 'CNC machine', press: 'Stamping press', weld: 'Welding robot', paint: 'Paint booth', print: 'Printing press', cut: 'Die cutter', glue: 'Folder gluer', pack: 'Packaging' };

// ---- isometric building blocks ----
function iso(ox, oy, k = 0.74) {
  const P = (x, y, z = 0) => [+(ox + (x - y) * 0.866 * k).toFixed(1), +(oy + (x + y) * 0.5 * k - z * k).toFixed(1)];
  const pts = arr => arr.map(p => p.join(',')).join(' ');
  const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const c = v => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [n >> 16, (n >> 8) & 255, n & 255].map(v => c(v).toString(16).padStart(2, '0')).join(''); };
  // box at (x, y), size w along X, d along Y, h high. Three visible faces: left, right, roof. extra.topId = id of the roof polygon.
  function box(x, y, w, d, h, col, z = 0, extra = {}) {
    const top = pts([P(x, y, z + h), P(x + w, y, z + h), P(x + w, y + d, z + h), P(x, y + d, z + h)]);
    const left = pts([P(x, y + d, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x, y + d, z)]);
    const right = pts([P(x + w, y, z + h), P(x + w, y + d, z + h), P(x + w, y + d, z), P(x + w, y, z)]);
    const st = `stroke="${extra.stroke || C.bg}" stroke-width="${extra.sw || 1.2}" stroke-linejoin="round"`;
    return `<polygon points="${left}" fill="${shade(col, 0.78)}" ${st}/><polygon points="${right}" fill="${shade(col, 0.56)}" ${st}/><polygon points="${top}" fill="${extra.top || col}" ${st}${extra.topId ? ` id="${extra.topId}"` : ''}/>`;
  }
  // upright cylinder (tank, silo)
  function cyl(cx, cy, r, h, col, z = 0) {
    const [x0, y0] = P(cx, cy, z), [, y1] = P(cx, cy, z + h); const rx = +(r * 1.2247 * k).toFixed(1), ry = +(r * 0.7071 * k).toFixed(1);
    return `<path d="M${x0 - rx} ${y1} V${y0} A${rx} ${ry} 0 0 0 ${x0 + rx} ${y0} V${y1} Z" fill="${shade(col, 0.7)}" stroke="${C.bg}"/><ellipse cx="${x0}" cy="${y1}" rx="${rx}" ry="${ry}" fill="${col}" stroke="${C.bg}"/>`;
  }
  const poly = (arr, z = 0) => pts(arr.map(([x, y]) => P(x, y, z)));
  return { P, box, cyl, poly, shade, pts };
}

return { machineArt, rotor, TYPE_NAME, iso, BODY, BODY2, DARK, OUT, LIGHT, MID };
};
