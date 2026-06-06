export const MAX_QUICK_PHOTO_UPLOAD_SIZE_MB = 10;
export const MAX_QUICK_PHOTO_UPLOAD_SIZE_BYTES =
  MAX_QUICK_PHOTO_UPLOAD_SIZE_MB * 1024 * 1024;

export function isPhotoTooLargeForQuickUpload(file: Pick<File, "size">): boolean {
  return file.size > MAX_QUICK_PHOTO_UPLOAD_SIZE_BYTES;
}

export function getPhotoTooLargeMessage(): string {
  return (
    `Ваше фото к сожалению весит больше чем ${MAX_QUICK_PHOTO_UPLOAD_SIZE_MB} mb. ` +
    "Загрузите фото меньше весом, ну или сохраните свое фото сначало в " +
    "каком-либо чате телеграм, и оттуда его заново скачайте, вес сам урежется:)"
  );
}
