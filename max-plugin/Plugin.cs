using System;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;

namespace ViewInteriorDesign.MaxPlugin
{
    /// <summary>
    /// Main entry point and User Interface for the View Interior Design 3ds Max Export Plugin.
    /// </summary>
    public class Plugin : Form
    {
        private TextBox txtEndpoint = null!;
        private TextBox txtToken = null!;
        private TextBox txtProjectName = null!;
        private Button btnExportUpload = null!;
        private ProgressBar progressBar = null!;
        private Label lblStatus = null!;

        public Plugin()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            Text = "View Interior Design - 3ds Max Exporter";
            Size = new Size(520, 360);
            FormBorderStyle = FormBorderStyle.FixedDialog;
            MaximizeBox = false;
            StartPosition = FormStartPosition.CenterScreen;
            BackColor = Color.FromArgb(24, 24, 27);
            ForeColor = Color.White;

            var titleLabel = new Label
            {
                Text = "Export to View Interior Design Web SaaS",
                Font = new Font("Segoe UI", 12, FontStyle.Bold),
                Location = new Point(20, 15),
                AutoSize = true,
                ForeColor = Color.FromArgb(52, 211, 153),
            };

            var lblEndpoint = new Label { Text = "API Endpoint URL:", Location = new Point(20, 55), AutoSize = true };
            txtEndpoint = new TextBox
            {
                Location = new Point(20, 75),
                Width = 460,
                Text = "https://www.viewinteriordesign.com",
                BackColor = Color.FromArgb(39, 39, 42),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle,
            };

            var lblToken = new Label { Text = "Supabase JWT Token:", Location = new Point(20, 110), AutoSize = true };
            txtToken = new TextBox
            {
                Location = new Point(20, 130),
                Width = 460,
                UseSystemPasswordChar = true,
                BackColor = Color.FromArgb(39, 39, 42),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle,
            };

            var lblProjectName = new Label { Text = "Project Name:", Location = new Point(20, 165), AutoSize = true };
            txtProjectName = new TextBox
            {
                Location = new Point(20, 185),
                Width = 460,
                Text = "Living Room Scene",
                BackColor = Color.FromArgb(39, 39, 42),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle,
            };

            progressBar = new ProgressBar
            {
                Location = new Point(20, 225),
                Width = 460,
                Height = 20,
            };

            lblStatus = new Label
            {
                Text = "Ready to export scene.",
                Location = new Point(20, 250),
                AutoSize = true,
                ForeColor = Color.DarkGray,
            };

            btnExportUpload = new Button
            {
                Text = "Export & Upload to Cloud",
                Font = new Font("Segoe UI", 10, FontStyle.Bold),
                Location = new Point(20, 275),
                Width = 460,
                Height = 35,
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.Black,
                FlatStyle = FlatStyle.Flat,
                Cursor = Cursors.Hand,
            };
            btnExportUpload.Click += BtnExportUpload_Click;

            Controls.Add(titleLabel);
            Controls.Add(lblEndpoint);
            Controls.Add(txtEndpoint);
            Controls.Add(lblToken);
            Controls.Add(txtToken);
            Controls.Add(lblProjectName);
            Controls.Add(txtProjectName);
            Controls.Add(progressBar);
            Controls.Add(lblStatus);
            Controls.Add(btnExportUpload);
        }

        private async void BtnExportUpload_Click(object? sender, EventArgs e)
        {
            btnExportUpload.Enabled = false;
            lblStatus.Text = "Exporting glTF 2.0 via Khronos backend...";
            progressBar.Value = 10;

            try
            {
                var progress = new Progress<int>(percent =>
                {
                    progressBar.Value = Math.Clamp(percent, 0, 100);
                });

                // 1. Export scene to GLB using Khronos Exporter
                var exportOptions = new GltfExportOptions
                {
                    ExportFormatGlb = true,
                    EnableDracoCompression = true,
                    ConvertMaterials = true,
                    ExportAnimations = false,
                };

                string tempGlb = await ExportService.ExportToGlbAsync(exportOptions, progress);
                lblStatus.Text = "Uploading GLB to View Interior Design...";

                // 2. Upload to platform
                var uploadResult = await UploadService.UploadGlbAsync(
                    txtEndpoint.Text,
                    txtToken.Text,
                    tempGlb,
                    txtProjectName.Text,
                    progress
                );

                if (uploadResult.Success && !string.IsNullOrEmpty(uploadResult.ViewerUrl))
                {
                    lblStatus.Text = "Upload complete! Opening viewer...";
                    progressBar.Value = 100;

                    DialogResult res = MessageBox.Show(
                        $"Scene uploaded successfully!\nShare URL: {uploadResult.ViewerUrl}\n\nDo you want to open it in your browser now?",
                        "Export Successful",
                        MessageBoxButtons.YesNo,
                        MessageBoxIcon.Information
                    );

                    if (res == DialogResult.Yes)
                    {
                        Process.Start(new ProcessStartInfo
                        {
                            FileName = uploadResult.ViewerUrl,
                            UseShellExecute = true,
                        });
                    }
                }
                else
                {
                    lblStatus.Text = "Error during upload.";
                    MessageBox.Show(uploadResult.ErrorMessage ?? "Unknown upload error.", "Upload Failed", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                lblStatus.Text = $"Error: {ex.Message}";
                MessageBox.Show(ex.Message, "Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnExportUpload.Enabled = true;
            }
        }

        [STAThread]
        public static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);
            Application.Run(new Plugin());
        }
    }
}
