namespace BuildingBlocks.Authorization;

// ---------------------------------------------------------------------------------------------
//  THE permission catalog. A permission is a string constant — not a table row.
//
//  Adding a permission = add a constant here + put [HasPermission(...)] on an endpoint.
//  No schema change, no migration, no new policy registration (PermissionPolicyProvider
//  builds policies dynamically). Positions store these strings; assignment validates
//  against Catalog so a typo can never be granted.
// ---------------------------------------------------------------------------------------------
public static class AppPermissions
{
    public static class Property
    {
        public const string Read    = "Property.Read";
        public const string Create  = "Property.Create";
        public const string Update  = "Property.Update";
        public const string Delete  = "Property.Delete";
        public const string Publish = "Property.Publish";
    }

    public static class Agent
    {
        public const string Read   = "Agent.Read";
        public const string Create = "Agent.Create";
        public const string Update = "Agent.Update";
        public const string Delete = "Agent.Delete";
    }

    public static class User
    {
        public const string Read   = "User.Read";
        public const string Update = "User.Update";
        public const string Delete = "User.Delete";
    }

    public static class Admin
    {
        public const string Read           = "Admin.Read";
        public const string Create         = "Admin.Create";
        public const string Update         = "Admin.Update";
        public const string Delete         = "Admin.Delete";
        public const string AssignPosition = "Admin.AssignPosition";
    }

    public static class Position
    {
        public const string Read   = "Position.Read";
        public const string Create = "Position.Create";
        public const string Update = "Position.Update";
        public const string Delete = "Position.Delete";
    }

    public static class Permission
    {
        public const string Read   = "Permission.Read";
        public const string Assign = "Permission.Assign";
    }

    /// <summary>Every valid permission name. Position assignment validates against this.</summary>
    public static readonly IReadOnlyList<string> Catalog =
    [
        Property.Read, Property.Create, Property.Update, Property.Delete, Property.Publish,
        Agent.Read, Agent.Create, Agent.Update, Agent.Delete,
        User.Read, User.Update, User.Delete,
        Admin.Read, Admin.Create, Admin.Update, Admin.Delete, Admin.AssignPosition,
        Position.Read, Position.Create, Position.Update, Position.Delete,
        Permission.Read, Permission.Assign,
    ];

    public static bool IsValid(string permission) =>
        Catalog.Contains(permission, StringComparer.Ordinal);
}
