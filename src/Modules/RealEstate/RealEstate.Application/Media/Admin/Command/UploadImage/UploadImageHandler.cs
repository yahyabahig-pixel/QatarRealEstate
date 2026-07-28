using BuildingBlocks.Domain.Common.Results;
using RealEstate.Application.Abstractions.Messaging;
using RealEstate.Application.Abstractions.Persistence;
using RealEstate.Domain.Entities;

namespace RealEstate.Application.Media.Admin.Command.UploadImage;

public sealed class UploadImageHandler : ICommandHandler<UploadImageCommand, Guid>
{
    private readonly IStoredImageRepository _images;
    private readonly IUnitOfWork _unitOfWork;

    public UploadImageHandler(IStoredImageRepository images, IUnitOfWork unitOfWork)
    {
        _images = images;
        _unitOfWork = unitOfWork;
    }

    public async Task<Result<Guid>> Handle(UploadImageCommand request, CancellationToken cancellationToken)
    {
        var image = StoredImage.Create(request.FileName, request.ContentType, request.Content);
        if (image.IsError) return image.TopError;

        await _images.AddAsync(image.Value, cancellationToken);
        await _unitOfWork.SaveChangesAsync(cancellationToken);   // EF generates the id here

        return image.Value.Id;
    }
}
