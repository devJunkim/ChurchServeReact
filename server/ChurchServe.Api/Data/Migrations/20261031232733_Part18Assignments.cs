using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace ChurchServe.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class Part18Assignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Version",
                table: "ServiceEvents",
                type: "INTEGER",
                nullable: false,
                defaultValue: 1);

            migrationBuilder.CreateTable(
                name: "MinistryPositions",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    ServiceEventId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Ministry = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false),
                    RoleName = table.Column<string>(type: "TEXT", maxLength: 200, nullable: false),
                    StartsAt = table.Column<long>(type: "INTEGER", nullable: false),
                    EndsAt = table.Column<long>(type: "INTEGER", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_MinistryPositions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_MinistryPositions_ServiceEvents_ServiceEventId",
                        column: x => x.ServiceEventId,
                        principalTable: "ServiceEvents",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Volunteers",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    DisplayName = table.Column<string>(type: "TEXT", maxLength: 120, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Volunteers", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "Assignments",
                columns: table => new
                {
                    Id = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    PositionId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    VolunteerId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    ClientRequestId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Status = table.Column<string>(type: "TEXT", maxLength: 32, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Assignments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Assignments_MinistryPositions_PositionId",
                        column: x => x.PositionId,
                        principalTable: "MinistryPositions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_Assignments_Volunteers_VolunteerId",
                        column: x => x.VolunteerId,
                        principalTable: "Volunteers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "VolunteerMinistries",
                columns: table => new
                {
                    VolunteerId = table.Column<string>(type: "TEXT", maxLength: 64, nullable: false),
                    Ministry = table.Column<string>(type: "TEXT", maxLength: 100, nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VolunteerMinistries", x => new { x.VolunteerId, x.Ministry });
                    table.ForeignKey(
                        name: "FK_VolunteerMinistries_Volunteers_VolunteerId",
                        column: x => x.VolunteerId,
                        principalTable: "Volunteers",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_ClientRequestId",
                table: "Assignments",
                column: "ClientRequestId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_PositionId",
                table: "Assignments",
                column: "PositionId",
                unique: true,
                filter: "Status <> 'declined'");

            migrationBuilder.CreateIndex(
                name: "IX_Assignments_VolunteerId",
                table: "Assignments",
                column: "VolunteerId");

            migrationBuilder.CreateIndex(
                name: "IX_MinistryPositions_ServiceEventId",
                table: "MinistryPositions",
                column: "ServiceEventId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Assignments");

            migrationBuilder.DropTable(
                name: "VolunteerMinistries");

            migrationBuilder.DropTable(
                name: "MinistryPositions");

            migrationBuilder.DropTable(
                name: "Volunteers");

            migrationBuilder.DropColumn(
                name: "Version",
                table: "ServiceEvents");
        }
    }
}
