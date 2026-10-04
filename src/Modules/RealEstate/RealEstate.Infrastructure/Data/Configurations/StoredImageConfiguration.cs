using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class StoredImageConfiguration : IEntityTypeConfiguration<StoredImage>
{
    public void Configure(EntityTypeBuilder<StoredImage> builder)
    {
        builder.ToTable("Images");
        builder.HasKey(i => i.Id);

        builder.Property(i => i.FileName).HasMaxLength(260).IsRequired();
        builder.Property(i => i.ContentType).HasMaxLength(100).IsRequired();
        builder.Property(i => i.SizeBytes).IsRequired();

        // byte[] maps to varbinary(max) — the actual photo bytes.
        builder.Property(i => i.Data).IsRequired();
    }
}
