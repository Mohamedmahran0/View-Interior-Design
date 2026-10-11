using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ViewInteriorDesign.MaxPlugin
{
    public class UploadResponse
    {
        public bool Success { get; set; }
        public string? ProjectId { get; set; }
        public string? ShareToken { get; set; }
        public string? ViewerUrl { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Uploads exported GLB files to the View Interior Design platform or Supabase backend.
    /// </summary>
    public static class UploadService
    {
        public static async Task<UploadResponse> UploadGlbAsync(
            string apiEndpoint,
            string jwtToken,
            string glbFilePath,
            string projectName,
            IProgress<int>? progress = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (!File.Exists(glbFilePath))
                {
                    return new UploadResponse
                    {
                        Success = false,
                        ErrorMessage = $"GLB file not found: {glbFilePath}"
                    };
                }

                using var client = new HttpClient();
                client.Timeout = TimeSpan.FromMinutes(15);

                if (!string.IsNullOrWhiteSpace(jwtToken))
                {
                    client.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", jwtToken.Trim());
                }

                using var form = new MultipartFormDataContent();
                form.Add(new StringContent(projectName), "projectName");
                form.Add(new StringContent(projectName), "name");

                progress?.Report(75);

                byte[] fileBytes = await File.ReadAllBytesAsync(glbFilePath, cancellationToken);
                var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("model/gltf-binary");
                form.Add(fileContent, "file", Path.GetFileName(glbFilePath));
                form.Add(fileContent, "model", Path.GetFileName(glbFilePath));

                progress?.Report(85);

                string target = apiEndpoint.Trim().TrimEnd('/');
                if (!target.Contains("/api/"))
                {
                    target += "/api/projects/upload";
                }

                HttpResponseMessage response = await client.PostAsync(target, form, cancellationToken);
                progress?.Report(95);

                string responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return new UploadResponse
                    {
                        Success = false,
                        ErrorMessage = $"Upload failed (Status {response.StatusCode}): {responseBody}"
                    };
                }

                string? shareToken = null;
                string? projectId = null;
                string? viewerUrl = null;

                try
                {
                    using var doc = JsonDocument.Parse(responseBody);
                    var root = doc.RootElement;

                    if (root.TryGetProperty("project", out var proj))
                    {
                        if (proj.TryGetProperty("id", out var idProp)) projectId = idProp.GetString();
                        if (proj.TryGetProperty("share_token", out var stProp)) shareToken = stProp.GetString();
                    }
                    else if (root.TryGetProperty("id", out var directId))
                    {
                        projectId = directId.GetString();
                    }

                    if (root.TryGetProperty("shareUrl", out var shareUrlProp))
                    {
                        viewerUrl = shareUrlProp.GetString();
                    }
                }
                catch
                {
                    // Fallback
                }

                if (string.IsNullOrEmpty(viewerUrl) && !string.IsNullOrEmpty(projectId))
                {
                    string host = target.Substring(0, target.IndexOf("/api", StringComparison.OrdinalIgnoreCase));
                    viewerUrl = $"{host}/view/{projectId}";
                }

                progress?.Report(100);

                return new UploadResponse
                {
                    Success = true,
                    ProjectId = projectId,
                    ShareToken = shareToken,
                    ViewerUrl = viewerUrl,
                };
            }
            catch (Exception ex)
            {
                return new UploadResponse
                {
                    Success = false,
                    ErrorMessage = $"Upload exception: {ex.Message}"
                };
            }
        }
    }
}
