using ChurchServe.Api.ServiceEvents;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Data;

public sealed class ChurchServeDbContext(
    DbContextOptions<ChurchServeDbContext> options) : DbContext(options)
{
    public DbSet<ServiceEventEntity> ServiceEvents => Set<ServiceEventEntity>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        var serviceEvent = modelBuilder.Entity<ServiceEventEntity>();
        serviceEvent.ToTable("ServiceEvents");
        serviceEvent.HasKey(item => item.Id);
        serviceEvent.Property(item => item.Id).HasMaxLength(64);
        serviceEvent.Property(item => item.Title).HasMaxLength(120).IsRequired();
        serviceEvent.Property(item => item.Location).HasMaxLength(120).IsRequired();
        serviceEvent.Property(item => item.StartsAt)
            .HasConversion(
                value => value.UtcTicks,
                value => new DateTimeOffset(value, TimeSpan.Zero))
            .IsRequired();
        serviceEvent.Property(item => item.EndsAt)
            .HasConversion(
                value => value.UtcTicks,
                value => new DateTimeOffset(value, TimeSpan.Zero))
            .IsRequired();
    }
}
