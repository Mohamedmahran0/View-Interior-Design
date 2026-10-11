using System;
using System.Drawing;
using System.IO;
using System.Diagnostics;
using System.Windows.Forms;

namespace ViewInteriorDesign.MaxPlugin
{
    public class MaxPluginForm : Form
    {
        private TextBox txtEndpoint;
        private TextBox txtToken;
        private TextBox txtProjectName;
        private TextBox txtDescription;
        private ComboBox cmbCategory;
        private CheckBox chkPublic;
        private Button btnExportUpload;
        private ProgressBar progressBar;
        private Label lblStatus;
        private Panel pnlResult;
        private TextBox txtShareUrl;
        private Button btnCopyUrl;
        private Button btnOpenBrowser;

        public MaxPluginForm()
        {
            InitializeComponent();
        }

        private void InitializeComponent()
        {
            this.Text = "View Interior Design - 3ds Max Exporter";
            this.Size = new Size(540, 620);
            this.FormBorderStyle = FormBorderStyle.FixedDialog;
            this.MaximizeBox = false;
            this.MinimizeBox = false;
            this.StartPosition = FormStartPosition.CenterScreen;
            this.BackColor = Color.FromArgb(18, 24, 38);
            this.ForeColor = Color.White;
            this.Font = new Font("Segoe UI", 9.5f, FontStyle.Regular);

            // Header Banner
            var lblTitle = new Label
            {
                Text = "VIEW INTERIOR DESIGN",
                Font = new Font("Segoe UI", 13f, FontStyle.Bold),
                ForeColor = Color.FromArgb(16, 185, 129),
                Location = new Point(24, 20),
                AutoSize = true
            };
            this.Controls.Add(lblTitle);

            var lblSubtitle = new Label
            {
                Text = "Export 3ds Max scene to photorealistic GLB & upload directly.",
                ForeColor = Color.FromArgb(156, 163, 175),
                Location = new Point(26, 48),
                AutoSize = true
            };
            this.Controls.Add(lblSubtitle);

            int y = 90;

            // 1. API Endpoint URL
            AddLabel("API Endpoint URL:", 24, y);
            y += 24;
            txtEndpoint = CreateTextBox("https://viewinteriordesign.com", 24, y, 476);
            this.Controls.Add(txtEndpoint);
            y += 38;

            // 2. Auth Token (Supabase JWT)
            AddLabel("Authentication Token (Supabase JWT):", 24, y);
            y += 24;
            txtToken = CreateTextBox("", 24, y, 476);
            txtToken.UseSystemPasswordChar = true;
            this.Controls.Add(txtToken);
            y += 38;

            // 3. Project Name
            AddLabel("Project Name:", 24, y);
            y += 24;
            txtProjectName = CreateTextBox("Modern Living Room", 24, y, 476);
            this.Controls.Add(txtProjectName);
            y += 38;

            // 4. Category
            AddLabel("Category:", 24, y);
            y += 24;
            cmbCategory = new ComboBox
            {
                Location = new Point(24, y),
                Size = new Size(476, 30),
                DropDownStyle = ComboBoxStyle.DropDownList,
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            cmbCategory.Items.AddRange(new object[] { "livingRoom", "bedroom", "kitchen", "bathroom", "office", "commercial" });
            cmbCategory.SelectedIndex = 0;
            this.Controls.Add(cmbCategory);
            y += 38;

            // 5. Visibility Checkbox
            chkPublic = new CheckBox
            {
                Text = "Make Project Public (Allow viewing via share link)",
                Checked = true,
                Location = new Point(24, y),
                Size = new Size(476, 26),
                ForeColor = Color.FromArgb(209, 213, 219)
            };
            this.Controls.Add(chkPublic);
            y += 40;

            // 6. Export & Upload Button
            btnExportUpload = new Button
            {
                Text = "🚀 Export & Upload to Cloud",
                Location = new Point(24, y),
                Size = new Size(476, 44),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat,
                Font = new Font("Segoe UI", 10.5f, FontStyle.Bold),
                Cursor = Cursors.Hand
            };
            btnExportUpload.FlatAppearance.BorderSize = 0;
            btnExportUpload.Click += BtnExportUpload_Click;
            this.Controls.Add(btnExportUpload);
            y += 54;

            // 7. Progress Bar
            progressBar = new ProgressBar
            {
                Location = new Point(24, y),
                Size = new Size(476, 12),
                Style = ProgressBarStyle.Continuous,
                Value = 0,
                Visible = false
            };
            this.Controls.Add(progressBar);
            y += 18;

            // 8. Status Label
            lblStatus = new Label
            {
                Text = "Ready to export.",
                ForeColor = Color.FromArgb(156, 163, 175),
                Location = new Point(24, y),
                Size = new Size(476, 24),
                TextAlign = ContentAlignment.MiddleLeft
            };
            this.Controls.Add(lblStatus);
            y += 30;

            // 9. Success Panel (Returned Share URL)
            pnlResult = new Panel
            {
                Location = new Point(24, y),
                Size = new Size(476, 80),
                BackColor = Color.FromArgb(6, 78, 59),
                BorderStyle = BorderStyle.FixedSingle,
                Visible = false
            };

            var lblSuccess = new Label
            {
                Text = "✔ Upload Complete! Your project is live:",
                ForeColor = Color.FromArgb(167, 243, 208),
                Font = new Font("Segoe UI", 8.5f, FontStyle.Bold),
                Location = new Point(10, 8),
                AutoSize = true
            };
            pnlResult.Controls.Add(lblSuccess);

            txtShareUrl = new TextBox
            {
                Location = new Point(10, 32),
                Size = new Size(310, 24),
                ReadOnly = true,
                BackColor = Color.FromArgb(4, 47, 46),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };
            pnlResult.Controls.Add(txtShareUrl);

            btnCopyUrl = new Button
            {
                Text = "Copy",
                Location = new Point(326, 30),
                Size = new Size(64, 28),
                BackColor = Color.FromArgb(16, 185, 129),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnCopyUrl.Click += (s, e) => { Clipboard.SetText(txtShareUrl.Text); MessageBox.Show("Link copied to clipboard!"); };
            pnlResult.Controls.Add(btnCopyUrl);

            btnOpenBrowser = new Button
            {
                Text = "Open",
                Location = new Point(396, 30),
                Size = new Size(68, 28),
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                FlatStyle = FlatStyle.Flat
            };
            btnOpenBrowser.Click += (s, e) => Process.Start(new ProcessStartInfo(txtShareUrl.Text) { UseShellExecute = true });
            pnlResult.Controls.Add(btnOpenBrowser);

            this.Controls.Add(pnlResult);
        }

        private void AddLabel(string text, int x, int y)
        {
            var lbl = new Label
            {
                Text = text,
                ForeColor = Color.FromArgb(209, 213, 219),
                Font = new Font("Segoe UI", 9f, FontStyle.Bold),
                Location = new Point(x, y),
                AutoSize = true
            };
            this.Controls.Add(lbl);
        }

        private TextBox CreateTextBox(string defaultVal, int x, int y, int width)
        {
            return new TextBox
            {
                Text = defaultVal,
                Location = new Point(x, y),
                Size = new Size(width, 28),
                BackColor = Color.FromArgb(30, 41, 59),
                ForeColor = Color.White,
                BorderStyle = BorderStyle.FixedSingle
            };
        }

        private async void BtnExportUpload_Click(object? sender, EventArgs e)
        {
            if (string.IsNullOrWhiteSpace(txtProjectName.Text))
            {
                MessageBox.Show("Please enter a project name.", "Validation Error", MessageBoxButtons.OK, MessageBoxIcon.Warning);
                return;
            }

            btnExportUpload.Enabled = false;
            progressBar.Visible = true;
            progressBar.Value = 10;
            pnlResult.Visible = false;

            string tempGlb = Path.Combine(Path.GetTempPath(), $"3dsmax_export_{Guid.NewGuid():N}.glb");

            try
            {
                lblStatus.Text = "Step 1/3: Exporting 3ds Max scene to GLB...";
                progressBar.Value = 25;

                bool exportSuccess = await GlbExporter.ExportSceneToGlbAsync(tempGlb);
                if (!exportSuccess)
                {
                    lblStatus.Text = "Export failed. Please check 3ds Max glTF exporter plugin.";
                    MessageBox.Show("Failed to export GLB file from 3ds Max.", "Export Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                    return;
                }

                lblStatus.Text = "Step 2/3: Uploading GLB model to Supabase storage...";
                progressBar.Value = 50;

                var progressHandler = new Progress<int>(percent =>
                {
                    progressBar.Value = Math.Min(percent, 100);
                });

                var uploadResult = await ApiClient.UploadProjectAsync(
                    txtEndpoint.Text,
                    txtToken.Text,
                    tempGlb,
                    txtProjectName.Text,
                    txtDescription?.Text ?? "",
                    cmbCategory.SelectedItem?.ToString() ?? "livingRoom",
                    chkPublic.Checked,
                    progressHandler
                );

                if (uploadResult.Success && !string.IsNullOrEmpty(uploadResult.ShareUrl))
                {
                    lblStatus.Text = "Step 3/3: Success! Model published to cloud.";
                    progressBar.Value = 100;
                    txtShareUrl.Text = uploadResult.ShareUrl;
                    pnlResult.Visible = true;
                }
                else
                {
                    lblStatus.Text = $"Upload failed: {uploadResult.ErrorMessage}";
                    MessageBox.Show(uploadResult.ErrorMessage ?? "Unknown error", "Upload Error", MessageBoxButtons.OK, MessageBoxIcon.Error);
                }
            }
            catch (Exception ex)
            {
                lblStatus.Text = $"Error: {ex.Message}";
                MessageBox.Show(ex.Message, "Exception", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
            finally
            {
                btnExportUpload.Enabled = true;
                if (File.Exists(tempGlb))
                {
                    try { File.Delete(tempGlb); } catch { }
                }
            }
        }
    }
}
