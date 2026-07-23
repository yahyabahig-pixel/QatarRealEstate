using BuildingBlocks.Common.Results;
using BuildingBlocks.Common.Results.Errors;

namespace RealEstate.Application.Common.Errors;

public static class ApplicationErrors
{
    // Generic / Infrastructure
    public static Error Unexpected =>
        Error.Unexpected("Application.Unexpected", "An unexpected error occurred.");

    public static Error Failure =>
        Error.Failure("Application.Failure", "Operation failed.");

    public static Error ConcurrencyFailure =>
        Error.Conflict("Application.Concurrency", "A concurrency conflict occurred.");

    public static Error Unauthorized =>
        Error.Unauthorized("Application.User.Unauthorized", "You are not authorized to perform this action.");

    public static Error Forbidden =>
        Error.Forbidden("Application.User.Forbidden", "You are forbidden from performing this action.");

    // Property - NotFound / Conflict / Validation
    public static Error PropertyNotFound =>
        Error.NotFound("Application.Property.NotFound", "Property does not exist.");

    public static Error PropertyAlreadyPublished =>
        Error.Conflict("Application.Property.AlreadyPublished", "Property is already published.");

    public static Error PropertyNotPublished =>
        Error.Validation("Application.Property.NotPublished", "Property is not published.");

    public static Error PropertyNotPublishable =>
        Error.Validation("Application.Property.NotPublishable", "Property cannot be published in current state.");

    public static Error PropertyMissingRequiredData =>
        Error.Validation("Application.Property.MissingRequiredData", "Property missing required data for publish.");

    public static Error DuplicateActiveListing =>
        Error.Conflict("Application.Property.DuplicateActiveListing", "An active listing already exists for this property.");

    public static Error InvalidListingKind =>
        Error.Validation("Application.Property.ListingKind.Invalid", "Invalid listing kind for operation.");

    public static Error TitleRequired =>
        Error.Validation("Application.Property.Title.Required", "Property title is required.");

    public static Error TitleTooShort =>
        Error.Validation("Application.Property.Title.TooShort", "Property title is too short.");

    public static Error TitleTooLong =>
        Error.Validation("Application.Property.Title.TooLong", "Property title is too long.");

    public static Error DescriptionTooLong =>
        Error.Validation("Application.Property.Description.TooLong", "Property description is too long.");

    public static Error PropertyTypeRequired =>
        Error.Validation("Application.Property.PropertyType.Required", "Property type is required.");

    public static Error PropertyTypeNotFound =>
        Error.NotFound("Application.Property.PropertyType.NotFound", "Property type does not exist.");

    // Lifecycle
    public static Error AlreadyArchived =>
        Error.Conflict("Application.Property.AlreadyArchived", "Property is already archived.");

    public static Error PropertyAlreadySold =>
        Error.Conflict("Application.Property.AlreadySold", "Property is already sold.");

    public static Error PropertyAlreadyRented =>
        Error.Conflict("Application.Property.AlreadyRented", "Property is already rented.");

    // Ownership / Agent
    public static Error OwnerRequired =>
        Error.Validation("Application.Property.Owner.Required", "Property owner is required.");

    public static Error AgentRequired =>
        Error.Validation("Application.Property.Agent.Required", "Property agent is required.");

    public static Error NotPropertyOwner =>
        Error.Forbidden("Application.Property.NotOwner", "You must be the owner to perform this action.");

    // Media
    public static Error MediaRequired =>
        Error.Validation("Application.Media.Required", "At least one media item is required.");

    public static Error MediaNotFound =>
        Error.NotFound("Application.Media.NotFound", "Media item not found.");

    public static Error TooManyMediaItems =>
        Error.Validation("Application.Media.TooMany", "Too many media items.");

    public static Error MultiplePrimaryMedia =>
        Error.Validation("Application.Media.MultiplePrimary", "Multiple primary media items are not allowed.");

    public static Error MediaUrlRequired =>
        Error.Validation("Application.Media.Url.Required", "Media URL is required.");

    public static Error MediaInvalidDimensions =>
        Error.Validation("Application.Media.Dimensions.Invalid", "Media dimensions are invalid.");

    // Features
    public static Error FeatureNotFound =>
        Error.NotFound("Application.Feature.NotFound", "Feature does not exist.");

    public static Error FeatureRequired =>
        Error.Validation("Application.Feature.Required", "Feature is required.");

    public static Error DuplicateFeature =>
        Error.Conflict("Application.Feature.Duplicate", "Feature already added to property.");

    public static Error FeatureNameRequired =>
        Error.Validation("Application.Feature.Name.Required", "Feature name is required.");

    // PropertyType
    public static Error PropertyTypeNameRequired =>
        Error.Validation("Application.PropertyType.Name.Required", "Property type name is required.");

    public static Error PropertyTypeDescriptionRequired =>
        Error.Validation("Application.PropertyType.Description.Required", "Property type description is required.");

    // Sale / Rent Terms
    public static Error SalePriceRequired =>
        Error.Validation("Application.SaleTerms.Price.Required", "Sale price is required.");

    public static Error SalePriceInvalid =>
        Error.Validation("Application.SaleTerms.Price.Invalid", "Sale price must be greater than zero.");

    public static Error RentPriceRequired =>
        Error.Validation("Application.RentTerms.Price.Required", "Rent price is required.");

    public static Error RentPriceInvalid =>
        Error.Validation("Application.RentTerms.Price.Invalid", "Rent price must be greater than zero.");

    public static Error ContractDurationInvalid =>
        Error.Validation("Application.RentTerms.ContractDuration.Invalid", "Contract duration must be greater than zero months.");

    public static Error InstallmentPlanRequired =>
        Error.Validation("Application.SaleTerms.InstallmentPlan.Required", "Installment plan is required for installment payments.");

    public static Error InstallmentPlanNotAllowed =>
        Error.Validation("Application.SaleTerms.InstallmentPlan.NotAllowed", "Installment plan is not allowed for this payment method.");

    // Money / Currency
    public static Error MoneyAmountInvalid =>
        Error.Validation("Application.Money.Amount.Invalid", "Amount must be non-negative.");

    public static Error MoneyCurrencyRequired =>
        Error.Validation("Application.Money.Currency.Required", "Currency is required.");

    public static Error CurrencyMismatch =>
        Error.Validation("Application.Money.Currency.Mismatch", "Currency mismatch between monetary values.");

    // Installment plan
    public static Error InstallmentDownPaymentRequired =>
        Error.Validation("Application.InstallmentPlan.DownPayment.Required", "Down payment is required.");

    public static Error InstallmentAmountRequired =>
        Error.Validation("Application.InstallmentPlan.InstallmentAmount.Required", "Installment amount is required.");

    public static Error InstallmentNumberInvalid =>
        Error.Validation("Application.InstallmentPlan.NumberOfInstallments.Invalid", "Number of installments must be greater than zero.");

    public static Error InstallmentNegativeAmount =>
        Error.Validation("Application.InstallmentPlan.InstallmentAmount.Negative", "Installment amount cannot be negative.");

    // Location / Address
    public static Error LocationRequired =>
        Error.Validation("Application.Location.Required", "Location is required.");

    public static Error CoordinatesInvalid =>
        Error.Validation("Application.Location.Coordinates.Invalid", "Coordinates must be valid numbers.");

    public static Error PostalCodeRequired =>
        Error.Validation("Application.Location.PostalCode.Required", "Postal code is required.");

    // Property specs
    public static Error InvalidNumberOfRooms =>
        Error.Validation("Application.Property.NumberOfRooms.Invalid", "Number of rooms must be greater than 0.");

    public static Error InvalidArea =>
        Error.Validation("Application.Property.Area.Invalid", "Area must be greater than 0.");

    public static Error InvalidNumberOfBathrooms =>
        Error.Validation("Application.Property.NumberOfBathrooms.Invalid", "Number of bathrooms must be greater than 0.");

    // DTO / Input validation
    public static Error InvalidRequest =>
        Error.Validation("Application.Request.Invalid", "Invalid request.");

    public static Error MissingPayload =>
        Error.Validation("Application.Request.MissingPayload", "Request payload is missing.");

    // External integrations
    public static Error ExternalServiceUnavailable =>
        Error.Unexpected("Application.External.ServiceUnavailable", "External service unavailable.");

    public static Error StorageFailure =>
        Error.Failure("Application.Storage.Failure", "Failed to store media or files.");
}
