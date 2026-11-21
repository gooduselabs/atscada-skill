// MySQL schema of the project: standard tables + one table per data logger + extra tables.
//
// model.LOGGERS: [{ name, table, rate?, items: [['Task.Tag', 'Column'], ...] }]
// model.ALARMS:  [['Task.Tag', 'display name', 'Task.HighLimitTag', 'Task.LowLimitTag', 'email list or null'], ...]
// model.TABLES:  [{ name, cols: [...], pk?: true }]   extra tables written by the app itself (daily / monthly summaries...)
'use strict';
const crypto = require('crypto');
const { sq } = require('./util');

// Value columns are varchar, the same as iDataLogger creates them: the web then reads back the exact text "12.5",
// independent of the decimal separator of the server's regional settings. Compare numerically in SQL with `col`+0.
const logTable = (name, cols, pk) => `CREATE TABLE IF NOT EXISTS \`${name}\` (\`DateTime\` datetime NOT NULL, ` +
  cols.map(c => `\`${c}\` varchar(32) DEFAULT NULL`).join(', ') + `, ${pk ? 'PRIMARY KEY' : 'KEY `idx_dt`'} (\`DateTime\`)) ENGINE=InnoDB DEFAULT CHARSET=utf8`;

function tables(M) {
  const t = {};
  (M.LOGGERS || []).forEach(l => { t[l.table] = l.items.map(i => i[1]); });
  (M.TABLES || []).forEach(x => { t[x.name] = x.cols; });
  return t;
}

function ddl(M) {
  return [
    'CREATE TABLE IF NOT EXISTS `alarmlog` (`DateTime` datetime NOT NULL, `TagName` varchar(100) NOT NULL, `TagAlias` varchar(100) NOT NULL, `Value` varchar(45) NOT NULL, `HighLevel` varchar(45) NOT NULL, `LowLevel` varchar(45) NOT NULL, `Status` varchar(200) NOT NULL, `Acknowledged` varchar(45) NOT NULL, KEY `idx_dt` (`DateTime`)) ENGINE=InnoDB DEFAULT CHARSET=utf8',
    'CREATE TABLE IF NOT EXISTS `alarmsettings` (`TagName` varchar(100) NOT NULL, `TagAlias` varchar(100) NOT NULL, `HighLevel` varchar(100) NOT NULL, `LowLevel` varchar(100) NOT NULL, `Email` varchar(500) DEFAULT NULL, PRIMARY KEY (`TagName`)) ENGINE=InnoDB DEFAULT CHARSET=utf8',
    'CREATE TABLE IF NOT EXISTS `useraccount` (`UserName` varchar(100) NOT NULL, `Password` varchar(100) NOT NULL, `Role` varchar(50) NOT NULL, PRIMARY KEY (`UserName`)) ENGINE=InnoDB DEFAULT CHARSET=utf8',
    ...(M.LOGGERS || []).map(l => logTable(l.table, l.items.map(i => i[1]))),
    ...(M.TABLES || []).map(x => logTable(x.name, x.cols, x.pk)),
  ];
}

const alarmRows = M => (M.ALARMS || []).map(a => `('${sq(a[0])}', '${sq(a[1])}', '${sq(a[2])}', '${sq(a[3])}', ${a[4] ? `'${sq(a[4])}'` : 'NULL'})`);
// Never overwrites the limits or e-mail an operator may have changed; only the display name follows the model.
const alarmSeed = M => alarmRows(M).length ? 'INSERT INTO `alarmsettings` (`TagName`, `TagAlias`, `HighLevel`, `LowLevel`, `Email`) VALUES ' + alarmRows(M).join(', ') +
  ' ON DUPLICATE KEY UPDATE `TagAlias` = VALUES(`TagAlias`), `HighLevel` = VALUES(`HighLevel`), `LowLevel` = VALUES(`LowLevel`)' : '';

// The web stores a password as the upper-case MD5 hex of the text.
const md5 = s => crypto.createHash('md5').update(String(s), 'utf8').digest('hex').toUpperCase();
const userSeed = M => (M.PROJECT.users || []).length ? 'INSERT IGNORE INTO `useraccount` (`UserName`, `Password`, `Role`) VALUES ' +
  M.PROJECT.users.map(u => `('${sq(u[0])}', '${md5(u[1])}', '${sq(u[2])}')`).join(', ') : '';

function script(M) {
  const db = M.PROJECT.db, a = alarmSeed(M), u = userSeed(M);
  return `-- Database of project ${M.PROJECT.name}. Run once:  mysql -u<user> -p < ${db}.sql   (the desktop app also creates what is missing)\n` +
    `-- Safe to run again: nothing is dropped, existing rows are kept.\n` +
    `CREATE DATABASE IF NOT EXISTS \`${db}\` DEFAULT CHARACTER SET utf8;\nUSE \`${db}\`;\n\n` + ddl(M).map(d => d + ';').join('\n\n') + '\n' +
    (a ? `\n-- Alarm list. HighLevel / LowLevel are TAG NAMES (Task.Tag) that hold the limits, not numbers.\n${a.replace(/\), \(/g, '),\n(')};\n` : '') +
    (u ? `\n-- Default web accounts, created only when missing (password = upper-case MD5).\n${u};\n` : '');
}

function validate(M, tagSet) {
  const errs = [], t = tables(M), names = Object.keys(t);
  const COL = /^[A-Za-z][A-Za-z0-9_]*$/;
  names.forEach(n => { if (!/^[a-z][a-z0-9_]*$/.test(n)) errs.push('table name should be lower case a-z 0-9 _: ' + n); t[n].forEach(c => { if (!COL.test(c)) errs.push(`column name not allowed: ${n}.${c}`); }); });
  (M.LOGGERS || []).forEach(l => {
    l.items.forEach(i => { if (!tagSet.has(i[0])) errs.push(`logger ${l.name}: tag not in TagFile: ${i[0]}`); });
    const c = l.items.map(i => i[1]); c.filter((v, i) => c.indexOf(v) !== i).forEach(d => errs.push(`logger ${l.name}: duplicate column ${d}`));
  });
  (M.ALARMS || []).forEach(a => [a[0], a[2], a[3]].forEach(tg => { if (!tagSet.has(tg)) errs.push('alarm uses a tag that is not in the TagFile: ' + tg); }));
  const an = (M.ALARMS || []).map(a => a[0]); an.filter((v, i) => an.indexOf(v) !== i).forEach(d => errs.push('duplicate alarm tag: ' + d));
  return errs;
}

module.exports = { tables, ddl, alarmSeed, userSeed, script, validate, md5 };
