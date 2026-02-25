import axios from "axios";

export interface UploadImageRequest {
  image: File;
}

export interface UploadImageResponse {
  image_url: string;
}

export const uploadImage = async (
  image: File,
  access_token: string
): Promise<UploadImageResponse> => {
  const formData = new FormData();
  formData.append("image", image);

  const response = await axios.post<UploadImageResponse>(
    "http://localhost:8080/api/v1/upload/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${access_token}`,
      },
    }
  );

  return response.data;
};
