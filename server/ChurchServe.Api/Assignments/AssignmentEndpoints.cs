using System.Data;
using ChurchServe.Api.Authentication;
using ChurchServe.Api.Data;
using Microsoft.EntityFrameworkCore;

namespace ChurchServe.Api.Assignments;

public static class AssignmentEndpoints
{
    public static RouteGroupBuilder MapAssignmentEndpoints(
        this RouteGroupBuilder group)
    {
        group.MapGet("/{eventId}/assignment-board", async (
            string eventId,
            ChurchServeDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var board = await BuildBoardAsync(
                dbContext,
                eventId,
                cancellationToken);
            return board is null ? Results.NotFound() : Results.Ok(board);
        }).RequireAuthorization(
            ChurchServePermissions.ScheduleRead,
            ChurchServePermissions.VolunteerRead);

        group.MapPost("/{eventId}/assignments", async (
            string eventId,
            AssignVolunteerRequest request,
            ChurchServeDbContext dbContext,
            CancellationToken cancellationToken) =>
        {
            var errors = Validate(request);
            if (errors.Count > 0)
            {
                return Results.ValidationProblem(errors);
            }

            await using var transaction =
                await dbContext.Database.BeginTransactionAsync(
                    IsolationLevel.Serializable,
                    cancellationToken);

            var serviceEvent = await dbContext.ServiceEvents.SingleOrDefaultAsync(
                item => item.Id == eventId,
                cancellationToken);
            if (serviceEvent is null)
            {
                return Results.NotFound();
            }

            var existingRequest = await dbContext.Assignments
                .Include(item => item.Volunteer)
                .SingleOrDefaultAsync(
                    item => item.ClientRequestId == request.ClientRequestId,
                    cancellationToken);
            if (existingRequest is not null)
            {
                if (existingRequest.PositionId != request.PositionId ||
                    existingRequest.VolunteerId != request.VolunteerId)
                {
                    return await ConflictAsync(
                        dbContext,
                        eventId,
                        "The idempotency key was already used for another assignment.",
                        cancellationToken);
                }

                return Results.Ok(new AssignVolunteerResponse(
                    ToResponse(existingRequest),
                    serviceEvent.Version,
                    serviceEvent.AssignedPositions));
            }

            if (serviceEvent.Version != request.ExpectedEventVersion)
            {
                return await ConflictAsync(
                    dbContext,
                    eventId,
                    "The schedule changed after you loaded it.",
                    cancellationToken);
            }

            var position = await dbContext.MinistryPositions.SingleOrDefaultAsync(
                item => item.Id == request.PositionId &&
                    item.ServiceEventId == eventId,
                cancellationToken);
            if (position is null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["positionId"] =
                        ["The position does not belong to this service event."],
                });
            }

            var volunteer = await dbContext.Volunteers
                .Include(item => item.EligibleMinistries)
                .SingleOrDefaultAsync(
                    item => item.Id == request.VolunteerId,
                    cancellationToken);
            if (volunteer is null)
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["volunteerId"] = ["The volunteer was not found."],
                });
            }

            if (!volunteer.EligibleMinistries.Any(
                item => item.Ministry == position.Ministry))
            {
                return Results.ValidationProblem(new Dictionary<string, string[]>
                {
                    ["volunteerId"] =
                        ["The volunteer is not eligible for this ministry."],
                });
            }

            if (await dbContext.Assignments.AnyAsync(
                item => item.PositionId == position.Id &&
                    item.Status != "declined",
                cancellationToken))
            {
                return await ConflictAsync(
                    dbContext,
                    eventId,
                    "The position was assigned by another coordinator.",
                    cancellationToken);
            }

            var overlaps = await dbContext.Assignments
                .Where(item => item.VolunteerId == volunteer.Id &&
                    item.Status != "declined")
                .AnyAsync(
                    item => item.Position.StartsAt < position.EndsAt &&
                        item.Position.EndsAt > position.StartsAt,
                    cancellationToken);
            if (overlaps)
            {
                return await ConflictAsync(
                    dbContext,
                    eventId,
                    "The volunteer already has an overlapping assignment.",
                    cancellationToken);
            }

            var assignment = new Assignment
            {
                Id = Guid.NewGuid().ToString("N"),
                PositionId = position.Id,
                VolunteerId = volunteer.Id,
                ClientRequestId = request.ClientRequestId!,
                Status = "accepted",
                Position = position,
                Volunteer = volunteer,
            };
            dbContext.Assignments.Add(assignment);
            serviceEvent.AssignedPositions++;
            serviceEvent.Version++;

            try
            {
                await dbContext.SaveChangesAsync(cancellationToken);
                await transaction.CommitAsync(cancellationToken);
            }
            catch (DbUpdateException)
            {
                await transaction.RollbackAsync(cancellationToken);
                dbContext.ChangeTracker.Clear();
                return await ConflictAsync(
                    dbContext,
                    eventId,
                    "The schedule changed while the assignment was being saved.",
                    cancellationToken);
            }

            return Results.Created(
                $"/api/service-events/{Uri.EscapeDataString(eventId)}/assignments/{assignment.Id}",
                new AssignVolunteerResponse(
                    ToResponse(assignment),
                    serviceEvent.Version,
                    serviceEvent.AssignedPositions));
        }).ValidateAntiforgery().RequireAuthorization(
            ChurchServePermissions.ScheduleManage,
            ChurchServePermissions.VolunteerRead);

        return group;
    }

    private static Dictionary<string, string[]> Validate(
        AssignVolunteerRequest request)
    {
        var errors = new Dictionary<string, string[]>();
        if (string.IsNullOrWhiteSpace(request.PositionId))
        {
            errors["positionId"] = ["A position is required."];
        }

        if (string.IsNullOrWhiteSpace(request.VolunteerId))
        {
            errors["volunteerId"] = ["A volunteer is required."];
        }

        if (request.ExpectedEventVersion < 1)
        {
            errors["expectedEventVersion"] =
                ["The expected event version must be positive."];
        }

        if (string.IsNullOrWhiteSpace(request.ClientRequestId))
        {
            errors["clientRequestId"] = ["A client request ID is required."];
        }

        return errors;
    }

    private static async Task<IResult> ConflictAsync(
        ChurchServeDbContext dbContext,
        string eventId,
        string message,
        CancellationToken cancellationToken)
    {
        var board = await BuildBoardAsync(
            dbContext,
            eventId,
            cancellationToken);
        return Results.Json(
            new AssignmentConflictResponse(message, board!),
            statusCode: StatusCodes.Status409Conflict);
    }

    private static async Task<AssignmentBoardResponse?> BuildBoardAsync(
        ChurchServeDbContext dbContext,
        string eventId,
        CancellationToken cancellationToken)
    {
        var serviceEvent = await dbContext.ServiceEvents
            .AsNoTracking()
            .SingleOrDefaultAsync(item => item.Id == eventId, cancellationToken);
        if (serviceEvent is null)
        {
            return null;
        }

        var positions = await dbContext.MinistryPositions
            .AsNoTracking()
            .Where(item => item.ServiceEventId == eventId)
            .OrderBy(item => item.StartsAt)
            .ThenBy(item => item.RoleName)
            .Select(item => new MinistryPositionResponse(
                item.Id,
                item.ServiceEventId,
                item.Ministry,
                item.RoleName,
                item.StartsAt,
                item.EndsAt))
            .ToArrayAsync(cancellationToken);

        var positionIds = positions.Select(item => item.Id).ToArray();
        var assignments = await dbContext.Assignments
            .AsNoTracking()
            .Where(item => positionIds.Contains(item.PositionId) &&
                item.Status != "declined")
            .OrderBy(item => item.PositionId)
            .Select(item => new AssignmentResponse(
                item.Id,
                item.PositionId,
                item.VolunteerId,
                item.Volunteer.DisplayName,
                item.Status))
            .ToArrayAsync(cancellationToken);

        var ministries = positions
            .Select(item => item.Ministry)
            .Distinct()
            .ToArray();
        var volunteers = await dbContext.Volunteers
            .AsNoTracking()
            .Where(item => item.EligibleMinistries.Any(
                value => ministries.Contains(value.Ministry)))
            .OrderBy(item => item.DisplayName)
            .Select(item => new VolunteerResponse(
                item.Id,
                item.DisplayName,
                item.EligibleMinistries
                    .OrderBy(value => value.Ministry)
                    .Select(value => value.Ministry)
                    .ToArray()))
            .ToArrayAsync(cancellationToken);

        return new AssignmentBoardResponse(
            serviceEvent.Id,
            serviceEvent.Version,
            serviceEvent.AssignedPositions,
            positions,
            volunteers,
            assignments);
    }

    private static AssignmentResponse ToResponse(Assignment assignment) => new(
        assignment.Id,
        assignment.PositionId,
        assignment.VolunteerId,
        assignment.Volunteer.DisplayName,
        assignment.Status);
}
