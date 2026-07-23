namespace RealEstate.Domain.ValueObjects;

public sealed record PropertySpecs
{
    public int NumberOfRooms { get; init; }
    public decimal AreaInSquareMeters { get; init; }
    public int Bathrooms { get; init; }
}