namespace ChurchServe.Api.ServiceEvents;

public sealed class ServiceEventStore
{
    private readonly Lock _lock = new();
    private readonly List<ServiceEvent> _events =
    [
        new(
            "sunday-2026-11-01",
            "Sunday Morning Service",
            DateTimeOffset.Parse("2026-11-01T10:00:00-05:00"),
            DateTimeOffset.Parse("2026-11-01T11:30:00-05:00"),
            "Main Sanctuary",
            10,
            7),
        new(
            "rehearsal-2026-11-05",
            "Worship Team Rehearsal",
            DateTimeOffset.Parse("2026-11-05T19:00:00-05:00"),
            DateTimeOffset.Parse("2026-11-05T20:30:00-05:00"),
            "Music Room",
            6,
            6),
    ];

    public IReadOnlyList<ServiceEvent> List()
    {
        lock (_lock)
        {
            return _events.ToArray();
        }
    }

    public ServiceEvent? FindById(string eventId)
    {
        lock (_lock)
        {
            return _events.Find(serviceEvent => serviceEvent.Id == eventId);
        }
    }

    public ServiceEvent Create(CreateServiceEventRequest request)
    {
        var serviceEvent = new ServiceEvent(
            Guid.NewGuid().ToString(),
            request.Title!.Trim(),
            request.StartsAt!.Value,
            request.EndsAt!.Value,
            request.Location!.Trim(),
            0,
            0);

        lock (_lock)
        {
            _events.Add(serviceEvent);
        }

        return serviceEvent;
    }
}
