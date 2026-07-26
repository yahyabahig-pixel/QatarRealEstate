
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Internal;
using RealEstate.Domain.Entities;

public sealed class RealEstateDbContext : DbContext
{
    public RealEstateDbContext(DbContextOptions<RealEstateDbContext> options) : base(options) { }

    public DbSet<RealEstate.Domain.Entities.Property> Properties => Set<RealEstate.Domain.Entities.Property>();
    public DbSet<PropertyType> PropertyTypes => Set<PropertyType>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<PropertyStatusHistory> PropertyStatusHistories => Set<PropertyStatusHistory>();
    // Media & PropertyFeature are reached through the Property aggregate — no public DbSet needed.

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Picks up every IEntityTypeConfiguration<> in this assembly automatically.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RealEstateDbContext).Assembly);

        // Module isolation in a modular monolith: every table of this module in its own schema.
        modelBuilder.HasDefaultSchema("realestate");

        base.OnModelCreating(modelBuilder);
    }
public class PropertyStatusHistory
{
}