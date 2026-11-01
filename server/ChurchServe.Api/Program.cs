using ChurchServe.Api.Assignments;
using ChurchServe.Api.Authentication;
using ChurchServe.Api.Data;
using ChurchServe.Api.ServiceEvents;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.EntityFrameworkCore;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
var connectionString = builder.Configuration.GetConnectionString("ChurchServe")
    ?? throw new InvalidOperationException(
        "Connection string 'ChurchServe' is required.");

builder.Services.AddDbContext<ChurchServeDbContext>(options =>
    options.UseSqlite(connectionString));
builder.Services.Configure<LocalAccountOptions>(
    builder.Configuration.GetSection(LocalAccountOptions.SectionName));
builder.Services.AddSingleton<LocalAccountAuthenticator>();
builder.Services
    .AddAuthentication(CookieAuthenticationDefaults.AuthenticationScheme)
    .AddCookie(options =>
    {
        options.Cookie.Name = "ChurchServe.Session";
        options.Cookie.HttpOnly = true;
        options.Cookie.IsEssential = true;
        options.Cookie.SameSite = SameSiteMode.Strict;
        options.Cookie.SecurePolicy =
            builder.Environment.IsDevelopment() ||
            builder.Environment.EnvironmentName == "Testing"
                ? CookieSecurePolicy.SameAsRequest
                : CookieSecurePolicy.Always;
        options.ExpireTimeSpan = TimeSpan.FromHours(8);
        options.SlidingExpiration = true;
        options.Events.OnRedirectToLogin = context =>
        {
            context.Response.Headers.Location = context.RedirectUri;
            context.Response.StatusCode = StatusCodes.Status401Unauthorized;
            return Task.CompletedTask;
        };
        options.Events.OnRedirectToAccessDenied = context =>
        {
            context.Response.Headers.Location = context.RedirectUri;
            context.Response.StatusCode = StatusCodes.Status403Forbidden;
            return Task.CompletedTask;
        };
    });
builder.Services.AddAuthorization(ChurchServePermissions.Configure);
builder.Services.AddAntiforgery(options =>
{
    options.HeaderName = "X-XSRF-TOKEN";
    options.Cookie.Name = "ChurchServe.Antiforgery";
    options.Cookie.HttpOnly = true;
    options.Cookie.IsEssential = true;
    options.Cookie.SameSite = SameSiteMode.Strict;
    options.Cookie.SecurePolicy =
        builder.Environment.IsDevelopment() ||
        builder.Environment.EnvironmentName == "Testing"
            ? CookieSecurePolicy.SameAsRequest
            : CookieSecurePolicy.Always;
});

var app = builder.Build();
await DatabaseInitializer.InitializeAsync(app.Services);
app.UseAuthentication();
app.UseAuthorization();
app.MapSessionEndpoints();

var serviceEvents = app.MapGroup("/api/service-events")
    .RequireAuthorization();

serviceEvents.MapAssignmentEndpoints();

serviceEvents.MapGet("", async (
    ChurchServeDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var entities = await dbContext.ServiceEvents
        .AsNoTracking()
        .OrderBy(item => item.StartsAt)
        .ThenBy(item => item.Id)
        .ToArrayAsync(cancellationToken);

    return Results.Ok(entities.Select(ToResponse).ToArray());
}).RequireAuthorization(ChurchServePermissions.ScheduleRead);

serviceEvents.MapGet("/{eventId}", async (
    string eventId,
    ChurchServeDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var serviceEvent = await dbContext.ServiceEvents
        .AsNoTracking()
        .SingleOrDefaultAsync(
            item => item.Id == eventId,
            cancellationToken);

    return serviceEvent is null
        ? Results.NotFound()
        : Results.Ok(ToResponse(serviceEvent));
}).RequireAuthorization(ChurchServePermissions.ScheduleRead);

serviceEvents.MapPost("", async (
    CreateServiceEventRequest request,
    ChurchServeDbContext dbContext,
    CancellationToken cancellationToken) =>
{
    var errors = ServiceEventValidator.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var serviceEvent = new ServiceEventEntity
    {
        Id = Guid.NewGuid().ToString(),
        Title = request.Title!.Trim(),
        StartsAt = request.StartsAt!.Value,
        EndsAt = request.EndsAt!.Value,
        Location = request.Location!.Trim(),
        RequiredPositions = 0,
        AssignedPositions = 0,
    };

    dbContext.ServiceEvents.Add(serviceEvent);
    await dbContext.SaveChangesAsync(cancellationToken);

    return Results.Created(
        $"/api/service-events/{Uri.EscapeDataString(serviceEvent.Id)}",
        ToResponse(serviceEvent));
})
.ValidateAntiforgery()
.RequireAuthorization(ChurchServePermissions.ScheduleManage);

app.Run();

static ServiceEvent ToResponse(ServiceEventEntity serviceEvent) =>
    new(
        serviceEvent.Id,
        serviceEvent.Title,
        serviceEvent.StartsAt,
        serviceEvent.EndsAt,
        serviceEvent.Location,
        serviceEvent.RequiredPositions,
        serviceEvent.AssignedPositions,
        serviceEvent.Version);

public partial class Program;
