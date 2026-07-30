namespace RealEstate.Domain.Enums;

// Lets some features be a simple yes/no ("Near Church") and others carry a value.
public enum FeatureValueType
{
    Boolean = 0,   // presence only — "has it or not"
    Text = 1,   // e.g. "Floor type" = "Marble"
    Number = 2    // e.g. "Distance to hospital (m)" = "500"
}