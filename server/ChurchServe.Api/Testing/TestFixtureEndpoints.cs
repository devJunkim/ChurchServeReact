using ChurchServe.Api.Data;

namespace ChurchServe.Api.Testing;

public static class TestFixtureEndpoints
{
    public static RouteHandlerBuilder MapTestFixtureEndpoints(
        this IEndpointRouteBuilder endpoints) =>
        endpoints.MapPost("/api/test/reset", async (
            ChurchServeDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            await DatabaseInitializer.ResetAsync(
                dbContext,
                cancellationToken);
            return Results.NoContent();
        });
}
