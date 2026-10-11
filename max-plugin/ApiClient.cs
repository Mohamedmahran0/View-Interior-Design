using System;
using System.IO;
using System.Net.Http;
using System.Net.Http.Headers;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace ViewInteriorDesign.MaxPlugin
{
    public class UploadResult
    {
        public bool Success { get; set; }
        public string? ProjectId { get; set; }
        public string? ShareUrl { get; set; }
        public string? ErrorMessage { get; set; }
    }

    /// <summary>
    /// Multipart HTTP uploader to View Interior Design platform
    /// </summary>
    public static class ApiClient
    {
        public static async Task<UploadResult> UploadProjectAsync(
            string endpointUrl,
            string authToken,
            string glbFilePath,
            string projectName,
            string description,
            string category,
            bool isPublic,
            IProgress<int>? progress = null,
            CancellationToken cancellationToken = default)
        {
            try
            {
                if (!File.Exists(glbFilePath))
                {
                    return new UploadResult { Success = false, ErrorMessage = "GLB export file not found on disk." };
                }

                using var httpClient = new HttpClient();
                httpClient.Timeout = TimeSpan.FromMinutes(10);

                // Add Authorization if JWT token provided
                if (!string.IsNullOrWhiteSpace(authToken))
                {
                    httpClient.DefaultRequestHeaders.Authorization =
                        new AuthenticationHeaderValue("Bearer", authToken.Trim());
                }

                using var form = new MultipartFormDataContent();

                // 1. Project details
                form.Add(new StringContent(projectName), "name");
                form.Add(new StringContent(description), "description");
                form.Add(new StringContent(category), "category");
                form.Add(new StringContent(isPublic.ToString().ToLower()), "isPublic");

                // 2. Read GLB File content with progress reporting
                byte[] fileBytes = await File.ReadAllBytesAsync(glbFilePath, cancellationToken);
                progress?.Report(30);

                var fileContent = new ByteArrayContent(fileBytes);
                fileContent.Headers.ContentType = new MediaTypeHeaderValue("model/gltf-binary");
                form.Add(fileContent, "model", Path.GetFileName(glbFilePath));

                progress?.Report(50);

                // Clean endpoint URL
                string targetUrl = endpointUrl.Trim().TrimEnd('/');
                if (!targetUrl.EndsWith("/api/projects/upload", StringComparison.OrdinalIgnoreCase))
                {
                    targetUrl += "/api/projects/upload";
                }

                progress?.Report(70);

                // Send POST request
                HttpResponseMessage response = await httpClient.PostAsync(targetUrl, form, cancellationToken);
                progress?.Report(90);

                string responseBody = await response.Content.ReadAsStringAsync();

                if (!response.IsSuccessStatusCode)
                {
                    return new UploadResult
                    {
                        Success = false,
                        ErrorMessage = $"Server returned {response.StatusCode}: {responseBody}"
                    };
                }

                // Parse response JSON
                using var doc = JsonDocument.Parse(responseBody);
                var root = doc.RootElement;

                string? projectId = null;
                if (root.TryGetProperty("project", out var projElem) &&
                    projElem.TryGetProperty("id", out var idElem))
                {
                    projectId = idElem.GetString();
                }

                string baseDomain = new Uri(targetUrl).GetLeftPart(UriPartial.Authority);
                string shareUrl = !string.IsNullOrEmpty(projectId)
                    ? $"{baseDomain}/view/{projectId}"
                    : baseDomain;

                progress?.Report(100);

                return new UploadResult
                {
                    Success = true,
                    ProjectId = projectId,
                    ShareUrl = shareUrl
                };
            }
            catch (Exception ex)
            {
                return new UploadResult
                {
                    Success = false,
                    ErrorMessage = ex.Message
                };
            }
        }
    }
}
