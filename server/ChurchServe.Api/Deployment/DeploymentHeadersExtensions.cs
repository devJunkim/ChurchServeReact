using System.Text.RegularExpressions;

namespace ChurchServe.Api.Deployment;

public static partial class DeploymentHeadersExtensions
{
    public static IApplicationBuilder UseDeploymentHeaders(
        this IApplicationBuilder app) =>
        app.Use(async (context, next) =>
        {
            context.Response.OnStarting(() =>
            {
                var headers = context.Response.Headers;
                headers.XContentTypeOptions = "nosniff";
                headers.XFrameOptions = "DENY";
                headers["Referrer-Policy"] = "no-referrer";
                headers["Permissions-Policy"] =
                    "camera=(), geolocation=(), microphone=()";
                headers.ContentSecurityPolicy =
                    "default-src 'self'; script-src 'self'; " +
                    "style-src 'self'; img-src 'self' data:; " +
                    "font-src 'self'; connect-src 'self'; " +
                    "frame-ancestors 'none'; form-action 'self'; " +
                    "object-src 'none'; base-uri 'self'";

                if (context.Response.StatusCode == StatusCodes.Status200OK &&
                    context.Response.ContentType?.StartsWith(
                        "text/html",
                        StringComparison.OrdinalIgnoreCase) == true)
                {
                    headers.CacheControl = "no-cache";
                }
                else if (
                    context.Response.StatusCode == StatusCodes.Status200OK &&
                    HasFingerprint().IsMatch(
                        context.Request.Path.Value ?? string.Empty))
                {
                    headers.CacheControl =
                        "public,max-age=31536000,immutable";
                }

                return Task.CompletedTask;
            });

            await next();
        });

    [GeneratedRegex(
        @"[-.][A-Za-z0-9_-]{8,}\.(?:css|js)$",
        RegexOptions.IgnoreCase)]
    private static partial Regex HasFingerprint();
}
