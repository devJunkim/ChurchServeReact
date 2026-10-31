using ChurchServe.Api.Data;
using ChurchServe.Api.ServiceEvents;
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

var app = builder.Build();
await DatabaseInitializer.InitializeAsync(app.Services);

var serviceEvents = app.MapGroup("/api/service-events");

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
});

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
});

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
});

app.Run();

static ServiceEvent ToResponse(ServiceEventEntity serviceEvent) =>
    new(
        serviceEvent.Id,
        serviceEvent.Title,
        serviceEvent.StartsAt,
        serviceEvent.EndsAt,
        serviceEvent.Location,
        serviceEvent.RequiredPositions,
        serviceEvent.AssignedPositions);

public partial class Program;
