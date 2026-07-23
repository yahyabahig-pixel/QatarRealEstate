using BuildingBlocks.Domain.Common.Results.Errors;

namespace RealEstate.Domain.DomainErros;

public static class RentTermsErrors
{
    public static Error PriceRequired =>
        Error.Validation("RentTerms.Price.Required", "Rent price is required.");

    public static Error PriceInvalid =>
        Error.Validation("RentTerms.Price.Invalid", "Rent price must be greater than 0.");

    public static Error ContractDurationInvalid =>
        Error.Validation("RentTerms.ContractDuration.Invalid", "Contract duration must be greater than 0 months.");
}