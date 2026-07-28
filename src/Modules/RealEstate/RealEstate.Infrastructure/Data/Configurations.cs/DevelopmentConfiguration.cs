using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class DevelopmentConfiguration : IEntityTypeConfiguration<Development>
{
    public void Configure(EntityTypeBuilder<Development> builder)
    {
        builder.ToTable("Developments");
        builder.HasKey(d => d.Id);

        builder.Property(d => d.Name).HasMaxLength(200).IsRequired();
        builder.Property(d => d.Slug).HasMaxLength(200).IsRequired();
        // Same owned-Location mapping strategy as Property — one persistence pattern for
        // the one Location value object. Column names match Properties' for consistency.
        builder.OwnsOne(d => d.Location, loc =>
        {
            loc.Property(l => l.CountryName).HasColumnName("Location_Country").HasMaxLength(100).IsRequired();
            loc.Property(l => l.CityName).HasColumnName("Location_City").HasMaxLength(100).IsRequired();
            loc.Property(l => l.StreetName).HasColumnName("Location_Street").HasMaxLength(200).IsRequired();
            loc.Property(l => l.PostalCode).HasColumnName("Location_PostalCode").HasMaxLength(20).IsRequired();
            loc.Property(l => l.State).HasColumnName("Location_State").HasMaxLength(100);
            loc.Property(l => l.XCoordinate).HasColumnName("Location_X").HasMaxLength(50);
            loc.Property(l => l.YCoordinate).HasColumnName("Location_Y").HasMaxLength(50);
            loc.Property(l => l.Description).HasColumnName("Location_Description").HasMaxLength(500);
        });
        builder.Navigation(d => d.Location).IsRequired();
        builder.Property(d => d.CoverImageUrl).HasMaxLength(1000).IsRequired();
        builder.Property(d => d.Description).HasMaxLength(4000);
        builder.Property(d => d.DeveloperName).HasMaxLength(200);
        builder.Property(d => d.PaymentPlan).HasMaxLength(200);

        // Marketing "from" price in QAR.
        builder.Property(d => d.StartingPrice).HasPrecision(18, 2);

        // The slug is the public URL segment — uniqueness is a hard database guarantee,
        // not just the application-level check in the handlers.
        builder.HasIndex(d => d.Slug).IsUnique().HasDatabaseName("UX_Developments_Slug");
    }
}
