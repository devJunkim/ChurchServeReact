using ChurchServe.Api.Authentication;
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
    private readonly string _role;

    public ChurchServeApiFactory(
        string? databasePath = null,
        string role = "scheduler")
    {
        _role = role;
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
            services.PostConfigure<LocalAccountOptions>(options =>
            {
                options.Id = "test-coordinator";
                options.Email = AuthenticationTestExtensions.Email;
                options.DisplayName = "Test Coordinator";
                options.Password = AuthenticationTestExtensions.Password;
                options.Role = _role;
            });
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
