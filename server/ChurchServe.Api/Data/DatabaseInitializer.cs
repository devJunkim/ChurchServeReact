using ChurchServe.Api.Assignments;
using ChurchServe.Api.ServiceEvents;
using ChurchServe.Api.Volunteers;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>();

        await dbContext.Database.MigrateAsync();

        if (!await dbContext.ServiceEvents.AnyAsync())
        {
            dbContext.ServiceEvents.AddRange(
                new ServiceEventEntity
                {
                    Id = "sunday-2026-11-01",
                    Title = "Sunday Morning Service",
                    StartsAt = DateTimeOffset.Parse("2026-11-01T10:00:00-05:00"),
                    EndsAt = DateTimeOffset.Parse("2026-11-01T11:30:00-05:00"),
                    Location = "Main Sanctuary",
                    RequiredPositions = 10,
                    AssignedPositions = 7,
                    Version = 1,
                },
                new ServiceEventEntity
                {
                    Id = "rehearsal-2026-11-05",
                    Title = "Worship Team Rehearsal",
                    StartsAt = DateTimeOffset.Parse("2026-11-05T19:00:00-05:00"),
                    EndsAt = DateTimeOffset.Parse("2026-11-05T20:30:00-05:00"),
                    Location = "Music Room",
                    RequiredPositions = 6,
                    AssignedPositions = 4,
                    Version = 1,
                });
        }

        if (!await dbContext.Volunteers.AnyAsync())
        {
            dbContext.Volunteers.AddRange(
                CreateVolunteer("alex-morgan", "Alex Morgan", "technical", "worship"),
                CreateVolunteer("anna-brooks", "Anna Brooks", "children", "welcome"),
                CreateVolunteer("annette-lee", "Annette Lee", "prayer", "welcome"),
                CreateVolunteer("jordan-kim", "Jordan Kim", "hospitality", "welcome"),
                CreateVolunteer("maria-santos", "Maria Santos", "children", "worship"),
                CreateVolunteer("sam-wilson", "Sam Wilson", "hospitality", "technical"));
        }

        if (!await dbContext.MinistryPositions.AnyAsync())
        {
            dbContext.MinistryPositions.AddRange(
                CreatePosition(
                    "sunday-welcome-host",
                    "sunday-2026-11-01",
                    "welcome",
                    "Welcome host",
                    "2026-11-01T09:30:00-05:00",
                    "2026-11-01T11:30:00-05:00"),
                CreatePosition(
                    "sunday-worship-vocal",
                    "sunday-2026-11-01",
                    "worship",
                    "Vocalist",
                    "2026-11-01T09:00:00-05:00",
                    "2026-11-01T11:30:00-05:00"),
                CreatePosition(
                    "rehearsal-sound",
                    "rehearsal-2026-11-05",
                    "technical",
                    "Sound operator",
                    "2026-11-05T18:45:00-05:00",
                    "2026-11-05T20:30:00-05:00"),
                CreatePosition(
                    "rehearsal-keys",
                    "rehearsal-2026-11-05",
                    "worship",
                    "Keys player",
                    "2026-11-05T18:45:00-05:00",
                    "2026-11-05T20:30:00-05:00"));
        }

        await dbContext.SaveChangesAsync();
    }

    private static Volunteer CreateVolunteer(
        string id,
        string displayName,
        params string[] ministries)
    {
        var volunteer = new Volunteer { Id = id, DisplayName = displayName };
        foreach (var ministry in ministries)
        {
            volunteer.EligibleMinistries.Add(new VolunteerMinistry
            {
                VolunteerId = id,
                Ministry = ministry,
            });
        }

        return volunteer;
    }

    private static MinistryPosition CreatePosition(
        string id,
        string serviceEventId,
        string ministry,
        string roleName,
        string startsAt,
        string endsAt) => new()
        {
            Id = id,
            ServiceEventId = serviceEventId,
            Ministry = ministry,
            RoleName = roleName,
            StartsAt = DateTimeOffset.Parse(startsAt),
            EndsAt = DateTimeOffset.Parse(endsAt),
        };
}
