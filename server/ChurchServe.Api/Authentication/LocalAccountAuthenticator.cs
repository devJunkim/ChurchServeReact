using Microsoft.AspNetCore.Identity;
using Microsoft.Extensions.Options;

namespace ChurchServe.Api.Authentication;

public sealed class LocalAccountAuthenticator
{
    private readonly LocalAccount? _account;
    private readonly PasswordHasher<LocalAccount> _passwordHasher = new();

    public LocalAccountAuthenticator(
        IOptions<LocalAccountOptions> options,
        IHostEnvironment environment)
    {
        var configured = options.Value;
        if ((!environment.IsDevelopment() &&
             environment.EnvironmentName != "Testing") ||
            string.IsNullOrWhiteSpace(configured.Id) ||
            string.IsNullOrWhiteSpace(configured.Email) ||
            string.IsNullOrWhiteSpace(configured.DisplayName) ||
            string.IsNullOrWhiteSpace(configured.Password) ||
            string.IsNullOrWhiteSpace(configured.Role))
        {
            return;
        }

        var account = new LocalAccount(
            configured.Id.Trim(),
            configured.Email.Trim().ToLowerInvariant(),
            configured.DisplayName.Trim(),
            string.Empty,
            configured.Role.Trim());

        _account = account with
        {
            PasswordHash = _passwordHasher.HashPassword(
                account,
                configured.Password),
        };
    }

    public LocalAccount? Authenticate(string? email, string? password)
    {
        if (_account is null ||
            string.IsNullOrWhiteSpace(email) ||
            string.IsNullOrEmpty(password))
        {
            return null;
        }

        var passwordResult = _passwordHasher.VerifyHashedPassword(
            _account,
            _account.PasswordHash,
            password);
        var emailMatches = string.Equals(
            _account.Email,
            email.Trim(),
            StringComparison.OrdinalIgnoreCase);

        return emailMatches &&
               passwordResult != PasswordVerificationResult.Failed
            ? _account
            : null;
    }
}

public sealed record LocalAccount(
    string Id,
    string Email,
    string DisplayName,
    string PasswordHash,
    string Role);
