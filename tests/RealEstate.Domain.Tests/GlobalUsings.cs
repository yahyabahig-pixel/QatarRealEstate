// xunit 2.x ships no implicit usings of its own — the `dotnet new xunit` template generates
// this file, which is why every test class would otherwise fail with CS0246 on [Fact] and
// CS0103 on Assert.
global using Xunit;
