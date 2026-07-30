using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using RealEstate.Domain.Entities;

namespace RealEstate.Infrastructure.Data.Configurations;

public sealed class AgentConfiguration : IEntityTypeConfiguration<Agent>
{
    public void Configure(EntityTypeBuilder<Agent> builder)
    {
        builder.ToTable("Agents");
        builder.HasKey(a => a.Id);

        builder.Property(a => a.Name).HasMaxLength(200).IsRequired();
        builder.Property(a => a.JobTitle).HasMaxLength(200).IsRequired();
        builder.Property(a => a.PhotoUrl).HasMaxLength(1000).IsRequired();
        builder.Property(a => a.Slug).HasMaxLength(200).IsRequired();

        builder.Property(a => a.Phone).HasMaxLength(50);
        builder.Property(a => a.WhatsApp).HasMaxLength(50);
        builder.Property(a => a.Email).HasMaxLength(320);
        builder.Property(a => a.Bio).HasMaxLength(2000);

        // 0.0 – 5.0 with one decimal place is the product rule; (2,1) stores exactly that.
        builder.Property(a => a.Rating).HasPrecision(2, 1);

        builder.Property(a => a.IsActive).HasDefaultValue(true);

        // The slug is the public URL segment — uniqueness is a hard database guarantee,
        // not just the application-level check in the handlers.
        builder.HasIndex(a => a.Slug).IsUnique().HasDatabaseName("UX_Agents_Slug");

        // The public site lists active agents constantly; cheap covering filter.
        builder.HasIndex(a => a.IsActive).HasDatabaseName("IX_Agents_IsActive");
    }
}
