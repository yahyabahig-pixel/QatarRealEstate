using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Infrastructure.Data.Seeding;

namespace RealEstate.Infrastructure.Data.Configurations;

// Bookkeeping, not business data: the key IS the identity, so there is no surrogate id and no
// audit columns. See SeedHistoryEntry for why the table exists at all.
public sealed class SeedHistoryEntryConfiguration : IEntityTypeConfiguration<SeedHistoryEntry>
{
    public void Configure(EntityTypeBuilder<SeedHistoryEntry> builder)
    {
        builder.ToTable("SeedHistory");
        builder.HasKey(e => e.Key);

        builder.Property(e => e.Key).HasMaxLength(100).IsRequired();
        builder.Property(e => e.AppliedAtUtc).IsRequired();
        builder.Property(e => e.Note).HasMaxLength(500);
    }
}
