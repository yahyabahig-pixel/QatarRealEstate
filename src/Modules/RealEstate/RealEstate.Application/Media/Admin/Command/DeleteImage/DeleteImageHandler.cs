using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.DomainErros;

namespace RealEstate.Application.Media.Admin.Command.DeleteImage;

// Hard delete. Note: nothing prevents deleting an image that a property's Media.Url or an
// agent's PhotoUrl still points at — those store plain URL strings, not foreign keys. The
// admin panel should remove the reference first; a dangling URL just 404s on the site.
public sealed class DeleteImageHandler : ICommandHandler<DeleteImageCommand, Deleted>
{
    private readonly IStoredImageRepository _images;
    private readonly IUnitOfWork _unitOfWork;

    public DeleteImageHandler(IStoredImageRepository images, IUnitOfWork unitOfWork)
    {
        _images = images;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Deleted>> Handle(DeleteImageCommand request, CancellationToken cancellationToken)
    {
        var image = await _images.GetByIdAsync(request.Id, cancellationToken);
        if (image is null) return StoredImageErrors.NotFound;

        _images.Remove(image);
        await _unitOfWork.SaveChangesAsync(cancellationToken);
        return Result.Deleted;
    }
}
