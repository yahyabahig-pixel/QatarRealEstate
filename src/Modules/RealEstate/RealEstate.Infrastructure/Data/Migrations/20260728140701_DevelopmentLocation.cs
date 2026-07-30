using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class DevelopmentLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "AreaName",
                schema: "realestate",
                table: "Developments",
                newName: "Location_Street");

            migrationBuilder.AddColumn<string>(
                name: "Location_City",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_Country",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_Description",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(500)",
                maxLength: 500,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "Location_PostalCode",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(20)",
                maxLength: 20,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_State",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(100)",
                maxLength: 100,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_X",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "Location_Y",
                schema: "realestate",
                table: "Developments",
                type: "nvarchar(50)",
                maxLength: 50,
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Location_City",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_Country",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_Description",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_PostalCode",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_State",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_X",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.DropColumn(
                name: "Location_Y",
                schema: "realestate",
                table: "Developments");

            migrationBuilder.RenameColumn(
                name: "Location_Street",
                schema: "realestate",
                table: "Developments",
                newName: "AreaName");
        }
    }
}
