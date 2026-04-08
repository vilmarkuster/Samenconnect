/** Max size for profile image uploads (matches caregiver/client edit validation). */
export const ZORENTA_AVATAR_MAX_BYTES = 5 * 1024 * 1024;

export function readImageFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result);
      else reject(new Error("Kon afbeelding niet lezen."));
    };
    reader.onerror = () => reject(new Error("Kon afbeelding niet lezen."));
    reader.readAsDataURL(file);
  });
}

/** Returns Dutch error message or null if valid. */
export function validateAvatarImageFile(file: File): string | null {
  if (!file.type.startsWith("image/")) return "Selecteer een geldige afbeelding.";
  if (file.size > ZORENTA_AVATAR_MAX_BYTES) return "Afbeelding is te groot (max 5 MB).";
  return null;
}
