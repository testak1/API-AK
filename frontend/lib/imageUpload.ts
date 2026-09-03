const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

const signatures = [
  {type: "image/png", bytes: [0x89, 0x50, 0x4e, 0x47]},
  {type: "image/jpeg", bytes: [0xff, 0xd8, 0xff]},
  {type: "image/gif", bytes: [0x47, 0x49, 0x46, 0x38]},
  {type: "image/webp", bytes: [0x52, 0x49, 0x46, 0x46], tail: "WEBP"},
];

export function decodeImage(imageData: unknown) {
  if (typeof imageData !== "string" || !imageData.length) {
    throw new Error("Missing image data");
  }

  const encoded = imageData.includes(",") ? imageData.split(",", 2)[1] : imageData;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encoded)) {
    throw new Error("Invalid base64 image data");
  }

  const buffer = Buffer.from(encoded, "base64");
  if (!buffer.length || buffer.length > MAX_IMAGE_BYTES) {
    throw new Error("Image must be smaller than 6 MB");
  }

  const match = signatures.find(signature => {
    const prefixMatches = signature.bytes.every((byte, i) => buffer[i] === byte);
    return prefixMatches && (!signature.tail || buffer.subarray(8, 12).toString() === signature.tail);
  });
  if (!match) throw new Error("Unsupported image format");

  return {buffer, contentType: match.type};
}
