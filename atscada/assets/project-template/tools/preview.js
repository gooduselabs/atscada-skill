// Renders the SVG diagrams to PNG outside the web: builds an HTML page that mimics how Fastweb applies tag values to
// the SVG (with made-up values), then takes a screenshot with a headless browser.
//   node tools/preview.js [name...]     -> svg/preview/<name>.png   (+ .html you can open and inspect)
// It shows the STATIC layout with plausible numbers: overlapping text, clipped labels, wrong colours.
// Real behaviour (live values, blinking, links) can only be judged on the running web.
'use strict';
const fs = require('fs'), path = require('path'), cp = require('child_process');
const M = require('./model');
const W = require('./lib/web')(M);
require('./pages').build(W, M);                    // registers every diagram in W.svgs
const root = path.join(__dirname, '..'), out = path.join(root, 'svg', 'preview');
fs.mkdirSync(out, { recursive: true });

const BROWSERS = [process.env.PREVIEW_BROWSER, 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe'].filter(Boolean);
const browser = BROWSERS.find(b => fs.existsSync(b));
if (!browser) { console.log('No Edge / Chrome found. Set PREVIEW_BROWSER to the browser exe. The .html files are still written to ' + out); }

// Made-up value per tag: 0/1 for Run-like names, 1 for State, otherwise a stable pseudo-random number.
// Add entries to PREVIEW_VALUES in model.js ({ 'Task.Tag' or 'Tag': value }) for realistic screenshots.
const FAKE = `
const FIX=${JSON.stringify(M.PREVIEW_VALUES || {})};
function h(s){let x=7;for(const c of s)x=(x*31+c.charCodeAt(0))%9973;return x}
function fake(tag){
  if(tag in FIX)return FIX[tag]; const name=tag.split('.')[1]||tag; if(name in FIX)return FIX[name];
  const k=h(tag);
  if(name==='State')return k%7===0?2:(k%4===0?0:1);
  if(/(^|_)(Run|Running|On|Enable|Online)$/.test(name))return k%4===0?0:1;
  if(/(^|_)(Fault|Alarm|Trip)$/.test(name))return k%7===0?1:0;
  if(/^PF/.test(name))return .92; if(/Voltage/.test(name))return +(228+k%5+.4).toFixed(1); if(/Pct|Load|Level/.test(name))return 40+k%50;
  return +(10+k%900+.5).toFixed(1);
}`;
const APPLY = `
function colorOf(map,v){const kv=map.split(',').map(p=>{const i=p.indexOf('-');return{key:parseInt(p.slice(0,i)),value:p.slice(i+1)}});
  for(let i=0;i<kv.length;i++){const c=kv[i]; if(v<c.key)return c.value; if(i+1<kv.length&&v>=c.key&&v<=kv[i+1].key)return kv[i+1].value; if(v>kv[kv.length-1].key)return kv[kv.length-1].value}}
const missing=[];
for(const it of ITEMS){const a=it.a, el=document.getElementById(a['at-name']); if(!el){missing.push(a['at-name']);continue}
  const v=fake(a['at-data-tag-name']);
  if(it.el==='atscada-svgvalue-item'){
    if(a['at-properties']==='Value')el.innerHTML=v;
    else if(a['at-type']==='Color'){const c=colorOf(a['at-bad'],v); if(c)el.style.fill=c}
    else if(a['at-type']==='Rotate'||a['at-type']==='Conveyor')el.style.setProperty('animation-play-state',v==1?'running':'paused','important');
  } else if(it.el==='atscada-svgcutaway-item'){
    const fr=el, lv=document.getElementById(a['at-id2']), max=parseFloat(a['at-max']); const parts=a['at-atribute'].split(';'); const dir=(parts[1]||'Dir=Up').slice(4);
    const r=Math.max(0,Math.min(1,v/max));
    if(dir==='Up'){const H=parseFloat(fr.getAttribute('height')),y=parseFloat(fr.getAttribute('y')),n=r*H; lv.setAttribute('height',n); lv.setAttribute('y',y+H-n)}
    else{lv.setAttribute('width',r*parseFloat(fr.getAttribute('width')))}
    const c=parts[0].split(','); if(c.length>=3){const lo=c[0].split('-'),hi=c[2].split('-'); lv.style.fill = v<parseFloat(lo[0])?lo[1]:(v>parseFloat(hi[0])?hi[1]:c[1])}
  }
}
if(missing.length)document.title='MISSING '+missing.join(',');`;

const want = process.argv.slice(2);
for (const [name, s] of Object.entries(W.svgs)) {
  if (want.length && !want.includes(name)) continue;
  const html = `<!doctype html><meta charset="utf-8"><body style="margin:0;background:${M.C.bg}"><div style="width:${s.w}px;height:${s.h}px">${s.toString()}</div><script>${FAKE}\nconst ITEMS=${JSON.stringify(s.items)};${APPLY}</script>`;
  const hp = path.join(out, name + '.html'), pp = path.join(out, name + '.png');
  fs.writeFileSync(hp, html);
  if (browser) cp.execFileSync(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', `--window-size=${s.w},${s.h}`, '--virtual-time-budget=2500', `--screenshot=${pp}`, 'file:///' + hp.replace(/\\/g, '/')], { stdio: 'ignore' });
  console.log(name + ': ' + s.items.length + ' links, ' + Math.round(s.toString().length / 1024) + ' KB' + (browser ? ' -> ' + pp : ' -> ' + hp));
}
