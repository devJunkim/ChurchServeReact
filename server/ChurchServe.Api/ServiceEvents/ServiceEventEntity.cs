namespace ChurchServe.Api.ServiceEvents;

public sealed class ServiceEventEntity
{
    public required string Id { get; init; }
    public required string Title { get; set; }
    public DateTimeOffset StartsAt { get; set; }
    public DateTimeOffset EndsAt { get; set; }
    public required string Location { get; set; }
    public int RequiredPositions { get; set; }
    public int AssignedPositions { get; set; }
    public int Version { get; set; } = 1;
}
