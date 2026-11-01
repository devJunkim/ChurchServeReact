namespace ChurchServe.Api.Authentication;

public sealed record SignInRequest(string? Email, string? Password);

public sealed record SessionUserResponse(
    string Id,
    string Email,
    string DisplayName,
    IReadOnlyList<string> Roles,
    IReadOnlyList<string> Permissions);
