// Builders for AppConfig/ATSCADAWebConfig.xml (Fastweb). Every builder returns an XML string already wrapped in its
// <atscada-assembly>. All of these forms run in a finished project; see references/web-components.md for every attribute.
//
//   const W = require('./lib/web')(M);
//   const xml = W.app([ W.view('Overview', 'overview', 'dashboard', [ W.full([ W.card('Power (kW)', 'Meter1.Power_P', '#1d6fb8', 'fa-bolt') ]) ]) ]);
'use strict';
const { xe, xeInline } = require('./util');

module.exports = function (M) {
  const P = M.PROJECT, C = M.C || {};
  const CB = 'Version=1.0.0.0, Culture=neutral, PublicKeyToken=null';
  const ROLES = P.roles || 'Admin, Operator';
  const R = `at-roles="${ROLES}"`;
  const CONN = P.connection;
  // Fastweb writes attribute values into HTML without encoding them, so a double quote in a title breaks the page.
  const tx = s => { if (/"/.test(String(s))) throw new Error('no double quote allowed in a title: ' + s); return xe(s); };
  let seq = 0;
  const svgs = {};

  // at-component-name must be unique in the whole file -> a running number
  const nm = p => { seq++; return `<at-component-name>${p}_${seq}</at-component-name><at-component-description>${p}</at-component-description>`; };
  const asm = (cls, inner, dll = 'ATSCADAFastWeb.Component') => `<atscada-assembly at-value="${cls}, ${dll}, ${CB}">${inner}</atscada-assembly>`;
  const comp = (ns, cls, inner) => asm(`ATSCADAWebApp.Component.${ns}.${cls}`, inner);

  // Bootstrap grid presets: cards per row on large / medium / small screens
  const G = {
    six: 'col-xl-2 col-lg-4 col-sm-6 col-12',   // 6 / 3 / 2 / 1
    four: 'col-xl-3 col-sm-6 col-12',           // 4 / 2 / 1
    three: 'col-xl-4 col-sm-6 col-12',          // 3 / 2 / 1
    two: 'col-xl-6 col-12',                     // 2 / 1
    one: 'col-sm-12',
  };

  // ---- value cards -------------------------------------------------------------------------------------------------
  // Compact value card (card v2 with the status line hidden). icon: Font Awesome name such as 'fa-bolt'.
  const card = (title, tag, color, icon, grid = G.six, dec = 1) => comp('Cardv2', 'ATSCADACardv2',
    `<atscada-cardv2 ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-data-tag-status="${tag}" at-color="${color}" at-icon="fa ${icon} fa-fw" at-decimal-places="${dec}" at-hidden-status="true" at-grid-column="${grid}">${nm('Card')}</atscada-cardv2>`);
  // Card with a status line driven by a second tag.
  const cardStatus = (title, tag, statusTag, color, icon, grid = G.four, dec = 1) => comp('Cardv2', 'ATSCADACardv2',
    `<atscada-cardv2 ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-data-tag-status="${statusTag}" at-color="${color}" at-icon="fa ${icon} fa-fw" at-decimal-places="${dec}" at-hidden-status="false" at-grid-column="${grid}">${nm('Card')}</atscada-cardv2>`);
  // Card v3 = card v2 + comparison with the value of a log column one period earlier. Only for values that are logged.
  // NOT in every Fastweb build: check that AppScripts\Component\Cardv3 exists before using it (gen.js does).
  // lower = true when a lower value is the good direction (consumption).
  const card3 = (title, tag, color, icon, table, column, grid = G.four, dec = 1, lower = false) => comp('Cardv3', 'ATSCADACardv3',
    `<atscada-cardv3 ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-data-tag-status="${tag}" at-color="${color}" at-icon="fa ${icon} fa-fw" at-decimal-places="${dec}" at-hidden-status="true" at-grid-column="${grid}" at-compare-connection="${CONN}" at-compare-table="${table}" at-compare-column="${column}" at-compare-period="yesterday" at-compare-allow-pick="true" at-compare-lower-is-better="${lower}" at-compare-percent="change">${nm('Card3')}</atscada-cardv3>`);
  // Alarm card: changes colour / blinks when value >= threshold. items: [{ th: 'Task.HiTag' | '80', useTag: bool, color?, blink? }]
  const alarmCard = (title, tag, color, icon, grid, dec, items) => comp('AlarmCard', 'ATSCADAAlarmCard',
    `<atscada-alarm-card ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-color="${color}" at-icon="fa ${icon} fa-fw" at-decimal-places="${dec}" at-grid-column="${grid}">${nm('AlarmCard')}` +
    items.map(it => `<atscada-alarm-card-item at-name="A${++seq}" at-content="${tx(it.th)}" at-data-tag-name="${tag}" at-color="${it.color || C.fault || '#e5484d'}" at-blink="${it.blink === false ? 'false' : 'true'}" at-use-tag="${it.useTag ? 'true' : 'false'}" />`).join('') +
    `</atscada-alarm-card>`);

  // ---- charts ------------------------------------------------------------------------------------------------------
  // Real-time chart. type: 'line' | 'bar' | 'donut' | 'pie'. items: [[label, 'Task.Tag', color], ...]
  const chart = (title, unit, items, grid = G.two, type = 'line', height = '340px', samples = 120) => comp('Chart', 'ATSCADAChart',
    `<atscada-chart ${R} at-content="${tx(title)}" at-type="${type}" at-height="${height}" at-sample-num="${samples}" at-xlabel="${type === 'line' ? xe(P.timeLabel || 'Time') : ''}" at-ylabel="${xe(unit)}" at-grid-column="${grid}">${nm('Chart')}` +
    items.map(it => `<atscada-chart-item at-name="S${++seq}" at-content="${tx(it[0])}" at-data-tag-name="${it[1]}" at-color="${it[2]}" />`).join('') + `</atscada-chart>`);
  // Historical chart from a log table. type: 'historical-line' | 'historical-bar'. items: [[label, column, color], ...]
  const hchart = (title, unit, table, items, grid = G.two, type = 'historical-line') => comp('HistoricalChart', 'ATSCADAHistoricalChart',
    `<atscada-historical-chart ${R} at-content="${tx(title)}" at-type="${type}" at-height="320px" at-bgcolor="None" at-opacity="1" at-xlabel="${xe(P.timeLabel || 'Time')}" at-ylabel="${xe(unit)}" at-connection="${CONN}" at-grid-column="${grid}">${nm('HChart')}` +
    items.map(it => `<atscada-historical-chart-item at-name="H${++seq}" at-content="${tx(it[0])}" at-table="${table}" at-column="${it[1]}" at-color="${it[2]}" />`).join('') + `</atscada-historical-chart>`);

  // ---- reports -----------------------------------------------------------------------------------------------------
  // at-alias = the real database column (used in the query); at-name = the label shown as table header, Excel column and
  // JSON key. The server writes at-name into the SQL as a column alias, so it must be plain ASCII, at most 64 characters,
  // no backtick, and unique inside one report.
  const label = c => {
    const h = String((M.COL_HEADER || {})[c] || c.replace(/_/g, ' ')).replace(/ · /g, ' - ').replace(/°C/g, 'degC').replace(/³/g, '3').replace(/₂/g, '2');
    if (/[^\x20-\x7E]|`/.test(h) || h.length > 64) throw new Error(`report label for column ${c} is not usable as SQL alias (ASCII only, max 64): ${h}`);
    return h;
  };
  const uniq = (title, cols) => { if (new Set(cols.map(label)).size !== cols.length) throw new Error('duplicate report labels in: ' + title); };
  // Data report (table + Excel export) of a log table. cols: column names.
  const dataReport = (title, table, cols) => (uniq(title, cols), comp('DataReporter', 'ATSCADADataReporter',
    `<atscada-data-reporter ${R} at-content="${tx(title)}" at-connection="${CONN}" at-table-name="${table}" at-timeout="30000" at-grid-column="${G.one}">${nm('DataReport')}` +
    cols.map(c => `<atscada-data-reporter-item at-name="${xe(label(c))}" at-alias="${c}" at-color="#e2e8f0" at-min="false" at-max="false" at-avr="false" />`).join('') + `</atscada-data-reporter>`));
  // Energy report: consumption by hour / day / month / year from CUMULATIVE counter columns. items: [[column, color], ...]
  const energyReport = (title, table, items) => (uniq(title, items.map(it => it[0])), comp('EnergyReporter', 'ATSCADAEnergyReporter',
    `<atscada-energy-reporter ${R} at-content="${tx(title)}" at-connection="${CONN}" at-table-name="${table}" at-timeout="60000" at-grid-column="${G.one}">${nm('EnergyReport')}` +
    items.map(it => `<atscada-energy-reporter-item at-name="${xe(label(it[0]))}" at-alias="${it[0]}" at-color="${it[1]}" />`).join('') + `</atscada-energy-reporter>`));

  // ---- controls (write to tags) -------------------------------------------------------------------------------------
  const input = (title, tag, grid = G.four) => comp('Input', 'ATSCADAInput', `<atscada-attribute at-content="${tx(title)}" at-data-tag-name="${tag}" at-grid-column="${grid}" ${R}>${nm('Input')}</atscada-attribute>`);
  const sw = (title, tag, grid = G.four, color = '#0f8a5f', on = '1', off = '0') => comp('Switch', 'ATSCADASwitch',
    `<atscada-switch ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-color="${color}" at-size="default" at-value-on="${on}" at-value-off="${off}" at-grid-column="${grid}">${nm('Switch')}</atscada-switch>`);
  const slider = (title, tag, min, max, step, grid = G.three) => comp('Slider', 'ATSCADASlider',
    `<atscada-slider ${R} at-content="${tx(title)}" at-data-tag-name="${tag}" at-min="${min}" at-max="${max}" at-step="${step}" at-skin="big" at-grid-column="${grid}">${nm('Slider')}</atscada-slider>`);

  // ---- alarms ------------------------------------------------------------------------------------------------------
  const alarmViewer = (title, limit = 50) => comp('AlarmViewer', 'ATSCADAAlarmViewer',
    `<atscada-alarm-viewer ${R} at-content="${tx(title)}" at-connection="${CONN}" at-table-name="alarmlog" at-limit="${limit}" at-interval="3000" at-timeout="30000" at-grid-column="${G.one}">${nm('AlarmViewer')}</atscada-alarm-viewer>`);
  const alarmReporter = title => comp('AlarmReporter', 'ATSCADAAlarmReporter',
    `<atscada-alarm-reporter ${R} at-content="${tx(title)}" at-connection="${CONN}" at-table-name="alarmlog" at-timeout="30000" at-grid-column="${G.one}">${nm('AlarmReporter')}</atscada-alarm-reporter>`);

  // ---- map (Leaflet + OpenStreetMap) ----------------------------------------------------------------------------------
  // A marker reads its position from a tag holding "lat;lng", shows its parameter tags on hover and opens at-url on click
  // ("~/page" = a page of this web). markers: [{ id, alias, tag, color, table, page, params: [[label, 'Task.Tag'], ...] }]
  const map = (title, height, markers) => comp('GoogleMap', 'ATSCADAGoogleMap',
    `<atscada-google-map ${R} at-content="${tx(title)}" at-application-name="${xe(P.name)}" at-connection="${CONN}" at-height="${height}" at-grid-column="${G.one}" at-api-key="">${nm('Map')}` +
    markers.map(m => `<atscada-marker-item at-name="${m.id}" at-alias="${xe(m.alias)}" at-location-tag-name="${m.tag}" at-color="${m.color}" at-show="checked" at-movable="unchecked" at-new-tab="unchecked" at-table="${m.table || ''}" at-url="~/${m.page}">` +
      (m.params || []).map((p, i) => `<atscada-param-item at-name="P${i + 1}" at-alias="${xe(p[0])}" at-param-tag-name="${p[1]}" />`).join('') + `</atscada-marker-item>`).join('') +
    `</atscada-google-map>`);

  // ---- SVG diagram (s = an Svg object from lib/svglib.js) -----------------------------------------------------------------
  const svg = (name, s) => {
    if (svgs[name]) throw new Error('duplicate svg name: ' + name);
    svgs[name] = s;
    return comp('SVG', 'ATSCADASVG', `<atscada-svg ${R} at-path="svg\\${name}.svg" at-content="${xeInline(s.toString())}" at-color="${C.bg || '#1b1f24'}" at-grid-column="${G.one}">${nm('SVG')}${s.itemsXml(xe)}</atscada-svg>`);
  };

  // ---- user management page content (Admin only) ----------------------------------------------------------------------
  const users = () => comp('User', 'ATSCADAUser', `<atscada-user at-roles="Admin" at-grid-column="${G.one}">${nm('User')}</atscada-user>`);

  // ---- containers ----------------------------------------------------------------------------------------------------
  const col = (grid, comps, roles = R) => asm('ATSCADAWebApp.Core.ATSCADAColumn', `<atscada-column ${roles} at-grid-column="${grid}">${nm('Col')}<atscada-components>${comps.join('')}</atscada-components></atscada-column>`, 'ATSCADAFastWeb.Core');
  const row = (cols, roles = R) => asm('ATSCADAWebApp.Core.ATSCADARow', `<atscada-row ${roles}>${nm('Row')}<atscada-components>${cols.join('')}</atscada-components></atscada-row>`, 'ATSCADAFastWeb.Core');
  // One full-width row; the components inside carry their own grid class and wrap by themselves.
  const full = (comps, roles = R) => row([col(G.one, comps, roles)], roles);
  // icon: Material icon name ('dashboard', 'bolt', 'timeline', 'description', 'notifications', 'settings'...).
  // visible = false hides the page from the menu (detail pages opened from an SVG link). opts.roles limits who sees it.
  const view = (title, loc, icon, rows, visible = true, opts = {}) => {
    if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(loc)) throw new Error('at-location must be lower case words joined by "-": ' + loc);
    const roles = opts.roles ? `at-roles="${opts.roles}"` : R;
    return asm('ATSCADAWebApp.Core.ATSCADAView',
      `<atscada-view ${roles} at-content="${tx(title)}" at-location="${loc}" at-icon="${icon}" at-interval="${opts.interval || 1000}" at-max-number-of-write="10" at-timeout="${opts.timeout || 3000}" at-visible="${visible}">${nm('View')}<atscada-components>${rows.join('')}</atscada-components></atscada-view>`, 'ATSCADAFastWeb.Core');
  };
  const usersView = (title = 'Users') => view(title, 'users', 'manage_accounts', [row([col(G.one, [users()], 'at-roles="Admin"')], 'at-roles="Admin"')], true, { roles: 'Admin' });

  const app = views => `<?xml version="1.0" encoding="utf-8"?>\r\n<atscada-app xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" ${R} at-title="${xe(P.title)}" at-brand="${xe(P.brand || 'ATSCADA')}" at-author="${xe(P.author || P.name)}" at-dark-mode="${P.darkMode === false ? 'false' : 'true'}">` +
    `<at-component-name>${P.name}</at-component-name><at-component-description>${xe(P.title)}</at-component-description>` +
    `<atscada-components>${views.join('')}</atscada-components>` +
    `<at-authentication at-connection="${CONN}" at-table-name="useraccount" at-required="${P.login ? 'true' : 'false'}"></at-authentication>` +
    `<at-service at-address="${xe(P.webHost || 'localhost')}" at-port="${P.webPort || 8010}"></at-service></atscada-app>`;

  return { G, card, cardStatus, card3, alarmCard, chart, hchart, dataReport, energyReport, input, sw, slider, alarmViewer, alarmReporter, map, svg, users, usersView, col, row, full, view, app, svgs, label, comp, asm, nm, reset: () => { seq = 0; for (const k of Object.keys(svgs)) delete svgs[k]; } };
};
