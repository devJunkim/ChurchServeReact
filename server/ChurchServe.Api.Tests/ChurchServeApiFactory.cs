using ChurchServe.Api.Data;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;

namespace ChurchServe.Api.Tests;

public sealed class ChurchServeApiFactory : WebApplicationFactory<Program>
{
    public ChurchServeApiFactory(string? databasePath = null)
    {
        DatabasePath = databasePath ?? Path.Combine(
            Path.GetTempPath(),
            $"churchserve-api-tests-{Guid.NewGuid():N}.db");
    }

    public string DatabasePath { get; }

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureServices(services =>
        {
            services.RemoveAll<DbContextOptions<ChurchServeDbContext>>();
            services.RemoveAll<
                IDbContextOptionsConfiguration<ChurchServeDbContext>>();
            services.AddDbContext<ChurchServeDbContext>(options =>
                options.UseSqlite(
                    $"Data Source={DatabasePath};Pooling=False"));
        });
    }

    public void DeleteDatabaseFiles()
        => DeleteDatabaseFiles(DatabasePath);

    public static void DeleteDatabaseFiles(string databasePath)
    {
        DeleteIfPresent(databasePath);
        DeleteIfPresent($"{databasePath}-shm");
        DeleteIfPresent($"{databasePath}-wal");
    }

    private static void DeleteIfPresent(string path)
    {
        if (File.Exists(path))
        {
            File.Delete(path);
        }
    }
}
