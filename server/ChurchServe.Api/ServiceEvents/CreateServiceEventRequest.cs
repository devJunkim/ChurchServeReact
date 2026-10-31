namespace ChurchServe.Api.ServiceEvents;

public sealed record CreateServiceEventRequest(
    string? Title,
    DateTimeOffset? StartsAt,
    DateTimeOffset? EndsAt,
    string? Location);
