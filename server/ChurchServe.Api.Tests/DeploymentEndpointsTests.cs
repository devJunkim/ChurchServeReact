using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ChurchServe.Api.Tests;

public sealed class DeploymentEndpointsTests
{
    [Fact]
    public Task Runtime_configuration_is_public_same_origin_and_not_cached() =>
        WithApiAsync(async client =>
        {
            var response = await client.GetAsync(
                "/runtime-config.json",
                TestContext.Current.CancellationToken);
            var configuration = await response.Content
                .ReadFromJsonAsync<RuntimeConfigResponse>(
                    TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.NotNull(configuration);
            Assert.Equal("/api", configuration.ApiBaseUrl);
            Assert.Equal("local", configuration.Release);
            Assert.Contains(
                "no-store",
                response.Headers.CacheControl?.ToString());
            Assert.Equal(
                "nosniff",
                response.Headers.GetValues("X-Content-Type-Options").Single());
            Assert.Equal(
                "DENY",
                response.Headers.GetValues("X-Frame-Options").Single());
        });

    [Theory]
    [InlineData("/health/live")]
    [InlineData("/health/ready")]
    public Task Health_endpoints_report_healthy(string path) =>
        WithApiAsync(async client =>
        {
            var response = await client.GetAsync(
                path,
                TestContext.Current.CancellationToken);
            var health = await response.Content
                .ReadFromJsonAsync<HealthResponse>(
                    TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.OK, response.StatusCode);
            Assert.Equal("healthy", health?.Status);
        });

    [Fact]
    public Task Unknown_api_routes_are_not_rewritten_to_the_application_shell() =>
        WithApiAsync(async client =>
        {
            var response = await client.GetAsync(
                "/api/not-a-real-route",
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
            Assert.NotEqual(
                "text/html",
                response.Content.Headers.ContentType?.MediaType);
        });

    private static async Task WithApiAsync(Func<HttpClient, Task> test)
    {
        var factory = new ChurchServeApiFactory();
        try
        {
            using var client = factory.CreateClient();
            await test(client);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    private sealed record RuntimeConfigResponse(
        string ApiBaseUrl,
        string Release);

    private sealed record HealthResponse(string Status);
}
