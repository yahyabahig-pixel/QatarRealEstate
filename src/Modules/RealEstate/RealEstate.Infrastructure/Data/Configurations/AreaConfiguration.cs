using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class AreaConfiguration : IEntityTypeConfiguration<Area>
{
    public void Configure(EntityTypeBuilder<Area> builder)
    {
        builder.ToTable("Areas");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).HasMaxLength(200).IsRequired();
        builder.Property(a => a.Slug).HasMaxLength(200).IsRequired();
        builder.Property(a => a.PhotoUrl).HasMaxLength(1000).IsRequired();
        builder.Property(a => a.Intro).HasMaxLength(2000);

        // The slug is the public URL segment — uniqueness is a hard database guarantee.
        builder.HasIndex(a => a.Slug).IsUnique().HasDatabaseName("UX_Areas_Slug");

        // Property.AreaId → Areas: the "location area must be one of the defined areas" rule
        // as a REAL foreign key, configured from this side so PropertyConfiguration stays
        // untouched. Restrict = an area with listings filed under it cannot be deleted
        // (the handler returns a friendly 409 first; this is the database backstop).
        builder.HasMany<Property>()
            .WithOne()
            .HasForeignKey(p => p.AreaId)
            .IsRequired(false)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
