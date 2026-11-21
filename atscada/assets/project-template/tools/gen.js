// Generates every file of the project from tools/model.js (data) + tools/pages.js (web pages) + tools/scenes.js (SVG):
//   ATFile_<Name>.xml, Tag_file.XML, <db>.sql, ATSCADAWebConfig.xml, svg/*.svg, DesktopApp/* (generated parts)
// Run:  node tools/gen.js            (safe to run again and again; hand-edited desktop files are never overwritten)
//       node tools/gen.js --check    (validate only, write nothing)
'use strict';
const fs = require('fs'), path = require('path');
const M = require('./model');
const { writer, dups } = require('./lib/util');
const TAGS = require('./lib/tags'), SQL = require('./lib/sql'), DESK = require('./lib/desktop');

const root = path.join(__dirname, '..');
const checkOnly = process.argv.includes('--check');
const pending = [];
const w = (rel, content, bom = false) => { if (!checkOnly) pending.push([rel, content, bom]); };
const P = M.PROJECT, report = [], errs = [], warns = [];

for (const k of ['name', 'title', 'db', 'dbUser', 'dbPass', 'connection']) if (!P[k] || /^CHANGE_ME/.test(P[k])) errs.push(`PROJECT.${k} is not set in tools/model.js (ask the user, do not invent it)`);
if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(P.name || '')) errs.push('PROJECT.name must be letters, digits, underscore (it becomes a namespace and file names)');

if (errs.length) { console.log('Nothing written.\n\nERRORS (' + errs.length + '):\n' + errs.join('\n')); process.exit(1); }

// ---------------------------------------------------------------- 1. ATFile + 2. TagFile
errs.push(...TAGS.validate(M));
const tagSet = TAGS.allTags(M);
const at = TAGS.atFile(M), tf = TAGS.tagFile(M);
w(`ATFile_${P.name}.xml`, at.xml, true);
w('Tag_file.XML', tf.xml, true); w('DesktopApp/Tag_file.XML', tf.xml, true);
report.push(`ATFile: ${at.channels} channel, ${at.devices} device, ${at.tags} tag`);
report.push(`TagFile: ${tf.tasks} task, ${at.tags} tag (project root + DesktopApp)`);
const driverDir = P.driverDir || 'C:\\Program Files\\ATPro\\ATDriverServer\\Drivers';
for (const ch of TAGS.normalize(M)) if (fs.existsSync(driverDir) && !fs.existsSync(ch.dll)) warns.push(`driver DLL not found on this machine: ${ch.dll}`);

// ---------------------------------------------------------------- 3. SQL
errs.push(...SQL.validate(M, tagSet));
w(`${P.db}.sql`, SQL.script(M));
report.push(`SQL: ${SQL.ddl(M).length} tables, ${(M.ALARMS || []).length} alarm rows, ${(P.users || []).length} default users`);

// ---------------------------------------------------------------- 4. Web config + SVG
const W = require('./lib/web')(M);
let xml = '';
try {
  xml = W.app(require('./pages').build(W, M));
} catch (e) { errs.push('pages.js: ' + e.message); }
if (xml) {
  for (const [name, s] of Object.entries(W.svgs)) w(`svg/${name}.svg`, s.toString());
  w('ATSCADAWebConfig.xml', xml);
  const webDir = path.join(root, 'Fastweb');
  if (fs.existsSync(path.join(webDir, 'AppConfig'))) { w('Fastweb/AppConfig/ATSCADAWebConfig.xml', xml); report.push('Web config copied to Fastweb/AppConfig'); }

  const names = [...xml.matchAll(/<at-component-name>([^<]+)</g)].map(m => m[1]);
  dups(names).slice(0, 5).forEach(n => errs.push('duplicate at-component-name: ' + n));
  const locs = [...xml.matchAll(/at-location="([^"]+)"/g)].map(m => m[1]);
  dups(locs).forEach(n => errs.push('duplicate at-location: ' + n));
  // every tag the web reads or writes must exist in the TagFile
  const refs = new Set();
  for (const m of xml.matchAll(/at-(?:data-tag-name|data-tag-status|highalarm|Lowalarm|location-tag-name|param-tag-name|data-tag-hour-from|data-tag-minute-from|data-tag-hour-to|data-tag-minute-to)="([^"]+)"/g)) refs.add(m[1]);
  for (const m of xml.matchAll(/<atscada-alarm-card-item [^>]*at-content="([^"]+)"[^>]*at-use-tag="true"/g)) refs.add(m[1]);
  [...refs].filter(t => !tagSet.has(t)).slice(0, 15).forEach(t => errs.push('web uses a tag that is not in the TagFile: ' + t));
  // every table / column the web queries must exist
  const tables = Object.assign({ alarmlog: [] }, SQL.tables(M));
  const col = (t, c, what) => { if (!tables[t] || !tables[t].includes(c)) errs.push(`web uses a column that does not exist: ${t}.${c}${what ? ' (' + what + ')' : ''}`); };
  for (const m of xml.matchAll(/at-table="([^"]+)" at-column="([^"]+)"/g)) col(m[1], m[2]);
  for (const m of xml.matchAll(/at-compare-table="([^"]+)" at-compare-column="([^"]+)"/g)) col(m[1], m[2], 'card v3');
  for (const m of xml.matchAll(/<atscada-(data|energy)-reporter [^>]*at-table-name="([^"]+)"[^>]*>(.*?)<\/atscada-\1-reporter>/g)) {
    if (!tables[m[2]]) { errs.push('report on a table that does not exist: ' + m[2]); continue; }
    for (const c of m[3].matchAll(/-item at-name="[^"]+" at-alias="([^"]+)"/g)) col(m[2], c[1], 'report');
  }
  // SVG: every linked id exists exactly once; link targets are real pages
  for (const [name, s] of Object.entries(W.svgs)) {
    if (s.coverage && s.coverage() < 0.7) warns.push(`svg ${name}: only ${Math.round(s.coverage() * 100)} % of the canvas is used by panels - shrink the canvas to the content or let the panels fill it (lib/svglib grid())`);
    const ids = s.allIds();
    dups(ids).filter(n => !n.startsWith('es-')).slice(0, 5).forEach(n => errs.push(`svg ${name}: duplicate id ${n}`));
    for (const it of s.items) {
      if (!ids.includes(it.a['at-name'])) errs.push(`svg ${name}: no element with id ${it.a['at-name']}`);
      if (it.a['at-id2'] && !ids.includes(it.a['at-id2'])) errs.push(`svg ${name}: no element with id ${it.a['at-id2']}`);
    }
  }
  (M.LINKS || []).forEach(l => { if (!locs.includes(l[1])) errs.push(`LINKS: ${l[0]} points to a page that does not exist: ${l[1]}`); });
  const linkTags = new Set((M.LINKS || []).map(l => l[0]));
  for (const s of Object.values(W.svgs)) for (const it of s.items) if (it.el === 'atscada-svghyperlink-item' && !linkTags.has(it.a['at-data-tag-name']))
    errs.push(`svg link ${it.a['at-name']}: tag ${it.a['at-data-tag-name']} is not in model.LINKS, so nothing writes its target URL`);
  // components that are not in every Fastweb build
  if (/<atscada-cardv3 /.test(xml) && fs.existsSync(path.join(webDir, 'AppScripts', 'Component')) && !fs.existsSync(path.join(webDir, 'AppScripts', 'Component', 'Cardv3')))
    errs.push('pages use card v3 but this Fastweb copy has no AppScripts\\Component\\Cardv3 - use W.card() instead, or a newer Fastweb');
  if (P.login && !(P.users || []).length) warns.push('PROJECT.login is true but PROJECT.users is empty: make sure table useraccount already has a user, or nobody can sign in');
  report.push(`Web: ${locs.length} pages, ${names.length} components, ${Object.values(W.svgs).reduce((a, s) => a + s.items.length, 0)} SVG links, ${(xml.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------- 5. Desktop app
const d = DESK.build(M, tagSet);
errs.push(...d.errs);
w('DesktopApp/Model.g.cs', d.modelCs, true);
w('DesktopApp/MainForm.Designer.cs', d.designer, true);
w('DesktopApp/Loggers.g.cs', d.loggersCs, true);
report.push(`Desktop: ${d.loggers} iDataLogger, 1 iAlarmLogger, iWebService port ${P.webPort || 8010}`);

// ---------------------------------------------------------------- result
console.log((checkOnly ? '[check only, nothing written]\n' : '') + report.join('\n'));
if (warns.length) console.log('\nWARNINGS (' + warns.length + '):\n' + [...new Set(warns)].join('\n'));
if (errs.length) { console.log('\nERRORS (' + errs.length + '):\n' + [...new Set(errs)].join('\n')); process.exitCode = 1; }
else {
  if (!checkOnly) {
    DESK.scaffold(M, root, report);
    const write = writer(root);
    for (const args of pending) write(...args);
  }
  console.log('\nCross-check: no errors.');
}
