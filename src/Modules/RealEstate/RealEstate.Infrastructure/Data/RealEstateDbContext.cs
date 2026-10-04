
using Microsoft.EntityFrameworkCore;
using RealEstate.Domain.Entities;

public sealed class RealEstateDbContext : DbContext
{
    public RealEstateDbContext(DbContextOptions<RealEstateDbContext> options) : base(options) { }

    public DbSet<RealEstate.Domain.Entities.Property> Properties => Set<RealEstate.Domain.Entities.Property>();
    public DbSet<PropertyType> PropertyTypes => Set<PropertyType>();
    public DbSet<Feature> Features => Set<Feature>();
    public DbSet<PropertyStatusHistory> PropertyStatusHistories => Set<PropertyStatusHistory>();
    public DbSet<Agent> Agents => Set<Agent>();
    public DbSet<StoredImage> StoredImages => Set<StoredImage>();
    public DbSet<Development> Developments => Set<Development>();
    public DbSet<Area> Areas => Set<Area>();
    public DbSet<Job> Jobs => Set<Job>();
    public DbSet<Lead> Leads => Set<Lead>();
    // Media & PropertyFeature are reached through the Property aggregate — no public DbSet needed.

    // Infrastructure bookkeeping, not business data: which seed batches have already been
    // applied to this database. See SeedHistoryEntry for why deleting a seeded row has to stick.
    public DbSet<RealEstate.Infrastructure.Data.Seeding.SeedHistoryEntry> SeedHistory =>
        Set<RealEstate.Infrastructure.Data.Seeding.SeedHistoryEntry>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Picks up every IEntityTypeConfiguration<> in this assembly automatically.
        modelBuilder.ApplyConfigurationsFromAssembly(typeof(RealEstateDbContext).Assembly);

        // Module isolation in a modular monolith: every table of this module in its own schema.
        modelBuilder.HasDefaultSchema("realestate");

        base.OnModelCreating(modelBuilder);
    }
}