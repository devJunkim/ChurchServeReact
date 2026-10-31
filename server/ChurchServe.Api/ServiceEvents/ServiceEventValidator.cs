namespace ChurchServe.Api.ServiceEvents;

public static class ServiceEventValidator
{
    public static Dictionary<string, string[]> Validate(
        CreateServiceEventRequest request)
    {
        var errors = new Dictionary<string, string[]>();

        ValidateText(request.Title, "title", "Service name", errors);
        ValidateText(request.Location, "location", "Location", errors);

        if (request.StartsAt is null)
        {
            errors["startsAt"] = ["Enter a valid start date and time."];
        }

        if (request.EndsAt is null)
        {
            errors["endsAt"] = ["Enter a valid end date and time."];
        }

        if (request.StartsAt is not null &&
            request.EndsAt is not null &&
            request.EndsAt <= request.StartsAt)
        {
            errors["timeRange"] = ["End time must be after start time."];
        }

        return errors;
    }

    private static void ValidateText(
        string? value,
        string key,
        string label,
        Dictionary<string, string[]> errors)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            errors[key] = [$"{label} is required."];
        }
        else if (value.Trim().Length > 120)
        {
            errors[key] = [$"{label} must be 120 characters or fewer."];
        }
    }
}
