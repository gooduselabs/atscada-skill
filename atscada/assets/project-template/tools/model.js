// Data model of the project - the SINGLE SOURCE for the ATFile, TagFile, SQL, desktop app and web.
// Edit here, then run:  node tools/gen.js
//
// This file is an EXAMPLE (two Modbus TCP power meters + internal setting tags). Replace every value with what the
// user specified; never keep an address, IP, limit or password from the example.
'use strict';

const PROJECT = {
  name: 'DemoPlant',                    // letters / digits / underscore; becomes file names and the C# namespace
  title: 'Demo Plant · Energy Monitoring',
  db: 'demoplant',                      // one MySQL database per project
  dbUser: 'CHANGE_ME_USER', dbPass: 'CHANGE_ME_PASSWORD', // supply project-specific credentials
  dbHost: 'localhost', dbPort: 3306,
  connection: 'demoplant',              // connectionString name in the web's Web.config
  webHost: 'localhost', webPort: 8010,  // iWebService of the desktop app = at-service of the web
  login: false,                         // true = the web asks for user name and password
  users: [],                            // default accounts, created only when missing: [['admin', '<password>', 'Admin'], ...]
  logRate: 60000,                       // default logging interval (ms)
  logRateTag: 'Setting.Timerate',       // tag that overrides it at run time ('' = none)
  emailTag: 'Setting.Email_Alarm',      // tag holding the alarm e-mail recipients ('' = none)
  desktopLabels: [['Meter 1 power (kW)', 'Meter1.Power_P'], ['Meter 2 power (kW)', 'Meter2.Power_P']],   // up to 4 live values on the desktop form
  // driverDir: 'C:\\Program Files\\ATPro\\ATDriverServer\\Drivers',   // only when ATDriver Server is installed elsewhere
};

// Look of the SVG diagrams - ASK THE USER (references/design.md, "Chọn phong cách sơ đồ"):
//   'scada-dark' | 'scada-light' | 'dashboard' | 'illustrated'; then override single colours below to follow a plant standard.
const SVG_STYLE = 'scada-dark';
// One palette for the whole project: SVG, cards, charts.
const C = Object.assign({}, require('./lib/svglib').styleOf(SVG_STYLE), {
  // run: '#3fb950', fault: '#e5484d', ...   (state colours: follow the site standard if the user has one)
});

// ---------------------------------------------------------------- tags
// Tag: { name, addr, type, access, desc, scale?, offset?, alias? }  -  or [name, desc] for an internal String tag.
const METER_TAGS = [
  { name: 'Voltage_L1', addr: '400001', type: 'Float', access: 'ReadOnly', desc: 'Voltage L1-N (V)' },
  { name: 'Voltage_L2', addr: '400003', type: 'Float', access: 'ReadOnly', desc: 'Voltage L2-N (V)' },
  { name: 'Voltage_L3', addr: '400005', type: 'Float', access: 'ReadOnly', desc: 'Voltage L3-N (V)' },
  { name: 'Current_L1', addr: '400007', type: 'Float', access: 'ReadOnly', desc: 'Current L1 (A)' },
  { name: 'Current_L2', addr: '400009', type: 'Float', access: 'ReadOnly', desc: 'Current L2 (A)' },
  { name: 'Current_L3', addr: '400011', type: 'Float', access: 'ReadOnly', desc: 'Current L3 (A)' },
  { name: 'Power_P', addr: '400013', type: 'Float', access: 'ReadOnly', desc: 'Active power (kW)' },
  { name: 'PF', addr: '400015', type: 'Float', access: 'ReadOnly', desc: 'Power factor' },
  { name: 'Energy_total', addr: '400017', type: 'Float', access: 'ReadOnly', desc: 'Total energy (kWh)' },
];
const METER_LOG = ['Voltage_L1', 'Voltage_L2', 'Voltage_L3', 'Current_L1', 'Current_L2', 'Current_L3', 'Power_P', 'PF', 'Energy_total'];
const METERS = [
  { id: 'Meter1', name: 'Incomer 1', ip: '192.168.1.11', loc: 'meter-1', color: C.pal[0] },
  { id: 'Meter2', name: 'Incomer 2', ip: '192.168.1.12', loc: 'meter-2', color: C.pal[1] },
];
// Alarm limits are TAGS (so they can be edited on the web): keep them in an Internal Memory device per meter.
const LIMIT_TAGS = [['Hi_Power_P', 'Power high limit (kW)'], ['Lo_Power_P', 'Power low limit (kW)'], ['Link', 'URL of the meter page']];
const SETTING_TAGS = [['Timerate', 'Logging interval (ms)'], ['Email_Alarm', 'Alarm e-mail recipients, comma separated']];
const NAV = [['Home', 'overview'], ['History', 'history'], ['Alarm', 'alarms'], ['Setting', 'settings']];

// Channel -> Device (= Task on the client side) -> Tag. The address strings are driver specific:
// read references/drivers/<driver>.md of the skill before writing them.
const CHANNELS = [
  {
    name: 'MB_TCP', dll: 'ModbusTCP.dll', address: '3600',
    // DeviceID of Modbus TCP: IP|Port|UnitID|TimeOut|OrderBy|MaxReadTimes|BlockSettings (7 fields, the last "|" stays even when empty)
    devices: METERS.map(m => ({ name: m.id, id: `${m.ip}|502|1|1000|1|10|4-1-1-18`, desc: m.name, tags: METER_TAGS })),
  },
  {
    name: 'IM_SYS', dll: 'InternalMemory.dll', address: 'InternalMemory|60000',
    devices: [
      ...METERS.map(m => ({ name: m.id + '_Cfg', desc: m.name, tags: LIMIT_TAGS })),
      { name: 'Setting', tags: SETTING_TAGS },
      { name: 'Nav', tags: NAV.map(n => [n[0], 'URL of page ' + n[1]]) },
    ],
  },
];

// ---------------------------------------------------------------- logging, alarms, start-up values
// One iDataLogger + one table per group. items: [['Task.Tag', 'Column'], ...]
const LOGGERS = METERS.map(m => ({ name: m.id, table: 'datalog_' + m.id.toLowerCase(), note: m.name, items: METER_LOG.map(c => [`${m.id}.${c}`, c]) }));
// Extra tables the app fills itself (daily summaries...): [{ name: 'energy_daily', cols: [...], pk: true }]
const TABLES = [];
// [Task.Tag, display name, high-limit TAG, low-limit TAG, e-mail or null]
const ALARMS = METERS.map(m => [`${m.id}.Power_P`, `${m.name} · Power (kW)`, `${m.id}_Cfg.Hi_Power_P`, `${m.id}_Cfg.Lo_Power_P`, null]);
// Link targets written by the desktop app at start-up: [Task.Tag, at-location of the page]
const LINKS = [...NAV.map(n => [`Nav.${n[0]}`, n[1]]), ...METERS.map(m => [`${m.id}_Cfg.Link`, m.loc])];
// Initial values written once while the tag is still empty: [Task.Tag, value, zeroIsValid?]
const DEFAULTS = [
  ['Setting.Timerate', '60000'],
  ...METERS.flatMap(m => [[`${m.id}_Cfg.Hi_Power_P`, '100'], [`${m.id}_Cfg.Lo_Power_P`, '0', true]]),
];

// Database column -> report header shown on the web (ASCII only, max 64 characters: it is used as an SQL alias)
const COL_HEADER = {
  Voltage_L1: 'Voltage L1 (V)', Voltage_L2: 'Voltage L2 (V)', Voltage_L3: 'Voltage L3 (V)',
  Current_L1: 'Current L1 (A)', Current_L2: 'Current L2 (A)', Current_L3: 'Current L3 (A)',
  Power_P: 'Power (kW)', PF: 'Power factor', Energy_total: 'Total energy (kWh)',
};

module.exports = { PROJECT, C, SVG_STYLE, CHANNELS, LOGGERS, TABLES, ALARMS, LINKS, DEFAULTS, COL_HEADER, METERS, METER_LOG, NAV };

