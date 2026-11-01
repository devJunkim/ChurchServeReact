namespace ChurchServe.Api.Deployment;

public sealed class PublicRuntimeOptions
{
    public const string SectionName = "PublicRuntime";

    public string ApiBaseUrl { get; init; } = "/api";

    public string Release { get; init; } = "local";

    public static bool HasValidApiBaseUrl(PublicRuntimeOptions options) =>
        !string.IsNullOrWhiteSpace(options.ApiBaseUrl) &&
        options.ApiBaseUrl.StartsWith('/') &&
        !options.ApiBaseUrl.StartsWith("//", StringComparison.Ordinal) &&
        options.ApiBaseUrl == options.ApiBaseUrl.Trim() &&
        !options.ApiBaseUrl.Contains('\\') &&
        !options.ApiBaseUrl.Contains('?') &&
        !options.ApiBaseUrl.Contains('#');

    public static bool HasValidRelease(PublicRuntimeOptions options) =>
        !string.IsNullOrWhiteSpace(options.Release) &&
        options.Release.Length <= 100;
}
