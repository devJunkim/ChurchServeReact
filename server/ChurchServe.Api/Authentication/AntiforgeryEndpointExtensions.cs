using Microsoft.AspNetCore.Antiforgery;

namespace ChurchServe.Api.Authentication;

public static class AntiforgeryEndpointExtensions
{
    public static RouteHandlerBuilder ValidateAntiforgery(
        this RouteHandlerBuilder builder) =>
        builder.AddEndpointFilter(async (context, next) =>
        {
            var antiforgery = context.HttpContext.RequestServices
                .GetRequiredService<IAntiforgery>();

            try
            {
                await antiforgery.ValidateRequestAsync(context.HttpContext);
            }
            catch (AntiforgeryValidationException)
            {
                return Results.BadRequest(new
                {
                    message = "The antiforgery token was invalid.",
                });
            }

            return await next(context);
        });
}
