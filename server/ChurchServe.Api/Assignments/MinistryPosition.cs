using ChurchServe.Api.ServiceEvents;

namespace ChurchServe.Api.Assignments;

public sealed class MinistryPosition
{
    public required string Id { get; init; }
    public required string ServiceEventId { get; init; }
    public required string Ministry { get; init; }
    public required string RoleName { get; init; }
    public DateTimeOffset StartsAt { get; init; }
    public DateTimeOffset EndsAt { get; init; }
    public ServiceEventEntity ServiceEvent { get; init; } = null!;
    public ICollection<Assignment> Assignments { get; } = [];
}
