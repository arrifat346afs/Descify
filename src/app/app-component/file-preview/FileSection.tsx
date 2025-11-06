type FileSectionProps = {
  file: File | null;
};

export default function FileSection({ file }: FileSectionProps) {
  if (!file) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <p className="text-gray-500 text-center">No file selected.</p>
      </div>
    );
  }
  const url = URL.createObjectURL(file);
  const isImage = file.type.startsWith("image/");
  const isVideo = file.type.startsWith("video/");
  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      {isImage && (
        <img
          src={url}
          alt={file.name}
          className="max-w-full max-h-[90%] object-contain"
        />
      )}
      {isVideo && (
        <video
          src={url}
          className="max-w-full max-h-[90%] object-contain"
          controls
        />
      )}
      <p className="mt-2 text-sm text-gray-600 text-center truncate max-w-full">{file.name}</p>
    </div>
  );
}
