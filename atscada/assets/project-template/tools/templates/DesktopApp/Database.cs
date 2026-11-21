using System;
using System.Collections.Generic;
using System.Globalization;
using MySql.Data.MySqlClient;

namespace __NS__
{
    /// <summary>Creates the database and tables that are missing; small helpers for the project's own queries.</summary>
    internal static class Db
    {
        private static readonly CultureInfo Inv = CultureInfo.InvariantCulture;

        // Set the environment variable __ENV__ to use another connection string without rebuilding.
        public static string ConnStr { get { return Environment.GetEnvironmentVariable("__ENV__") ?? Model.ConnStr; } }

        /// <summary>CREATE ... IF NOT EXISTS only: never drops or empties anything, safe on a database that holds data.</summary>
        public static void EnsureSchema()
        {
            try
            {
                using (var cn = new MySqlConnection(Model.ConnStrNoDb))
                {
                    cn.Open();
                    Exec(cn, "CREATE DATABASE IF NOT EXISTS `" + Model.Database + "` DEFAULT CHARACTER SET utf8");
                }
            }
            catch (MySqlException) { /* the account may not be allowed to create databases; go on if the database is there */ }
            using (var cn = new MySqlConnection(ConnStr))
            {
                cn.Open();
                foreach (string ddl in Model.Ddl) Exec(cn, ddl);
                if (Model.AlarmSeedSql.Length > 0) Exec(cn, Model.AlarmSeedSql);
                if (Model.UserSeedSql.Length > 0) Exec(cn, Model.UserSeedSql);
            }
        }

        public static void Exec(MySqlConnection cn, string sql)
        {
            using (var cmd = new MySqlCommand(sql, cn)) { cmd.CommandTimeout = 300; cmd.ExecuteNonQuery(); }
        }

        public static object Scalar(MySqlConnection cn, string sql)
        {
            using (var cmd = new MySqlCommand(sql, cn)) return cmd.ExecuteScalar();
        }

        /// <summary>
        /// Last row of a log table as numbers (null when the table is empty). Use it at start-up to continue cumulative
        /// counters (energy, run hours, output) from where the log stopped.
        /// </summary>
        public static Dictionary<string, double> LastRow(MySqlConnection cn, string table)
        {
            using (var cmd = new MySqlCommand("SELECT * FROM `" + table + "` ORDER BY `DateTime` DESC LIMIT 1", cn))
            using (var rd = cmd.ExecuteReader())
            {
                if (!rd.Read()) return null;
                var d = new Dictionary<string, double>();
                for (int i = 0; i < rd.FieldCount; i++)
                {
                    if (rd.GetName(i) == "DateTime" || rd.IsDBNull(i)) continue;
                    double v;
                    if (double.TryParse(Convert.ToString(rd[i], Inv), NumberStyles.Float, Inv, out v)) d[rd.GetName(i)] = v;
                }
                return d;
            }
        }
    }
}
