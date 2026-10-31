using ChurchServe.Api.ServiceEvents;

var builder = WebApplication.CreateBuilder(args);

builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = System.Text.Json.JsonNamingPolicy.CamelCase;
});
builder.Services.AddSingleton<ServiceEventStore>();

var app = builder.Build();

var serviceEvents = app.MapGroup("/api/service-events");

serviceEvents.MapGet("", (ServiceEventStore store) => Results.Ok(store.List()));

serviceEvents.MapGet("/{eventId}", (string eventId, ServiceEventStore store) =>
    store.FindById(eventId) is { } serviceEvent
        ? Results.Ok(serviceEvent)
        : Results.NotFound());

serviceEvents.MapPost("", (
    CreateServiceEventRequest request,
    ServiceEventStore store) =>
{
    var errors = ServiceEventValidator.Validate(request);
    if (errors.Count > 0)
    {
        return Results.ValidationProblem(errors);
    }

    var created = store.Create(request);
    return Results.Created($"/api/service-events/{created.Id}", created);
});

app.Run();
