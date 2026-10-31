using ChurchServe.Api.ServiceEvents;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public static class DatabaseInitializer
{
    public static async Task InitializeAsync(IServiceProvider services)
    {
        await using var scope = services.CreateAsyncScope();
        var dbContext = scope.ServiceProvider.GetRequiredService<ChurchServeDbContext>();

        await dbContext.Database.MigrateAsync();

        if (await dbContext.ServiceEvents.AnyAsync())
        {
            return;
        }

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
            },
            new ServiceEventEntity
            {
                Id = "rehearsal-2026-11-05",
                Title = "Worship Team Rehearsal",
                StartsAt = DateTimeOffset.Parse("2026-11-05T19:00:00-05:00"),
                EndsAt = DateTimeOffset.Parse("2026-11-05T20:30:00-05:00"),
                Location = "Music Room",
                RequiredPositions = 6,
                AssignedPositions = 6,
            });

        await dbContext.SaveChangesAsync();
    }
}
