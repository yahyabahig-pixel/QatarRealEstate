using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace RealEstate.Infrastructure.Data.Migrations
{
    /// <inheritdoc />
    public partial class PropertyAgent : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<Guid>(
                name: "AgentId",
                schema: "realestate",
                table: "Properties",
                type: "uniqueidentifier",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_Properties_Agent",
                schema: "realestate",
                table: "Properties",
                column: "AgentId");

            migrationBuilder.AddForeignKey(
                name: "FK_Properties_Agents_AgentId",
                schema: "realestate",
                table: "Properties",
                column: "AgentId",
                principalSchema: "realestate",
                principalTable: "Agents",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Properties_Agents_AgentId",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropIndex(
                name: "IX_Properties_Agent",
                schema: "realestate",
                table: "Properties");

            migrationBuilder.DropColumn(
                name: "AgentId",
                schema: "realestate",
                table: "Properties");
        }
    }
}
