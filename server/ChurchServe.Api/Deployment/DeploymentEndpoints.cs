using System.Text.Json;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using Microsoft.Extensions.Options;

namespace ChurchServe.Api.Deployment;

public static class DeploymentEndpoints
{
    public static IEndpointRouteBuilder MapDeploymentEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        endpoints.MapGet("/runtime-config.json", (
            HttpContext context,
            IOptions<PublicRuntimeOptions> options) =>
        {
            context.Response.Headers.CacheControl = "no-store";
            return Results.Json(new PublicRuntimeResponse(
                NormalizeApiBaseUrl(options.Value.ApiBaseUrl),
                options.Value.Release.Trim()));
        }).AllowAnonymous();

        endpoints.MapHealthChecks("/health/live", new HealthCheckOptions
        {
            Predicate = _ => false,
            ResponseWriter = WriteHealthResponseAsync,
        }).AllowAnonymous();

        endpoints.MapHealthChecks("/health/ready", new HealthCheckOptions
        {
            Predicate = registration => registration.Tags.Contains("ready"),
            ResponseWriter = WriteHealthResponseAsync,
        }).AllowAnonymous();

        return endpoints;
    }

    private static Task WriteHealthResponseAsync(
        HttpContext context,
        HealthReport report)
    {
        context.Response.ContentType = "application/json";
        return context.Response.WriteAsync(JsonSerializer.Serialize(new
        {
            status = report.Status.ToString().ToLowerInvariant(),
        }));
    }

    private static string NormalizeApiBaseUrl(string value) =>
        value.Length > 1 ? value.TrimEnd('/') : value;

    private sealed record PublicRuntimeResponse(
        string ApiBaseUrl,
        string Release);
}
