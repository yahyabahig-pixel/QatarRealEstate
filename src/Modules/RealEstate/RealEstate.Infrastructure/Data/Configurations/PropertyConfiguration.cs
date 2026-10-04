// Data/Configurations/PropertyConfiguration.cs
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Constants;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class PropertyConfiguration : IEntityTypeConfiguration<Property>
{
    public void Configure(EntityTypeBuilder<Property> builder)
    {
        builder.ToTable("Properties");
        builder.HasKey(p => p.Id);

        builder.Property(p => p.Title)
               .HasMaxLength(PropertyConstants.MaxTitleLength)
               .IsRequired();

        builder.Property(p => p.Description)
               .HasMaxLength(PropertyConstants.MaxDescriptionLength);

        builder.Property(p => p.ListingKind).HasConversion<int>();
        builder.Property(p => p.Status).HasConversion<int>();

        // Where Archive() was called from, so Publish() can refuse to resurrect a SOLD or
        // RENTED listing through the archive. Read-only on the aggregate and written only by
        // Archive()/Publish(), so EF goes through the backing field. NULL for every row that
        // predates the column, which reads as "archived from Draft or Published" — publishable,
        // i.e. the behaviour those rows already had.
        builder.Property(p => p.StatusBeforeArchive)
               .HasField("_statusBeforeArchive")
               .UsePropertyAccessMode(PropertyAccessMode.Field)
               .HasConversion<int?>();

        builder.Property(p => p.IsActive).HasDefaultValue(true);
        builder.Property(p => p.IsFeatured).HasDefaultValue(false);
        builder.Property(p => p.ViewsCount).HasDefaultValue(0);

        // IsAvailable is computed from Status — never a column.
        builder.Ignore(p => p.IsAvailable);

        // ---- owned value objects → columns on the Properties table -------------------

        builder.OwnsOne(p => p.Location, loc =>
        {
            loc.Property(l => l.CountryName).HasColumnName("Location_Country").HasMaxLength(100).IsRequired();
            loc.Property(l => l.CityName).HasColumnName("Location_City").HasMaxLength(100).IsRequired();
            loc.Property(l => l.StreetName).HasColumnName("Location_Street").HasMaxLength(200).IsRequired();
            loc.Property(l => l.PostalCode).HasColumnName("Location_PostalCode").HasMaxLength(20).IsRequired();
            loc.Property(l => l.State).HasColumnName("Location_State").HasMaxLength(100);
            loc.Property(l => l.XCoordinate).HasColumnName("Location_X").HasMaxLength(50);
            loc.Property(l => l.YCoordinate).HasColumnName("Location_Y").HasMaxLength(50);
            loc.Property(l => l.Description).HasColumnName("Location_Description").HasMaxLength(500);

            // City is the hottest filter in search — index it.
            loc.HasIndex(l => l.CityName).HasDatabaseName("IX_Properties_City");
        });
        builder.Navigation(p => p.Location).IsRequired();

        builder.OwnsOne(p => p.PropertySpecs, specs =>
        {
            specs.Property(s => s.NumberOfRooms).HasColumnName("Specs_Rooms");
            specs.Property(s => s.Bathrooms).HasColumnName("Specs_Bathrooms");
            specs.Property(s => s.AreaInSquareMeters).HasColumnName("Specs_Area").HasPrecision(12, 2);
        });
        builder.Navigation(p => p.PropertySpecs).IsRequired();

        // Nullable owned: all columns nullable; EF materializes null when every column is null.
        builder.OwnsOne(p => p.SaleTerms, sale =>
        {
            sale.Property(s => s.PaymentMethod).HasColumnName("Sale_PaymentMethod").HasConversion<int?>();

            sale.OwnsOne(s => s.Price, money =>
            {
                money.Property(m => m.Amount).HasColumnName("Sale_Price").HasPrecision(18, 2);
                money.Property(m => m.Currency).HasColumnName("Sale_Currency").HasMaxLength(3);
            });

            sale.OwnsOne(s => s.InstallmentPlan, plan =>
            {
                plan.Property(i => i.NumberOfInstallments).HasColumnName("Inst_Count");
                plan.Property(i => i.Frequency).HasColumnName("Inst_Frequency").HasConversion<int?>();
                plan.OwnsOne(i => i.DownPayment, m =>
                {
                    m.Property(x => x.Amount).HasColumnName("Inst_DownPayment").HasPrecision(18, 2);
                    m.Property(x => x.Currency).HasColumnName("Inst_DownPayment_Currency").HasMaxLength(3);
                });
                plan.OwnsOne(i => i.InstallmentAmount, m =>
                {
                    m.Property(x => x.Amount).HasColumnName("Inst_Amount").HasPrecision(18, 2);
                    m.Property(x => x.Currency).HasColumnName("Inst_Amount_Currency").HasMaxLength(3);
                });
            });
        });

        builder.OwnsOne(p => p.RentTerms, rent =>
        {
            rent.Property(r => r.ContractDurationMonths).HasColumnName("Rent_DurationMonths");
            rent.OwnsOne(r => r.Price, money =>
            {
                money.Property(m => m.Amount).HasColumnName("Rent_Price").HasPrecision(18, 2);
                money.Property(m => m.Currency).HasColumnName("Rent_Currency").HasMaxLength(3);
            });
            // RentTerms has a Guid Id property — it's a record acting as VO; don't map it as a key.
            rent.Ignore(r => r.Id);
        });

        builder.OwnsOne(p => p.Offer, money =>
        {
            money.Property(m => m.Amount).HasColumnName("Offer_Amount").HasPrecision(18, 2);
            money.Property(m => m.Currency).HasColumnName("Offer_Currency").HasMaxLength(3);
        });

        // ---- relationships ------------------------------------------------------------

        builder.HasOne<PropertyType>()
               .WithMany()
               .HasForeignKey(p => p.PropertyTypeId)
               .OnDelete(DeleteBehavior.Restrict);

        // The assigned consultant. SetNull: deleting an agent unassigns their listings
        // rather than deleting them (or blocking the agent's deletion).
        builder.HasOne<Agent>()
               .WithMany()
               .HasForeignKey(p => p.AgentId)
               .OnDelete(DeleteBehavior.SetNull);

        // Aggregate-owned collections, exposed as IReadOnlyCollection over private List fields.
        // PropertyAccessMode.Field makes EF read/write _media and _features directly, so the
        // aggregate's encapsulation (no public mutable collection) survives persistence.
        builder.HasMany(p => p.Media)
               .WithOne()
               .HasForeignKey(m => m.PropertyId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.Metadata.FindNavigation(nameof(Property.Media))!
               .SetPropertyAccessMode(PropertyAccessMode.Field);

        builder.HasMany(p => p.PropertyFeatures)
               .WithOne()
               .HasForeignKey(f => f.PropertyId)
               .OnDelete(DeleteBehavior.Cascade);
        builder.Metadata.FindNavigation(nameof(Property.PropertyFeatures))!
               .SetPropertyAccessMode(PropertyAccessMode.Field);

        // ---- indexes for the query side -------------------------------------------------

        builder.Property(p => p.IsOffPlan).HasDefaultValue(false);

        // Default false so every row that already exists keeps publishing its price when
        // the column is added — the new flag opts a listing OUT, it never opts one in.
        builder.Property(p => p.PriceOnRequest).HasDefaultValue(false);

        // Denormalised copies of Location_X / Location_Y as real floats. Nullable on purpose:
        // "we do not know where this is" is a legitimate state and the map hides those rows.
        builder.Property(p => p.Latitude).HasColumnType("float");
        builder.Property(p => p.Longitude).HasColumnType("float");

        // Composite, latitude first: the viewport query filters latitude then longitude, so
        // this is the order SQL Server can seek on rather than scan.
        builder.HasIndex(p => new { p.Latitude, p.Longitude }).HasDatabaseName("IX_Properties_LatLng");

        builder.HasIndex(p => p.Status).HasDatabaseName("IX_Properties_Status");
        builder.HasIndex(p => new { p.Status, p.IsFeatured }).HasDatabaseName("IX_Properties_Featured");
        builder.HasIndex(p => p.PropertyTypeId);
        builder.HasIndex(p => p.CreatedBy).HasDatabaseName("IX_Properties_Owner");
        builder.HasIndex(p => p.AgentId).HasDatabaseName("IX_Properties_Agent");
    }
}