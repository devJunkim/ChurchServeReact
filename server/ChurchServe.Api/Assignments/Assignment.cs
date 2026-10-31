using ChurchServe.Api.Volunteers;

namespace ChurchServe.Api.Assignments;

public sealed class Assignment
{
    public required string Id { get; init; }
    public required string PositionId { get; init; }
    public required string VolunteerId { get; init; }
    public required string ClientRequestId { get; init; }
    public required string Status { get; init; }
    public MinistryPosition Position { get; init; } = null!;
    public Volunteer Volunteer { get; init; } = null!;
}
