namespace ChurchServe.Api.Volunteers;

public sealed class Volunteer
{
    public required string Id { get; init; }
    public required string DisplayName { get; set; }
    public ICollection<VolunteerMinistry> EligibleMinistries { get; } = [];
}

public sealed class VolunteerMinistry
{
    public required string VolunteerId { get; init; }
    public required string Ministry { get; init; }
    public Volunteer Volunteer { get; init; } = null!;
}
