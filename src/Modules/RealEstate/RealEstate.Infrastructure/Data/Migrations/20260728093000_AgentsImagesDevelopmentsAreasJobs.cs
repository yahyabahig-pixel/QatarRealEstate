using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class AgentsImagesDevelopmentsAreasJobs : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AreaId",
                schema: "realestate",
                table: "Properties",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Agents",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    JobTitle = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhotoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Phone = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    WhatsApp = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                    Email = table.Column<string>(type: "nvarchar(320)", maxLength: 320, nullable: true),
                    Rating = table.Column<decimal>(type: "decimal(2,1)", precision: 2, scale: 1, nullable: false),
                    Bio = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Agents", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Areas",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PhotoUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Intro = table.Column<string>(type: "nvarchar(2000)", maxLength: 2000, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Areas", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Developments",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Slug = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    AreaName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    DeliveryYear = table.Column<int>(type: "int", nullable: false),
                    CoverImageUrl = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: true),
                    UnitsCount = table.Column<int>(type: "int", nullable: false),
                    DeveloperName = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    StartingPrice = table.Column<decimal>(type: "decimal(18,2)", precision: 18, scale: 2, nullable: false),
                    PaymentPlan = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Developments", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Images",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FileName = table.Column<string>(type: "nvarchar(260)", maxLength: 260, nullable: false),
                    ContentType = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    SizeBytes = table.Column<long>(type: "bigint", nullable: false),
                    Data = table.Column<byte[]>(type: "varbinary(max)", nullable: false),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Images", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Jobs",
                schema: "realestate",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    Title = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Department = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    EmploymentType = table.Column<string>(type: "nvarchar(60)", maxLength: 60, nullable: false),
                    Location = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Description = table.Column<string>(type: "nvarchar(4000)", maxLength: 4000, nullable: false),
                    IsActive = table.Column<bool>(type: "bit", nullable: false, defaultValue: true),
                    CreatedAtUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    CreatedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    LastModifiedUtc = table.Column<DateTimeOffset>(type: "datetimeoffset", nullable: false),
                    LastModifiedBy = table.Column<Guid>(type: "uniqueidentifier", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Jobs", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Properties_AreaId",
                schema: "realestate",
                table: "Properties",
                column: "AreaId");

            migrationBuilder.CreateIndex(
                name: "IX_Agents_IsActive",
                schema: "realestate",
                table: "Agents",
                column: "IsActive");

            migrationBuilder.CreateIndex(
                name: "UX_Agents_Slug",
                schema: "realestate",
                table: "Agents",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Areas_Slug",
                schema: "realestate",
                table: "Areas",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "UX_Developments_Slug",
                schema: "realestate",
                table: "Developments",
                column: "Slug",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Jobs_IsActive_Department",
                schema: "realestate",
                table: "Jobs",
                columns: new[] { "IsActive", "Department" });

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Areas_AreaId",
                schema: "realestate",
                table: "Properties",
                column: "AreaId",
                principalSchema: "realestate",
                principalTable: "Areas",
                principalColumn: "Id",
                onDelete: ReferentialAction.Restrict);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Areas_AreaId",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropTable(
                name: "Agents",
                schema: "realestate");

            migrationBuilder.DropTable(
                name: "Areas",
                schema: "realestate");

            migrationBuilder.DropTable(
                name: "Developments",
                schema: "realestate");

            migrationBuilder.DropTable(
                name: "Images",
                schema: "realestate");

            migrationBuilder.DropTable(
                name: "Jobs",
                schema: "realestate");

            migrationBuilder.DropIndex(
                name: "IX_Properties_AreaId",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "AreaId",
                schema: "realestate",
                table: "Properties");
        }
    }
}
