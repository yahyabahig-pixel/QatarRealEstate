using Auth.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace Auth.Infrastructure.Data.Configurations;

public sealed class PositionConfiguration : IEntityTypeConfiguration<Position>
{
    public void Configure(EntityTypeBuilder<Position> builder)
    {
        builder.ToTable("Positions");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Name).HasMaxLength(Position.MaxNameLength).IsRequired();
        builder.Property(p => p.Description).HasMaxLength(Position.MaxDescriptionLength);
        builder.Property(p => p.IsActive).HasDefaultValue(true);

        builder.HasIndex(p => p.Name).IsUnique().HasDatabaseName("UX_Positions_Name");

        // Aggregate-owned collection over a private list field — same pattern as Property.Media.
        builder.HasMany(p => p.Permissions)
               .WithOne()
               .HasForeignKey(pp => pp.PositionId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.Metadata.FindNavigation(nameof(Position.Permissions))!
               .SetPropertyAccessMode(PropertyAccessMode.Field);
    }
}
