using System;
using System.Collections.Generic;
using System.Globalization;
using System.IO;
using System.Windows.Forms;
using System.Xml;

namespace __NS__
{
    /// <summary>
    /// Desktop app of project __PROJECT__: loads Tag_file.XML, hosts iWebService for the web, runs the data / alarm loggers.
    /// The components (driver, web service, loggers) are declared in MainForm.Designer.cs, which is GENERATED from
    /// tools/model.js. This file is yours: put the project logic in AppTick().
    /// </summary>
    public partial class MainForm : Form
    {
        private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

        private readonly Dictionary<string, string> lastWritten = new Dictionary<string, string>();
        private readonly List<KeyValuePair<string, List<string>>> tasks = new List<KeyValuePair<string, List<string>>>();
        private readonly Timer appTimer = new Timer();
        private readonly Timer settingTimer = new Timer();
        private DateTime lastTick = DateTime.MinValue;
        private int tickNo;
        private bool seeded, ready;
        private long appliedRate;
        private string dbNote = "";

        public MainForm()
        {
            InitializeComponent();
            string tagFile = Path.Combine(Application.StartupPath, "Tag_file.XML");
            LoadTaskList(tagFile);

            // ProjectFile is assigned LAST: every tool subscribes to the driver's ConstructionCompleted event, which fires
            // only once, when the project is loaded. Anything attached after this line never starts.
            iDriver1.ProjectFile = tagFile;

            appTimer.Interval = 1000;
            appTimer.Tick += delegate { Tick(); };
            settingTimer.Interval = 3000;
            settingTimer.Tick += delegate { SyncSettings(); };
            Shown += delegate { PrepareDatabase(); };
        }

        // ---------- database: create what is missing (background), then start the timers ----------
        private void PrepareDatabase()
        {
            lblStatus.Text = "Preparing database...";
            System.Threading.Tasks.Task.Run(delegate
            {
                string note;
                try { Db.EnsureSchema(); note = "database OK"; }
                catch (Exception ex) { note = "Database ERROR: " + ex.Message; }
                try
                {
                    BeginInvoke(new Action(delegate
                    {
                        dbNote = note;
                        ready = true;
                        lastTick = DateTime.UtcNow;
                        appTimer.Start(); settingTimer.Start();
                    }));
                }
                catch { }
            });
        }

        // ---------- tag access ----------
        /// <summary>Tag value as text; null when the task / tag does not exist or the driver is not ready.</summary>
        private string Read(string task, string tag)
        {
            try { return iDriver1.Task(task).Tag(tag).Value; }
            catch { return null; }
        }

        /// <summary>Tag quality as reported by the driver (compare case-insensitively with "Good").</summary>
        private string Status(string task, string tag)
        {
            try { return iDriver1.Task(task).Tag(tag).Status; }
            catch { return null; }
        }

        private double ReadNum(string task, string tag, double fallback)
        {
            double v;
            string s = Read(task, tag);
            if (s != null) s = s.Trim().Replace(',', '.');      // a decimal comma is accepted too
            return double.TryParse(s, NumberStyles.Float, Inv, out v) ? v : fallback;
        }

        /// <summary>Asynchronous write, only when the value changed (keeps the driver's write queue short).</summary>
        private void Write(string task, string tag, string value)
        {
            string key = task + "." + tag, prev;
            if (lastWritten.TryGetValue(key, out prev) && prev == value) return;
            try { iDriver1.Task(task).Tag(tag).ASynWrite(value); lastWritten[key] = value; }
            catch { }
        }

        private void Write(string task, string tag, double value, string fmt) { Write(task, tag, value.ToString(fmt, Inv)); }

        /// <summary>Synchronous write for the few values that must not be lost (commands). Returns the driver's answer.</summary>
        private string WriteNow(string task, string tag, string value)
        {
            try { return iDriver1.Task(task).Tag(tag).SynWrite(value); }
            catch (Exception ex) { return ex.Message; }
        }

        private static bool Blank(string s) { return s == null || s.Trim().Length == 0; }

        /// <summary>Initial value of a setting tag: written only while the tag is still empty (or "0" unless 0 is a valid value).</summary>
        private void Seed(string task, string tag, string value, bool zeroIsValid)
        {
            string cur = Read(task, tag);
            if (Blank(cur) || (!zeroIsValid && cur.Trim() == "0" && value != "0"))
                try { iDriver1.Task(task).Tag(tag).ASynWrite(value); } catch { }
        }

        // ---------- settings: link targets, default values, logging interval ----------
        private void SyncSettings()
        {
            try
            {
                if (!seeded)
                {
                    foreach (var l in Model.Links) Write(l[0], l[1], l[2]);
                    foreach (var d in Model.Defaults) Seed(d[0], d[1], d[2], d[3] == "1");
                    // A write is asynchronous and is dropped while the driver has not read the tag for the first time,
                    // so the job counts as done only when every value can be read back.
                    bool ok = true;
                    foreach (var l in Model.Links) if (Read(l[0], l[1]) != l[2]) { ok = false; lastWritten.Remove(l[0] + "." + l[1]); }
                    foreach (var d in Model.Defaults) if (Blank(Read(d[0], d[1]))) ok = false;
                    seeded = ok;
                }

                if (Model.LogRateTag.Length > 0)
                {
                    string[] p = Model.LogRateTag.Split('.');
                    long rate;
                    if (long.TryParse(Read(p[0], p[1]), out rate) && rate >= 1000 && rate != appliedRate)
                    {
                        foreach (var lg in AllLoggers()) lg.LoggingTimerRate = "\"" + rate + "\"";
                        appliedRate = rate;
                    }
                }
            }
            catch (Exception ex) { lblStatus.Text = "Settings: " + ex.Message; }
        }

        // ---------- 1 second tick ----------
        private void Tick()
        {
            if (!ready) return;
            try
            {
                DateTime utc = DateTime.UtcNow;
                double dt = Math.Min(30, Math.Max(0.2, (utc - lastTick).TotalSeconds));   // real elapsed seconds
                lastTick = utc;
                tickNo++;
                // Forget what was written every 90 s: after ATDriver Server restarts, Internal Memory tags may be back at
                // their saved values while this app still believes its last write is in place.
                if (tickNo % 90 == 0) lastWritten.Clear();

                AppTick(dt);

                if (tickNo % 2 == 0) RefreshTaskList();
                lblStatus.Text = "Running · " + dbNote + (seeded ? "" : " · writing default settings...") + (appliedRate > 0 ? " · log every " + appliedRate / 1000 + " s" : "");
            }
            catch (Exception ex) { lblStatus.Text = "Tick: " + ex.Message; }
        }

        /// <summary>
        /// Project logic, once per second; dt = seconds since the previous call.
        /// Typical content: derived values (sum of several meters -> a total tag), counters integrated over real time
        /// (energy += power * dt / 3600), simulation while there is no device. Use Read / ReadNum / Write above.
        /// With many tags, write them in turns (a few groups per tick) instead of all at once.
        /// </summary>
        private void AppTick(double dt)
        {
        }

        // ---------- task list on the form: how many tags of each task are Good ----------
        private void LoadTaskList(string tagFile)
        {
            lvTasks.Columns.Add("Task", 200);
            lvTasks.Columns.Add("Tags", 70, HorizontalAlignment.Right);
            lvTasks.Columns.Add("Good", 70, HorizontalAlignment.Right);
            lvTasks.Columns.Add("First tag", 180);
            lvTasks.Columns.Add("Value", 150);
            try
            {
                var doc = new XmlDocument();
                doc.Load(tagFile);
                foreach (XmlNode t in doc.SelectNodes("/Root/Task"))
                {
                    var names = new List<string>();
                    foreach (XmlNode g in t.SelectNodes("Tag")) names.Add(g.Attributes["TagName"].Value);
                    string name = t.SelectSingleNode("TaskName").Attributes["Value"].Value;
                    tasks.Add(new KeyValuePair<string, List<string>>(name, names));
                    lvTasks.Items.Add(new ListViewItem(new[] { name, names.Count.ToString(Inv), "", names.Count > 0 ? names[0] : "", "" }));
                }
            }
            catch (Exception ex) { lblStatus.Text = "Tag_file.XML: " + ex.Message; }
        }

        private void RefreshTaskList()
        {
            lvTasks.BeginUpdate();
            for (int i = 0; i < tasks.Count; i++)
            {
                int good = 0;
                foreach (string tag in tasks[i].Value)
                    if (string.Equals(Status(tasks[i].Key, tag), "Good", StringComparison.OrdinalIgnoreCase)) good++;
                var it = lvTasks.Items[i];
                it.SubItems[2].Text = good.ToString(Inv);
                it.SubItems[4].Text = tasks[i].Value.Count > 0 ? (Read(tasks[i].Key, tasks[i].Value[0]) ?? "") : "";
                it.ForeColor = good == tasks[i].Value.Count ? System.Drawing.Color.Black : (good == 0 ? System.Drawing.Color.Firebrick : System.Drawing.Color.DarkOrange);
            }
            lvTasks.EndUpdate();
        }
    }
}
