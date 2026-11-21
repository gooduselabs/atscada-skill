using System;
using System.Globalization;
using System.Threading;
using System.Windows.Forms;

namespace __NS__
{
    internal static class Program
    {
        [STAThread]
        static int Main(string[] args)
        {
            // The loggers build SQL text with the current culture. On a machine with Vietnamese regional settings the
            // decimal comma would break every INSERT, so the whole process runs with the invariant culture.
            CultureInfo.DefaultThreadCurrentCulture = CultureInfo.InvariantCulture;
            Thread.CurrentThread.CurrentCulture = CultureInfo.InvariantCulture;

            // "__NS__.exe --schema": create the database and tables, then exit (no form, ATDriver Server not needed)
            if (args.Length > 0 && args[0] == "--schema")
            {
                string log = System.IO.Path.Combine(Application.StartupPath, "schema.log");
                try { Db.EnsureSchema(); System.IO.File.WriteAllText(log, DateTime.Now + " schema OK" + Environment.NewLine); return 0; }
                catch (Exception ex) { System.IO.File.WriteAllText(log, DateTime.Now + " ERROR: " + ex + Environment.NewLine); return 1; }
            }

            // One instance only: two copies would log every row twice and fight over tag writes.
            bool created;
            using (var mutex = new Mutex(true, "ATSCADA___PROJECT___Owner", out created))
            {
                if (!created)
                {
                    MessageBox.Show("__PROJECT__ is already running. Only one instance is allowed.", "ATSCADA", MessageBoxButtons.OK, MessageBoxIcon.Information);
                    return 0;
                }
                Application.EnableVisualStyles();
                Application.SetCompatibleTextRenderingDefault(false);
                Application.Run(new MainForm());
                mutex.ReleaseMutex();
            }
            return 0;
        }
    }
}
