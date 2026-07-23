namespace BuildingBlocks.Domain.Common.Results.Abstractions;

public interface IResult<out TValue> : IResult
{
    TValue Value { get; }
}