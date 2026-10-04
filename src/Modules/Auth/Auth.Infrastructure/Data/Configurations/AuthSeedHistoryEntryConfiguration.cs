using Auth.Infrastructure.Data.Seeding;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Auth.Infrastructure.Data.Configurations;

public sealed class AuthSeedHistoryEntryConfiguration : IEntityTypeConfiguration<AuthSeedHistoryEntry>
{
    public void Configure(EntityTypeBuilder<AuthSeedHistoryEntry> builder)
    {
        builder.ToTable("SeedHistory");
        builder.HasKey(e => e.Key);

        builder.Property(e => e.Key).HasMaxLength(100).IsRequired();
        builder.Property(e => e.AppliedAtUtc).IsRequired();
        builder.Property(e => e.Note).HasMaxLength(500);
    }
}
