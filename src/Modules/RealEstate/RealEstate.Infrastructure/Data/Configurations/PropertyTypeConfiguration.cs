// Data/Configurations/PropertyTypeConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class PropertyTypeConfiguration : IEntityTypeConfiguration<PropertyType>
{
    public void Configure(EntityTypeBuilder<PropertyType> builder)
    {
        builder.ToTable("PropertyTypes");
        builder.HasKey(t => t.Id);
        builder.Property(t => t.Name).HasMaxLength(100).IsRequired();
        builder.Property(t => t.Description).HasMaxLength(500);
        builder.HasIndex(t => t.Name).IsUnique();
    }
}