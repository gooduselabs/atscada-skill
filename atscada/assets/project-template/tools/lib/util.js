// Shared helpers for the generators.
'use strict';
const fs = require('fs'), path = require('path');

const BOM = '﻿';
// XML attribute / text escape. Always go through this, never hand-escape.
const xe = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
// Same, plus newlines folded to spaces (used for SVG content embedded in an attribute).
const xeInline = s => xe(s).replace(/\r?\n/g, ' ');
// C# string literal
const cs = s => '"' + String(s).replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"';
// SQL string literal body
const sq = s => String(s).replace(/\\/g, '\\\\').replace(/'/g, "''");

function writer(root) {
  return (rel, text, bom = false) => {
    const p = path.join(root, rel);
    fs.mkdirSync(path.dirname(p), { recursive: true });
    fs.writeFileSync(p, (bom ? BOM : '') + text, 'utf8');
    return p;
  };
}

// Names used as Channel / Device / Task / Tag: ASCII letters, digits, underscore. No dot (the dot separates Channel.Device.Tag).
const NAME_RE = /^[A-Za-z0-9_]+$/;
const checkName = (kind, name, errs) => { if (!NAME_RE.test(String(name))) errs.push(`${kind} name not allowed (use A-Z a-z 0-9 _ only): "${name}"`); };

const dups = arr => [...new Set(arr.filter((v, i) => arr.indexOf(v) !== i))];

module.exports = { BOM, xe, xeInline, cs, sq, writer, NAME_RE, checkName, dups };
