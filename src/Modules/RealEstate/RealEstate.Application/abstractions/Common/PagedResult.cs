namespace RealEstate.Application.Abstractions.Common;

public sealed record PagedResult<T>(
    IReadOnlyList<T> Items,
    int Page,
    int PageSize,
    int TotalCount)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling(TotalCount / (double)PageSize);
    public bool hasPreviousPage => Page > 1;
    public bool hasNextPage => Page < TotalPages;

    // explicitly signals intent: "this is an empty result"
    public static PagedResult<T> Empty(int page, int pageSize) => new PagedResult<T>(Array.Empty<T>(), page, pageSize, 0);
}