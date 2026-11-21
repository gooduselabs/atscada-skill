// Web pages of the project (EXAMPLE). build(W, M) returns the list of views; W = builders from lib/web.js.
// Page pattern used here: overview (diagram, KPI cards, charts, latest alarms) -> hidden detail page per device
// (opened from the diagram) -> history -> reports -> alarms -> settings.
'use strict';

exports.build = function (W, M) {
  const { C, METERS, METER_LOG } = M, G = W.G, sc = require('./scenes');
  const views = [];

  // ---- 1. overview
  views.push(W.view('Overview', 'overview', 'dashboard', [
    W.full([W.svg('overview', sc.overviewSvg())]),
    W.full(METERS.flatMap(m => [
      W.alarmCard(`${m.name} · Power (kW)`, `${m.id}.Power_P`, '#1d6fb8', 'fa-bolt', G.four, 1, [{ th: `${m.id}_Cfg.Hi_Power_P`, useTag: true }]),
      W.card(`${m.name} · Energy (kWh)`, `${m.id}.Energy_total`, '#b45309', 'fa-plug', G.four, 0)])),
    W.full([
      W.chart('Power - real time (kW)', 'kW', METERS.map(m => [m.name, `${m.id}.Power_P`, m.color])),
      W.chart('Power share', 'kW', METERS.map(m => [m.name, `${m.id}.Power_P`, m.color]), G.two, 'donut', '340px')]),
    W.full([W.alarmViewer('Latest alarms', 10)]),
  ]));

  // ---- 2. one hidden detail page per meter: cards first, then real-time chart next to its history, then report, then limits
  METERS.forEach(m => {
    const X = m.id, tb = 'datalog_' + X.toLowerCase();
    views.push(W.view(m.name, m.loc, 'electric_meter', [
      W.full([
        W.card('Voltage L1 (V)', `${X}.Voltage_L1`, '#6d4fc4', 'fa-plug', G.six), W.card('Voltage L2 (V)', `${X}.Voltage_L2`, '#6d4fc4', 'fa-plug', G.six),
        W.card('Voltage L3 (V)', `${X}.Voltage_L3`, '#6d4fc4', 'fa-plug', G.six), W.card('Current L1 (A)', `${X}.Current_L1`, '#9d3b74', 'fa-wave-square', G.six),
        W.card('Current L2 (A)', `${X}.Current_L2`, '#9d3b74', 'fa-wave-square', G.six), W.card('Current L3 (A)', `${X}.Current_L3`, '#9d3b74', 'fa-wave-square', G.six)]),
      W.full([
        W.chart('Power - real time (kW)', 'kW', [['Power', `${X}.Power_P`, C.pal[0]]]),
        W.hchart('Power - history (kW)', 'kW', tb, [['Power', 'Power_P', C.pal[0]]])]),
      W.full([
        W.chart('3-phase current - real time (A)', 'A', [['L1', `${X}.Current_L1`, C.L1], ['L2', `${X}.Current_L2`, C.L2], ['L3', `${X}.Current_L3`, C.L3]]),
        W.hchart('3-phase current - history (A)', 'A', tb, [['L1', 'Current_L1', C.L1], ['L2', 'Current_L2', C.L2], ['L3', 'Current_L3', C.L3]])]),
      W.full([W.energyReport('Energy by hour / day / month / year (kWh)', tb, [['Energy_total', '#ffffff']]), W.dataReport('Detailed data', tb, METER_LOG)]),
      W.full([W.input('Power HIGH limit (kW)', `${X}_Cfg.Hi_Power_P`), W.input('Power LOW limit (kW)', `${X}_Cfg.Lo_Power_P`)]),
    ], false));
  });

  // ---- 3. history & comparison
  views.push(W.view('History', 'history', 'timeline',
    [W.full(METERS.map(m => W.hchart(`${m.name} · Power (kW)`, 'kW', 'datalog_' + m.id.toLowerCase(), [['Power', 'Power_P', m.color]], G.one)))]));

  // ---- 4. alarms
  views.push(W.view('Alarms', 'alarms', 'notifications', [W.full([W.alarmViewer('Active alarms', 50), W.alarmReporter('Alarm history report')])]));

  // ---- 5. settings
  views.push(W.view('Settings', 'settings', 'settings', [
    W.full([W.input('Logging interval (ms)', 'Setting.Timerate'), W.input('Alarm e-mail recipients (comma separated)', 'Setting.Email_Alarm')]),
  ]));

  if (M.PROJECT.login) views.push(W.usersView('Users'));
  return views;
};
