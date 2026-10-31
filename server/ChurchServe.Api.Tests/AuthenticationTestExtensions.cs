using System.Net.Http.Json;

namespace ChurchServe.Api.Tests;

public static class AuthenticationTestExtensions
{
    public const string Email = "coordinator@test.churchserve.local";
    public const string Password = "Part13-Test-Password";

    public static async Task SignInAsync(
        this HttpClient client,
        CancellationToken cancellationToken)
    {
        var sessionResponse = await client.GetAsync(
            "/api/session",
            cancellationToken);
        ApplyAntiforgeryToken(client, ReadAntiforgeryToken(sessionResponse));

        var signInResponse = await client.PostAsJsonAsync(
            "/api/session/sign-in",
            new { Email, Password },
            cancellationToken);
        signInResponse.EnsureSuccessStatusCode();
        ApplyAntiforgeryToken(client, ReadAntiforgeryToken(signInResponse));
    }

    public static string ReadAntiforgeryToken(HttpResponseMessage response)
    {
        var cookie = response.Headers.GetValues("Set-Cookie")
            .Single(value => value.StartsWith(
                "XSRF-TOKEN=",
                StringComparison.Ordinal));
        var pair = cookie.Split(';', 2)[0];
        var encodedToken = pair["XSRF-TOKEN=".Length..];
        return Uri.UnescapeDataString(encodedToken);
    }

    public static void ApplyAntiforgeryToken(
        HttpClient client,
        string token)
    {
        client.DefaultRequestHeaders.Remove("X-XSRF-TOKEN");
        client.DefaultRequestHeaders.Add("X-XSRF-TOKEN", token);
    }
}
