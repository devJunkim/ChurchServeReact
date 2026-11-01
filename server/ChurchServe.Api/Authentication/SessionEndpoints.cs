using System.Security.Claims;
using Microsoft.AspNetCore.Antiforgery;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;

namespace ChurchServe.Api.Authentication;

public static class SessionEndpoints
{
    public static IEndpointRouteBuilder MapSessionEndpoints(
        this IEndpointRouteBuilder endpoints)
    {
        var group = endpoints.MapGroup("/api/session");

        group.MapGet("", GetSession);
        group.MapPost("/sign-in", SignInAsync)
            .ValidateAntiforgery();
        group.MapDelete("", SignOutAsync)
            .RequireAuthorization()
            .ValidateAntiforgery();

        return endpoints;
    }

    private static IResult GetSession(
        HttpContext context,
        IAntiforgery antiforgery)
    {
        IssueAntiforgeryToken(context, antiforgery);

        return context.User.Identity?.IsAuthenticated == true
            ? Results.Ok(ToResponse(context.User))
            : Results.Unauthorized();
    }

    private static async Task<IResult> SignInAsync(
        SignInRequest request,
        HttpContext context,
        LocalAccountAuthenticator authenticator,
        IAntiforgery antiforgery)
    {
        var account = authenticator.Authenticate(request.Email, request.Password);
        if (account is null)
        {
            return Results.Unauthorized();
        }

        var claims = new List<Claim>
        {
            new Claim(ClaimTypes.NameIdentifier, account.Id),
            new Claim(ClaimTypes.Name, account.DisplayName),
            new Claim(ClaimTypes.Email, account.Email),
            new Claim(ClaimTypes.Role, account.Role),
        };
        claims.AddRange(ChurchServePermissions.ForRole(account.Role)
            .Select(permission => new Claim(
                ChurchServePermissions.ClaimType,
                permission)));
        var principal = new ClaimsPrincipal(
            new ClaimsIdentity(
                claims,
                CookieAuthenticationDefaults.AuthenticationScheme));

        await context.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            principal,
            new AuthenticationProperties { IsPersistent = false });
        context.User = principal;
        IssueAntiforgeryToken(context, antiforgery);

        return Results.Ok(ToResponse(principal));
    }

    private static async Task<IResult> SignOutAsync(
        HttpContext context,
        IAntiforgery antiforgery)
    {
        await context.SignOutAsync(
            CookieAuthenticationDefaults.AuthenticationScheme);
        context.User = new ClaimsPrincipal(new ClaimsIdentity());
        IssueAntiforgeryToken(context, antiforgery);

        return Results.NoContent();
    }

    private static void IssueAntiforgeryToken(
        HttpContext context,
        IAntiforgery antiforgery)
    {
        var tokens = antiforgery.GetAndStoreTokens(context);
        context.Response.Cookies.Append(
            "XSRF-TOKEN",
            tokens.RequestToken!,
            new CookieOptions
            {
                HttpOnly = false,
                IsEssential = true,
                SameSite = SameSiteMode.Strict,
                Secure = context.Request.IsHttps,
                Path = "/",
            });
    }

    private static SessionUserResponse ToResponse(ClaimsPrincipal principal) =>
        new(
            principal.FindFirstValue(ClaimTypes.NameIdentifier)!,
            principal.FindFirstValue(ClaimTypes.Email)!,
            principal.FindFirstValue(ClaimTypes.Name)!,
            principal.FindAll(ClaimTypes.Role)
                .Select(claim => claim.Value)
                .ToArray(),
            principal.FindAll(ChurchServePermissions.ClaimType)
                .Select(claim => claim.Value)
                .Distinct(StringComparer.Ordinal)
                .Order()
                .ToArray());
}
