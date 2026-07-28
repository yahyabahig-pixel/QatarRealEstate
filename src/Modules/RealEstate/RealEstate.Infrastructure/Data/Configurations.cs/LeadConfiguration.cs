using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class LeadConfiguration : IEntityTypeConfiguration<Lead>
{
    public void Configure(EntityTypeBuilder<Lead> builder)
    {
        builder.ToTable("Leads");
        builder.HasKey(l => l.Id);

        builder.Property(l => l.FullName).HasMaxLength(150).IsRequired();
        builder.Property(l => l.Phone).HasMaxLength(30).IsRequired();
        builder.Property(l => l.Email).HasMaxLength(200).IsRequired();
        builder.Property(l => l.Message).HasMaxLength(2000);
        builder.Property(l => l.Source).HasMaxLength(100).IsRequired();
        builder.Property(l => l.PropertyTypeName).HasMaxLength(100);

        // PropertyId / AgentId are LOOSE references (no FK): a lead is sales history and
        // must survive anything that ever happens to the catalog rows it points at.

        // Same owned-Location mapping Properties and Developments use — OPTIONAL here,
        // because only ListingRequest leads carry one.
        builder.OwnsOne(l => l.Location, loc =>
        {
            loc.Property(x => x.CountryName).HasColumnName("Location_Country").HasMaxLength(100);
            loc.Property(x => x.CityName).HasColumnName("Location_City").HasMaxLength(100);
            loc.Property(x => x.StreetName).HasColumnName("Location_Street").HasMaxLength(200);
            loc.Property(x => x.PostalCode).HasColumnName("Location_PostalCode").HasMaxLength(20);
            loc.Property(x => x.State).HasColumnName("Location_State").HasMaxLength(100);
            loc.Property(x => x.XCoordinate).HasColumnName("Location_X").HasMaxLength(50);
            loc.Property(x => x.YCoordinate).HasColumnName("Location_Y").HasMaxLength(50);
            loc.Property(x => x.Description).HasColumnName("Location_Description").HasMaxLength(500);
        });

        // The admin list filters on status/type, orders by date, and joins property titles
        // by id — each index earns its place; nothing speculative.
        builder.HasIndex(l => l.Status).HasDatabaseName("IX_Leads_Status");
        builder.HasIndex(l => l.Type).HasDatabaseName("IX_Leads_Type");
        builder.HasIndex(l => l.CreatedAtUtc).HasDatabaseName("IX_Leads_CreatedAtUtc");
        builder.HasIndex(l => l.PropertyId).HasDatabaseName("IX_Leads_PropertyId");
    }
}
