using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ChurchServe.Api.Tests;

public sealed class TestFixtureEndpointsTests
{
    [Fact]
    public async Task Reset_restores_seed_data_in_the_testing_environment()
    {
        var factory = new ChurchServeApiFactory();
        try
        {
            using var client = factory.CreateClient();
            var cancellationToken = TestContext.Current.CancellationToken;
            await client.SignInAsync(cancellationToken);

            var created = await client.PostAsJsonAsync(
                "/api/service-events",
                new CreateServiceEventRequest(
                    "Temporary event",
                    DateTimeOffset.Parse("2026-11-20T10:00:00-05:00"),
                    DateTimeOffset.Parse("2026-11-20T11:00:00-05:00"),
                    "Test room"),
                cancellationToken);
            created.EnsureSuccessStatusCode();

            var reset = await client.PostAsync(
                "/api/test/reset",
                content: null,
                cancellationToken);
            var schedule = await client.GetFromJsonAsync<ServiceEventResponse[]>(
                "/api/service-events",
                cancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, reset.StatusCode);
            Assert.NotNull(schedule);
            Assert.Equal(2, schedule.Length);
            Assert.DoesNotContain(
                schedule,
                item => item.Title == "Temporary event");
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    [Fact]
    public async Task Reset_does_not_require_a_session_in_testing()
    {
        var factory = new ChurchServeApiFactory();
        try
        {
            using var client = factory.CreateClient();

            var response = await client.PostAsync(
                "/api/test/reset",
                content: null,
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NoContent, response.StatusCode);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    [Fact]
    public async Task Reset_route_is_not_mapped_outside_testing()
    {
        var factory = new ChurchServeApiFactory(environment: "Production");
        try
        {
            using var client = factory.CreateClient();

            var response = await client.PostAsync(
                "/api/test/reset",
                content: null,
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.NotFound, response.StatusCode);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    private sealed record CreateServiceEventRequest(
        string? Title,
        DateTimeOffset? StartsAt,
        DateTimeOffset? EndsAt,
        string? Location);

    private sealed record ServiceEventResponse(
        string Id,
        string Title,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string Location,
        int RequiredPositions,
        int AssignedPositions,
        long Version);
}
