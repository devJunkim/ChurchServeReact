using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ChurchServe.Api.Tests;

public sealed class AssignmentEndpointsTests
{
    [Fact]
    public async Task Reader_can_view_the_board_but_cannot_assign_a_volunteer()
    {
        var factory = new ChurchServeApiFactory(role: "reader");
        try
        {
            using var client = factory.CreateClient();
            var cancellationToken = TestContext.Current.CancellationToken;
            await client.SignInAsync(cancellationToken);

            var boardResponse = await client.GetAsync(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                cancellationToken);
            var assignResponse = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                WelcomeRequest(),
                cancellationToken);

            Assert.Equal(HttpStatusCode.OK, boardResponse.StatusCode);
            Assert.Equal(HttpStatusCode.Forbidden, assignResponse.StatusCode);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    [Fact]
    public async Task Unknown_role_cannot_read_the_assignment_board()
    {
        var factory = new ChurchServeApiFactory(role: "unsupported");
        try
        {
            using var client = factory.CreateClient();
            var cancellationToken = TestContext.Current.CancellationToken;
            await client.SignInAsync(cancellationToken);

            var response = await client.GetAsync(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                cancellationToken);

            Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    [Fact]
    public Task Board_returns_positions_eligible_volunteers_and_version() =>
        WithApiAsync(async client =>
        {
            var board = await client.GetFromJsonAsync<AssignmentBoardResponse>(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                TestContext.Current.CancellationToken);

            Assert.NotNull(board);
            Assert.Equal(1, board.EventVersion);
            Assert.Equal(7, board.AssignedPositions);
            Assert.Equal(2, board.Positions.Count);
            Assert.Contains(
                board.Positions,
                item => item.Id == "sunday-welcome-host");
            Assert.Contains(
                board.Volunteers,
                item => item.Id == "alex-morgan");
            Assert.Empty(board.Assignments);
        });

    [Fact]
    public async Task Board_rejects_anonymous_requests()
    {
        var factory = new ChurchServeApiFactory();
        try
        {
            using var client = factory.CreateClient();
            var response = await client.GetAsync(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                TestContext.Current.CancellationToken);
            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    [Fact]
    public Task Assign_persists_and_returns_the_next_version() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var response = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                WelcomeRequest(),
                cancellationToken);
            var result = await response.Content
                .ReadFromJsonAsync<AssignVolunteerResponse>(cancellationToken);
            var board = await client.GetFromJsonAsync<AssignmentBoardResponse>(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                cancellationToken);

            Assert.Equal(HttpStatusCode.Created, response.StatusCode);
            Assert.NotNull(result);
            Assert.Equal(2, result.EventVersion);
            Assert.Equal(8, result.AssignedPositions);
            Assert.Equal("anna-brooks", result.Assignment.VolunteerId);
            Assert.NotNull(board);
            Assert.Equal(2, board.EventVersion);
            Assert.Single(board.Assignments);
        });

    [Fact]
    public Task Assign_is_idempotent_for_the_same_client_request() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var request = WelcomeRequest();
            var first = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                request,
                cancellationToken);
            var second = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                request,
                cancellationToken);
            var board = await client.GetFromJsonAsync<AssignmentBoardResponse>(
                "/api/service-events/sunday-2026-11-01/assignment-board",
                cancellationToken);

            Assert.Equal(HttpStatusCode.Created, first.StatusCode);
            Assert.Equal(HttpStatusCode.OK, second.StatusCode);
            Assert.NotNull(board);
            Assert.Single(board.Assignments);
            Assert.Equal(2, board.EventVersion);
        });

    [Fact]
    public Task Assign_returns_the_authoritative_board_for_a_stale_version() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                WelcomeRequest(),
                cancellationToken);

            var response = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                new AssignVolunteerRequest(
                    "sunday-worship-vocal",
                    "alex-morgan",
                    1,
                    "request-2"),
                cancellationToken);
            var conflict = await response.Content
                .ReadFromJsonAsync<AssignmentConflictResponse>(cancellationToken);

            Assert.Equal(HttpStatusCode.Conflict, response.StatusCode);
            Assert.NotNull(conflict);
            Assert.Equal(2, conflict.Board.EventVersion);
            Assert.Single(conflict.Board.Assignments);
        });

    [Fact]
    public Task Assign_rejects_an_ineligible_volunteer() =>
        WithApiAsync(async client =>
        {
            var response = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                new AssignVolunteerRequest(
                    "sunday-welcome-host",
                    "alex-morgan",
                    1,
                    "request-ineligible"),
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        });

    [Fact]
    public Task Assign_rejects_a_missing_antiforgery_token() =>
        WithApiAsync(async client =>
        {
            client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
            var response = await client.PostAsJsonAsync(
                "/api/service-events/sunday-2026-11-01/assignments",
                WelcomeRequest(),
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        });

    private static AssignVolunteerRequest WelcomeRequest() => new(
        "sunday-welcome-host",
        "anna-brooks",
        1,
        "request-1");

    private static async Task WithApiAsync(Func<HttpClient, Task> assertion)
    {
        var factory = new ChurchServeApiFactory();
        try
        {
            using var client = factory.CreateClient();
            await client.SignInAsync(TestContext.Current.CancellationToken);
            await assertion(client);
        }
        finally
        {
            factory.Dispose();
            factory.DeleteDatabaseFiles();
        }
    }

    private sealed record AssignVolunteerRequest(
        string? PositionId,
        string? VolunteerId,
        int ExpectedEventVersion,
        string? ClientRequestId);

    private sealed record AssignmentResponse(
        string Id,
        string PositionId,
        string VolunteerId,
        string VolunteerDisplayName,
        string Status);

    private sealed record AssignVolunteerResponse(
        AssignmentResponse Assignment,
        int EventVersion,
        int AssignedPositions);

    private sealed record AssignmentConflictResponse(
        string Message,
        AssignmentBoardResponse Board);

    private sealed record AssignmentBoardResponse(
        string EventId,
        int EventVersion,
        int AssignedPositions,
        IReadOnlyList<MinistryPositionResponse> Positions,
        IReadOnlyList<VolunteerResponse> Volunteers,
        IReadOnlyList<AssignmentResponse> Assignments);

    private sealed record MinistryPositionResponse(
        string Id,
        string EventId,
        string Ministry,
        string RoleName,
        DateTimeOffset StartsAt,
        DateTimeOffset EndsAt);

    private sealed record VolunteerResponse(
        string Id,
        string DisplayName,
        IReadOnlyList<string> EligibleMinistries);
}
