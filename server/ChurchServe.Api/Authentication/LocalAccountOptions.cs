namespace ChurchServe.Api.Authentication;

public sealed class LocalAccountOptions
{
    public const string SectionName = "Authentication:LocalAccount";

    public string Id { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string DisplayName { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public string Role { get; set; } = string.Empty;
}
