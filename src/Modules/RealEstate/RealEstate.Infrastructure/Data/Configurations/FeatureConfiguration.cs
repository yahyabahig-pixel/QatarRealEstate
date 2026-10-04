using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class FeatureConfiguration : IEntityTypeConfiguration<Feature>
{
    public void Configure(EntityTypeBuilder<Feature> builder)
    {
        builder.ToTable("Features");
        builder.HasKey(f => f.Id);

        builder.Property(f => f.Name).HasMaxLength(100).IsRequired();
        builder.Property(f => f.Icon).HasMaxLength(500);
        builder.Property(f => f.ValueType).HasConversion<int>();
        builder.Property(f => f.IsActive).HasDefaultValue(true);

        builder.HasIndex(f => f.Name).IsUnique().HasDatabaseName("UX_Features_Name");

        // See report B4: Feature.FeatureValue is a leftover — recommend deleting it from the
        // entity. Until then it maps as a plain (unused) column.
    }
}