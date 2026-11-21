// Copies the Fastweb web (the built ASP.NET site) into <project>\Fastweb and prepares its Web.config for this project.
//   node tools/setup-web.js                 find the template by itself (see the search order below)
//   node tools/setup-web.js "<folder>"      use this template folder
//   node tools/setup-web.js --find          only report which template would be used
//   node tools/setup-web.js --update        refresh the program files of an existing Fastweb (keeps Web.config and AppConfig)
//
// Search order (first valid folder wins):
//   1. the folder given on the command line
//   2. PROJECT.webTemplate in tools/model.js
//   3. environment variable ATSCADA_FASTWEB_TEMPLATE            (set it once per machine)
//   4. a "FastWeb\publish" folder next to any parent folder of this project (the publish output of the FastWeb source)
//   5. "<drive>:\ATSCADA_Source\FastWeb\publish" on any drive
//   6. the runtime installed with FastWeb Designer (usually older: check the component list it prints)
// What is NOT copied: the template's own AppConfig\ATSCADAWebConfig.xml (it belongs to another project), *.pdb,
// Web.Debug.config / Web.Release.config. Unrelated Web.config connections are preserved.
'use strict';
const fs = require('fs'), path = require('path');
const M = require('./model'), P = M.PROJECT;
const root = path.join(__dirname, '..'), dst = path.join(root, 'Fastweb');
const args = process.argv.slice(2), flag = f => args.includes(f), given = args.find(a => !a.startsWith('--'));

const valid = d => d && fs.existsSync(path.join(d, 'bin', 'ATSCADAFastWeb.Component.dll')) && fs.existsSync(path.join(d, 'AppScripts', 'Component')) && fs.existsSync(path.join(d, 'Web.config'));
function candidates() {
  const c = [];
  if (given) c.push(['command line', path.resolve(given)]);
  if (P.webTemplate) c.push(['PROJECT.webTemplate', P.webTemplate]);
  if (process.env.ATSCADA_FASTWEB_TEMPLATE) c.push(['ATSCADA_FASTWEB_TEMPLATE', process.env.ATSCADA_FASTWEB_TEMPLATE]);
  for (let d = root, i = 0; i < 6; i++) { const up = path.dirname(d); if (up === d) break; d = up; c.push(['near the project', path.join(d, 'FastWeb', 'publish')]); }
  for (const l of 'CDEFGHIJ') c.push(['source folder on drive ' + l, `${l}:\\ATSCADA_Source\\FastWeb\\publish`]);
  for (const pf of [process.env.ProgramFiles, process.env['ProgramFiles(x86)']]) if (pf) c.push(['FastWeb Designer runtime', path.join(pf, 'ATPro', 'FastWeb Designer', 'runtime-template')]);
  return c;
}
const describe = d => {
  const comps = fs.readdirSync(path.join(d, 'AppScripts', 'Component')).filter(n => fs.statSync(path.join(d, 'AppScripts', 'Component', n)).isDirectory());
  const built = fs.statSync(path.join(d, 'bin', 'ATSCADAFastWeb.Component.dll')).mtime;
  return { comps, built: built.toISOString().slice(0, 16).replace('T', ' '), card3: comps.includes('Cardv3') };
};

const found = candidates().find(c => valid(c[1]));
if (!found) {
  console.log('No Fastweb template found. Looked in:\n' + candidates().map(c => '  ' + c[1]).join('\n') +
    '\nAsk the user where their Fastweb web folder is, then run:  node tools/setup-web.js "<folder>"');
  process.exit(1);
}
const [why, src] = found, info = describe(src);
console.log(`Template: ${src}  (${why})\n  built ${info.built}, ${info.comps.length} components, card v3 ${info.card3 ? 'available' : 'NOT available (use W.card instead of W.card3)'}`);
if (flag('--find')) process.exit(0);
if (path.resolve(src).toLowerCase() === path.resolve(dst).toLowerCase()) { console.log('The template is this project\'s own Fastweb folder; nothing to copy.'); process.exit(1); }

const exists = fs.existsSync(dst);
if (exists && !flag('--update')) { console.log(`\n${dst} already exists. Nothing copied.\nTo refresh its program files from the template (Web.config and AppConfig are kept):  node tools/setup-web.js --update`); process.exit(1); }

let n = 0;
const skip = rel => /\.pdb$/i.test(rel) || /^Web\.(Debug|Release)\.config$/i.test(rel) || /^AppConfig[\\/]/i.test(rel) || (exists && /^Web\.config$/i.test(rel));
fs.cpSync(src, dst, { recursive: true, force: true, filter: s => { const rel = path.relative(src, s); if (rel && skip(rel)) return false; if (fs.statSync(s).isFile()) n++; return true; } });
fs.mkdirSync(path.join(dst, 'AppConfig'), { recursive: true });
console.log(`${exists ? 'Updated' : 'Copied'} ${n} files -> ${dst}`);

// ---- Web.config: update this project's connections.
// "atscada" must exist: the web logs tag writes (switch, input) through that fixed name. It points to the project database.
if (!exists) {
  const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const cs = xe(`server=${P.dbHost || 'localhost'};port=${P.dbPort || 3306};uid=${P.dbUser};pwd=${P.dbPass};database=${P.db}`);
  const names = [...new Set(['atscada', P.connection])];
  const entries = names.map(nm => `    <add name="${xe(nm)}" connectionString="${cs}" providerName="MySql.Data.MySqlClient" />`);
  const p = path.join(dst, 'Web.config'); let t = fs.readFileSync(p, 'utf8');
  if (!/<connectionStrings>[\s\S]*?<\/connectionStrings>/.test(t)) { console.log('ERROR: no <connectionStrings> block in Web.config - add the connection "' + P.connection + '" by hand'); process.exitCode = 1; }
  else {
    const updated = t.replace(/<connectionStrings>([\s\S]*?)<\/connectionStrings>/, (_, body) => {
      body = body.replace(/\s*<add\s+name="([^"]+)"[^>]*\/>/gi, (entry, name) => names.includes(name) ? '' : entry);
      return '<connectionStrings>' + body + '\r\n' + entries.join('\r\n') + '\r\n  </connectionStrings>';
    });
    fs.writeFileSync(p, updated, 'utf8');
    console.log('Web.config: project connections set to ' + names.join(', ') + ' -> database ' + P.db);
  }
}
const cfg = path.join(root, 'ATSCADAWebConfig.xml');
if (fs.existsSync(cfg)) { fs.copyFileSync(cfg, path.join(dst, 'AppConfig', 'ATSCADAWebConfig.xml')); console.log('AppConfig\\ATSCADAWebConfig.xml copied'); }
else console.log('Next: node tools/gen.js   (writes AppConfig\\ATSCADAWebConfig.xml)');
