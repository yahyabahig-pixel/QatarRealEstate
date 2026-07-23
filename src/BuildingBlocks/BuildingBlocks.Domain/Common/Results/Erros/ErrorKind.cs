namespace BuildingBlocks.Domain.Common.Results.Errors;


public enum ErrorKind
{
    Failure,
    Unexpected,
    Validation,
    Conflict,
    NotFound,
    Unauthorized,
    Forbidden,
}
