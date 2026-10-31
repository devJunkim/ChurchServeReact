using System.Net;
using System.Net.Http.Json;
using Xunit;

namespace ChurchServe.Api.Tests;

public sealed class SessionEndpointsTests
{
    [Fact]
    public Task Anonymous_session_returns_unauthorized_and_issues_antiforgery_token() =>
        WithApiAsync(async client =>
        {
            var response = await client.GetAsync(
                "/api/session",
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
            Assert.NotEmpty(
                AuthenticationTestExtensions.ReadAntiforgeryToken(response));
        });

    [Fact]
    public Task Protected_schedule_rejects_an_anonymous_request() =>
        WithApiAsync(async client =>
        {
            var response = await client.GetAsync(
                "/api/service-events",
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        });

    [Fact]
    public Task Sign_in_rejects_a_missing_antiforgery_token() =>
        WithApiAsync(async client =>
        {
            var response = await client.PostAsJsonAsync(
                "/api/session/sign-in",
                new
                {
                    AuthenticationTestExtensions.Email,
                    AuthenticationTestExtensions.Password,
                },
                TestContext.Current.CancellationToken);

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        });

    [Fact]
    public Task Sign_in_rejects_invalid_credentials() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            var sessionResponse = await client.GetAsync(
                "/api/session",
                cancellationToken);
            AuthenticationTestExtensions.ApplyAntiforgeryToken(
                client,
                AuthenticationTestExtensions.ReadAntiforgeryToken(sessionResponse));

            var response = await client.PostAsJsonAsync(
                "/api/session/sign-in",
                new
                {
                    AuthenticationTestExtensions.Email,
                    Password = "incorrect-password",
                },
                cancellationToken);

            Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
        });

    [Fact]
    public Task Sign_in_restores_a_user_and_sign_out_invalidates_the_session() =>
        WithApiAsync(async client =>
        {
            var cancellationToken = TestContext.Current.CancellationToken;
            await client.SignInAsync(cancellationToken);

            var currentUser = await client.GetFromJsonAsync<SessionUserResponse>(
                "/api/session",
                cancellationToken);
            Assert.NotNull(currentUser);
            Assert.Equal("test-coordinator", currentUser.Id);
            Assert.Equal("Test Coordinator", currentUser.DisplayName);
            Assert.Contains("scheduler", currentUser.Roles);

            var protectedResponse = await client.GetAsync(
                "/api/service-events",
                cancellationToken);
            Assert.Equal(HttpStatusCode.OK, protectedResponse.StatusCode);

            var signOutResponse = await client.DeleteAsync(
                "/api/session",
                cancellationToken);
            Assert.Equal(HttpStatusCode.NoContent, signOutResponse.StatusCode);

            var afterSignOut = await client.GetAsync(
                "/api/service-events",
                cancellationToken);
            Assert.Equal(HttpStatusCode.Unauthorized, afterSignOut.StatusCode);
        });

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

    private sealed record SessionUserResponse(
        string Id,
        string Email,
        string DisplayName,
        IReadOnlyList<string> Roles);
}
