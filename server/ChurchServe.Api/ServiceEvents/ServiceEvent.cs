namespace ChurchServe.Api.ServiceEvents;

public sealed record ServiceEvent(
    string Id,
    string Title,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt,
    string Location,
    int RequiredPositions,
    int AssignedPositions,
    int Version);
