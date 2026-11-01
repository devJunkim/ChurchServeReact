using Microsoft.AspNetCore.Authorization;

namespace ChurchServe.Api.Authentication;

public static class ChurchServePermissions
{
    public const string ClaimType = "churchserve:permission";
    public const string ScheduleRead = "schedule.read";
    public const string ScheduleManage = "schedule.manage";
    public const string VolunteerRead = "volunteer.read";
    public const string VolunteerManage = "volunteer.manage";

    private static readonly string[] SchedulerPermissions =
    [
        ScheduleRead,
        ScheduleManage,
        VolunteerRead,
        VolunteerManage,
    ];

    private static readonly string[] ReaderPermissions =
    [
        ScheduleRead,
        VolunteerRead,
    ];

    public static IReadOnlyList<string> ForRole(string role) =>
        role.Trim().ToLowerInvariant() switch
        {
            "scheduler" => SchedulerPermissions,
            "reader" => ReaderPermissions,
            _ => [],
        };

    public static void Configure(AuthorizationOptions options)
    {
        foreach (var permission in SchedulerPermissions)
        {
            options.AddPolicy(
                permission,
                policy => policy.RequireClaim(ClaimType, permission));
        }
    }
}
