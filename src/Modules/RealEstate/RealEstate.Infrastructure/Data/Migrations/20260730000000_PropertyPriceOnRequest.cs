using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <summary>
    /// Adds the Properties.PriceOnRequest column.
    ///
    /// WHY THIS EXISTS: Property.PriceOnRequest and its mapping in PropertyConfiguration
    /// ("builder.Property(p => p.PriceOnRequest).HasDefaultValue(false)") were added to the
    /// model, but no migration was ever generated for them. The model and the database had
    /// therefore drifted, and every query that materialises a Property aggregate — including
    /// the seeder's own area backfill and PropertyQueries' list/detail reads — failed with
    /// "Invalid column name 'PriceOnRequest'" (SQL error 207).
    ///
    /// Default false, exactly as PropertyConfiguration declares and as its comment there
    /// intends: existing rows keep publishing their price, because the flag opts a listing
    /// OUT of showing a price and never opts one in.
    /// </summary>
    public partial class PropertyPriceOnRequest : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<bool>(
                name: "PriceOnRequest",
                schema: "realestate",
                table: "Properties",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "PriceOnRequest",
                schema: "realestate",
                table: "Properties");
        }
    }
}
