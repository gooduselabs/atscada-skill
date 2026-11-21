// ATFile (ATDriver Server) + TagFile (desktop app) from model.CHANNELS.
//
// Channel: { name, dll, address, rate?, maxWrite?, devices: [...] }
// Device:  { name, id, task?, taskRate?, desc?, tags: [...] }        task defaults to the device name
// Tag:     { name, addr?, type?, access?, desc?, alias?, scale?, offset? }   or the short form [name, desc]
//          addr defaults to name, type to 'String', access to 'ReadWrite' (the Internal Memory convention)
'use strict';
const path = require('path');
const { xe, checkName, dups } = require('./util');

const TYPES = ['Bool', 'Byte', 'Word', 'Short', 'DWord', 'Long', 'Float', 'Double', 'String', 'Default'];

function normalize(M) {
  const P = M.PROJECT;
  const driverDir = P.driverDir || 'C:\\Program Files\\ATPro\\ATDriverServer\\Drivers';
  return M.CHANNELS.map(ch => ({
    name: ch.name,
    dll: /[\\/]/.test(ch.dll) ? ch.dll : path.win32.join(driverDir, ch.dll),
    dllName: path.win32.basename(ch.dll),
    rate: ch.rate || 1000,
    maxWrite: ch.maxWrite || 10,
    address: ch.address,
    devices: ch.devices.map(d => ({
      name: d.name, id: d.id === undefined ? d.name : d.id, task: d.task || d.name, taskRate: d.taskRate || P.taskRate || 1000, desc: d.desc || '',
      tags: d.tags.map(t => Array.isArray(t) ? { name: t[0], desc: t[1] || '' } : t).map(t => ({
        name: t.name, addr: t.addr === undefined ? t.name : String(t.addr), type: t.type || 'String', access: t.access || 'ReadWrite',
        desc: t.desc || '', alias: t.alias || t.name, scale: t.scale === undefined ? 1 : t.scale, offset: t.offset === undefined ? 0 : t.offset,
      })),
    })),
  }));
}

// Set of "Task.Tag" names, the form every later step uses (desktop app, loggers, alarms, web).
function allTags(M) {
  const s = new Set();
  for (const ch of normalize(M)) for (const d of ch.devices) for (const t of d.tags) s.add(d.task + '.' + t.alias);
  return s;
}

function validate(M) {
  const errs = [], chs = normalize(M);
  dups(chs.map(c => c.name)).forEach(n => errs.push('duplicate channel name: ' + n));
  dups(chs.flatMap(c => c.devices.map(d => d.task))).forEach(n => errs.push('duplicate task name (device names must be unique across channels): ' + n));
  for (const ch of chs) {
    checkName('Channel', ch.name, errs);
    if (ch.address === undefined || ch.address === null) errs.push(`channel ${ch.name}: missing address (ChannelAddress)`);
    dups(ch.devices.map(d => d.name)).forEach(n => errs.push(`channel ${ch.name}: duplicate device name ${n}`));
    for (const d of ch.devices) {
      checkName('Device', d.name, errs); checkName('Task', d.task, errs);
      dups(d.tags.map(t => t.name)).forEach(n => errs.push(`${ch.name}.${d.name}: duplicate tag name ${n}`));
      dups(d.tags.map(t => t.alias)).forEach(n => errs.push(`task ${d.task}: duplicate TagName ${n}`));
      for (const t of d.tags) {
        checkName('Tag', t.name, errs); checkName('TagName', t.alias, errs);
        if (!TYPES.includes(t.type)) errs.push(`${d.name}.${t.name}: unknown Type ${t.type}`);
        if (!['ReadOnly', 'ReadWrite'].includes(t.access)) errs.push(`${d.name}.${t.name}: ClientAccess must be ReadOnly or ReadWrite`);
        if (t.addr === '') errs.push(`${d.name}.${t.name}: empty address`);
      }
    }
  }
  return errs;
}

// One line, UTF-8 with BOM, element and attribute ORDER is mandatory:
//   Channel: ChannelName, ChannelDriverLocation, ChannelRate, ChannelMaxWTimes, ChannelAddress, Device...
//   Tag:     Name, Addrress (three r), Type, ClientAccess, Description   - read by position, all five always present
function atFile(M) {
  let s = '<?xml version="1.0" encoding="utf-8" standalone="yes"?><Root>', nDev = 0, nTag = 0;
  const chs = normalize(M);
  for (const ch of chs) {
    s += `<Channel><ChannelName Value="${xe(ch.name)}" /><ChannelDriverLocation Value="${xe(ch.dll)}" /><ChannelRate Value="${ch.rate}" /><ChannelMaxWTimes Value="${ch.maxWrite}" /><ChannelAddress Value="${xe(ch.address)}" />`;
    for (const d of ch.devices) {
      nDev++;
      s += `<Device><DeviceName Value="${xe(d.name)}" /><DeviceID Value="${xe(d.id)}" />`;
      for (const t of d.tags) { nTag++; s += `<Tag Name="${xe(t.name)}" Addrress="${xe(t.addr)}" Type="${t.type}" ClientAccess="${t.access}" Description="${xe((d.desc ? d.desc + ' - ' : '') + t.desc)}" />`; }
      s += '</Device>';
    }
    s += '</Channel>';
  }
  return { xml: s + '</Root>', channels: chs.length, devices: nDev, tags: nTag };
}

// TagAddress = Channel.Device.Tag exactly as in the ATFile; TagName = the client side name (alias); value = raw x Scale + Offset.
function tagFile(M) {
  const P = M.PROJECT, loader = P.driverLoader || 'AT';
  let s = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\r\n<Root>\r\n  <Driver>\r\n' +
    `    <DriverLoader Value="${loader}" />\r\n    <DriverName Value="ATDriverClient" />\r\n    <DriverAddress Value="${xe(P.driverAddress || 'localhost|5000')}" />\r\n` +
    '    <DriverFT Value="30000" />\r\n    <DriverRedundancy Value="" />\r\n  </Driver>\r\n';
  let nTask = 0;
  for (const ch of normalize(M)) for (const d of ch.devices) {
    nTask++;
    s += `  <Task>\r\n    <TaskName Value="${xe(d.task)}" />\r\n    <TaskRate Value="${d.taskRate}" />\r\n`;
    for (const t of d.tags) s += `    <Tag Offset="${t.offset}" Scale="${t.scale}" DriverLoader="${loader}" TagAddress="${xe(ch.name + '.' + d.name + '.' + t.name)}" TagName="${xe(t.alias)}" />\r\n`;
    s += '  </Task>\r\n';
  }
  return { xml: s + '</Root>\r\n', tasks: nTask };
}

module.exports = { normalize, allTags, validate, atFile, tagFile, TYPES };
