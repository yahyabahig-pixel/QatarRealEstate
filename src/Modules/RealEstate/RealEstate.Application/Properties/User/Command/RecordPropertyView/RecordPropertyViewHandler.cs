
using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
namespace RealEstate.Application.Properties.User.Command.RecordPropertyView;

public sealed class RecordPropertyViewHandler
    : ICommandHandler<RecordPropertyViewCommand, Updated>
{
    private readonly IPropertyViewRecorder _views;
    public RecordPropertyViewHandler(IPropertyViewRecorder views) => _views = views;

    // Deliberately does NOT load the aggregate. Views are a counter, not an invariant.
    public Task<Result<Updated>> Handle(RecordPropertyViewCommand request, CancellationToken cancellationToken)
        => _views.RecordAsync(request.PropertyId, cancellationToken);
}