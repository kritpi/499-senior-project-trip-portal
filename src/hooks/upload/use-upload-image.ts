import { useMutation } from "@tanstack/react-query";
import { uploadImage } from "@/services/api/upload/upload-image";
import type { UploadImageResponse } from "@/services/api/upload/upload-image";

interface UploadImageParams {
  image: File;
  access_token: string;
}

export const useUploadImage = () => {
  return useMutation<UploadImageResponse, Error, UploadImageParams>({
    mutationFn: ({ image, access_token }) => uploadImage(image, access_token),
  });
};
