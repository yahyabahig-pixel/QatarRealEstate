using BuildingBlocks.Domain.Common.Results.Errors;

namespace BuildingBlocks.Domain.Common.Results;

public interface IResult
{
    bool IsSuccess { get; }
    List<Error>? Errors { get; }
}
