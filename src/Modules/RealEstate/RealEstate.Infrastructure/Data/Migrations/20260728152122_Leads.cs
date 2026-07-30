using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class Leads : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "Leads",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FullName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(30)", maxLength: 30, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Message = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    Type = table.Column<int>(type: "int", nullable: false),
                    Status = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    PropertyId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    AgentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    PropertyTypeName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    ListingKind = table.Column<int>(type: "int", nullable: true),
                    Location_Country = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Location_City = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Location_Street = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Location_PostalCode = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: true),
                    Location_State = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                    Location_X = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Location_Y = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Location_Description = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Leads", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Leads_CreatedAtUtc",
                schema: "realestate",
                table: "Leads",
                column: "CreatedAtUtc");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_PropertyId",
                schema: "realestate",
                table: "Leads",
                column: "PropertyId");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_Status",
                schema: "realestate",
                table: "Leads",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_Leads_Type",
                schema: "realestate",
                table: "Leads",
                column: "Type");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Leads",
                schema: "realestate");
        }
    }
}
