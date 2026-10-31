namespace ChurchServe.Api.Assignments;

public sealed record AssignVolunteerRequest(
    string? PositionId,
    string? VolunteerId,
    int ExpectedEventVersion,
    string? ClientRequestId);

public sealed record MinistryPositionResponse(
    string Id,
    string EventId,
    string Ministry,
    string RoleName,
    DateTimeOffset StartsAt,
    DateTimeOffset EndsAt);

public sealed record VolunteerResponse(
    string Id,
    string DisplayName,
    IReadOnlyList<string> EligibleMinistries);

public sealed record AssignmentResponse(
    string Id,
    string PositionId,
    string VolunteerId,
    string VolunteerDisplayName,
    string Status);

public sealed record AssignmentBoardResponse(
    string EventId,
    int EventVersion,
    int AssignedPositions,
    IReadOnlyList<MinistryPositionResponse> Positions,
    IReadOnlyList<VolunteerResponse> Volunteers,
    IReadOnlyList<AssignmentResponse> Assignments);

public sealed record AssignVolunteerResponse(
    AssignmentResponse Assignment,
    int EventVersion,
    int AssignedPositions);

public sealed record AssignmentConflictResponse(
    string Message,
    AssignmentBoardResponse Board);
