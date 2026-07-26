using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class MediaConfiguration : IEntityTypeConfiguration<Media>
{
    public void Configure(EntityTypeBuilder<Media> builder)
    {
        builder.ToTable("PropertyMedia");
        builder.HasKey(m => m.Id);

        builder.Property(m => m.Url).HasMaxLength(2000).IsRequired();
        builder.Property(m => m.MediaType).HasMaxLength(50).IsRequired();

        // FK column type comes from Media.PropertyId — MUST be Guid (blocker B1).
        builder.HasIndex(m => m.PropertyId);
        builder.HasIndex(m => new { m.PropertyId, m.IsPrimary })
               .HasDatabaseName("IX_Media_PrimaryPerProperty");
    }
}