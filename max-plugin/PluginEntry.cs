using System;
using System.Windows.Forms;

namespace ViewInteriorDesign.MaxPlugin
{
    /// <summary>
    /// Entry point for 3ds Max Global Utility Plugin (GUP) or external runner.
    /// Can be launched standalone or from 3ds Max menu bar / MAXScript:
    /// ViewInteriorDesign.MaxPlugin.PluginEntry.OpenExporterWindow();
    /// </summary>
    public static class PluginEntry
    {
        private static MaxPluginForm? _activeForm;

        [STAThread]
        public static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new MaxPluginForm());
        }

        public static void OpenExporterWindow()
        {
            if (_activeForm == null || _activeForm.IsDisposed)
            {
                _activeForm = new MaxPluginForm();
                _activeForm.Show();
            }
            else
            {
                _activeForm.BringToFront();
                _activeForm.Focus();
            }
        }
    }
}
