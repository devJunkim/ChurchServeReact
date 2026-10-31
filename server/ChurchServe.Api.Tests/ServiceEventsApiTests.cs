using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Xunit;

namespace ChurchServe.Api.Tests;

public sealed class ServiceEventsApiTests
{
    [Fact]
    public Task List_returns_seeded_events_in_start_order() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var events = await client.GetFromJsonAsync<ServiceEventResponse[]>(
                "/api/service-events",
                cancellationToken);

            Assert.NotNull(events);
            Assert.Collection(
                events,
                first => Assert.Equal("sunday-2026-11-01", first.Id),
                second => Assert.Equal("rehearsal-2026-11-05", second.Id));
            Assert.True(events[0].StartsAt < events[1].StartsAt);
        });

    [Fact]
    public Task Detail_distinguishes_an_existing_event_from_a_missing_event() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var existing = await client.GetAsync(
                "/api/service-events/sunday-2026-11-01",
                cancellationToken);
            var missing = await client.GetAsync(
                "/api/service-events/does-not-exist",
                cancellationToken);

            Assert.Equal(HttpStatusCode.OK, existing.StatusCode);
            Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);

            var serviceEvent =
                await existing.Content.ReadFromJsonAsync<ServiceEventResponse>(
                    cancellationToken);
            Assert.NotNull(serviceEvent);
            Assert.Equal("Sunday Morning Service", serviceEvent.Title);
        });

    [Fact]
    public Task Invalid_creation_returns_validation_problem_without_adding_data() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var response = await client.PostAsJsonAsync(
                "/api/service-events",
                new CreateServiceEventRequest(
                    " ",
                    new DateTimeOffset(2026, 11, 8, 12, 0, 0, TimeSpan.Zero),
                    new DateTimeOffset(2026, 11, 8, 11, 0, 0, TimeSpan.Zero),
                    null),
                cancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

            using var problem = JsonDocument.Parse(
                await response.Content.ReadAsStreamAsync(cancellationToken));
            var errors = problem.RootElement.GetProperty("errors");
            Assert.True(errors.TryGetProperty("title", out _));
            Assert.True(errors.TryGetProperty("location", out _));
            Assert.True(errors.TryGetProperty("timeRange", out _));

            var events = await client.GetFromJsonAsync<ServiceEventResponse[]>(
                "/api/service-events",
                cancellationToken);
            Assert.NotNull(events);
            Assert.Equal(2, events.Length);
        });

    [Fact]
    public async Task Created_event_remains_available_after_the_host_restarts()
    {
        var cancellationToken = TestContext.Current.CancellationToken;
        var databasePath = Path.Combine(
            Path.GetTempPath(),
            $"churchserve-api-tests-{Guid.NewGuid():N}.db");
        string createdId;

        try
        {
            using (var firstFactory = new ChurchServeApiFactory(databasePath))
            using (var firstClient = firstFactory.CreateClient())
            {
                var response = await firstClient.PostAsJsonAsync(
                    "/api/service-events",
                    new CreateServiceEventRequest(
                        "Prayer Night",
                        new DateTimeOffset(
                            2026, 11, 6, 19, 0, 0, TimeSpan.FromHours(-5)),
                        new DateTimeOffset(
                            2026, 11, 6, 20, 30, 0, TimeSpan.FromHours(-5)),
                        "Community Room"),
                    cancellationToken);

                Assert.Equal(HttpStatusCode.Created, response.StatusCode);
                var created =
                    await response.Content.ReadFromJsonAsync<ServiceEventResponse>(
                        cancellationToken);
                Assert.NotNull(created);
                createdId = created.Id;
                Assert.Equal(
                    new Uri($"/api/service-events/{createdId}", UriKind.Relative),
                    response.Headers.Location);
            }

            using (var restartedFactory = new ChurchServeApiFactory(databasePath))
            using (var restartedClient = restartedFactory.CreateClient())
            {
                var persisted =
                    await restartedClient.GetFromJsonAsync<ServiceEventResponse>(
                        $"/api/service-events/{createdId}",
                        cancellationToken);

                Assert.NotNull(persisted);
                Assert.Equal("Prayer Night", persisted.Title);
                Assert.Equal("Community Room", persisted.Location);
            }
        }
        finally
        {
            ChurchServeApiFactory.DeleteDatabaseFiles(databasePath);
        }
    }

    private static async Task WithApiAsync(Func<HttpClient, Task> assertion)
    {
        var factory = new ChurchServeApiFactory();

        try
        {
            using var client = factory.CreateClient();
            await assertion(client);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    private sealed record ServiceEventResponse(
        string Id,
        string Title,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt,
        string Location,
        int RequiredPositions,
        int AssignedPositions);

    private sealed record CreateServiceEventRequest(
        string? Title,
        DateTimeOffset? StartsAt,
        DateTimeOffset? EndsAt,
        string? Location);
}
