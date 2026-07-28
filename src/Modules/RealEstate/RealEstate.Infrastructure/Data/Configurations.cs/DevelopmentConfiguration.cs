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
        builder.Property(d => d.AreaName).HasMaxLength(200).IsRequired();
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
