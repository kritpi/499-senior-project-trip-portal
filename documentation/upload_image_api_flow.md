# 🖼️ Upload Image API Flow — เอกสารอธิบายการอัปโหลดรูปภาพ

API นี้ใช้สำหรับอัปโหลดรูปภาพ (เช่น Thumbnail ของ Trip) ไปยัง **Supabase Storage** และส่งคืน Public URL กลับ

> **Authentication**: ต้องแนบ `Authorization: Bearer <access_token>` ใน Header  
> **Content-Type**: ต้องใช้ `multipart/form-data` (ไม่ใช่ JSON)

---

## POST /api/v1/upload/image — อัปโหลดรูปภาพ

### ภาพรวม

```
[User เลือกไฟล์] → [Frontend] → POST /api/v1/upload/image → [Backend]
  → [Backend อัปโหลดไปยัง Supabase Storage]
  → ส่งคืน { image_url: "https://..." }
```

---

## 🌐 Frontend

### Hook: useUploadImage

```typescript
// hooks/upload/use-upload-image.ts
interface UploadImageParams {
  image: File; // Browser File object
  access_token: string;
}

export const useUploadImage = () => {
  return useMutation<UploadImageResponse, Error, UploadImageParams>({
    mutationFn: ({ image, access_token }) => uploadImage(image, access_token),
  });
};
```

### API Service: uploadImage

```typescript
// services/api/upload/upload-image.ts
export interface UploadImageResponse {
  image_url: string; // Public URL ของรูปที่ถูกอัปโหลด
}

export const uploadImage = async (image: File, access_token: string) => {
  // 1. สร้าง FormData และแนบไฟล์
  const formData = new FormData();
  formData.append("image", image);

  // 2. ส่ง POST request พร้อม multipart/form-data
  const response = await axios.post<UploadImageResponse>(
    "http://localhost:8080/api/v1/upload/image",
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
        Authorization: `Bearer ${access_token}`,
      },
    },
  );

  return response.data; // { image_url: "https://..." }
};
```

### ตัวอย่างการใช้งานในคอมโพเนนต์

```tsx
// ตัวอย่างการใช้งานใน TripForm
const { mutate: upload, isPending } = useUploadImage();

const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  upload(
    { image: file, access_token: token },
    {
      onSuccess: (data) => {
        // บันทึก URL กลับไปที่ form field
        form.setValue("thumbnail_url", data.image_url);
      },
    },
  );
};
```

---

## ⚙️ Backend Handler

```go
// handler-upload-image.go
func (h *restHandler) UploadImage(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

    // 1. อ่านไฟล์จาก multipart form field ชื่อ "image"
    file, err := c.FormFile("image")
    if err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "image file is required",
        })
    }

    // 2. ตรวจสอบว่าเป็น content type ประเภท image/*
    contentType := file.Header.Get("Content-Type")
    if !strings.HasPrefix(contentType, "image/") {
        return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
            "message": "only image files are allowed",
        })
    }

    // 3. ส่งต่อไปยัง Service
    req := domain.UploadImageRequest{
        File:        file,
        ContentType: contentType,
        MemberId:    jwtClaims.ID, // ใช้สร้างชื่อไฟล์ unique
    }
    resp, _ := h.svc.UploadImage(ctx, req)

    return c.Status(fiber.StatusOK).JSON(dto.UploadImageResponse{}.FromDomain(resp))
}
```

---

## ⚙️ Service Layer

Service อ่านไฟล์ แล้วส่งตรงไปยัง Supabase Storage REST API

```go
// image-upload.go
func (s *service) UploadImage(ctx context.Context, in domain.UploadImageRequest) (*domain.UploadImageResponse, error) {
    // 1. เปิดและอ่าน bytes ของไฟล์
    file, _ := in.File.Open()
    defer file.Close()
    fileBytes, _ := io.ReadAll(file)

    // 2. สร้างชื่อไฟล์ unique: {member_id}_{unix_timestamp}.{ext}
    //    เช่น: "uuid-abc_1741234567.jpg"
    timestamp := time.Now().Unix()
    ext := filepath.Ext(in.File.Filename)
    filename := fmt.Sprintf("%s_%d%s", in.MemberId, timestamp, ext)
    filePath := fmt.Sprintf("images/%s", filename)

    // 3. สร้าง HTTP request ไปยัง Supabase Storage API
    uploadEndpoint := fmt.Sprintf("%s/storage/v1/object/%s/%s",
        s.cfg.Storage.Url,     // Supabase Project URL
        s.cfg.Storage.Bucket,  // Bucket name
        filePath,
    )

    req, _ := http.NewRequestWithContext(ctx, http.MethodPost, uploadEndpoint, bytes.NewReader(fileBytes))
    req.Header.Set("Authorization", "Bearer "+s.cfg.Storage.ApiKey) // Supabase Service Key
    req.Header.Set("Content-Type", in.ContentType)
    req.Header.Set("x-upsert", "true") // ถ้ามีไฟล์เดิมให้เขียนทับ

    // 4. ส่งคำขอไปยัง Supabase
    resp, _ := http.DefaultClient.Do(req)

    // 5. สร้าง Public URL (ไม่ต้อง sign)
    publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s",
        s.cfg.Storage.Url,
        s.cfg.Storage.Bucket,
        filePath,
    )

    return &domain.UploadImageResponse{
        FilePath: filePath,
        Url:      publicURL,
    }, nil
}
```

---

## ไดอะแกรมการทำงาน

```
User เลือกไฟล์ภาพ (input[type=file])
│
├─► [Frontend: useUploadImage().mutate({ image, token })]
│     - สร้าง FormData แนบไฟล์
│     - POST /api/v1/upload/image  (multipart/form-data)
│
├─► [Backend Handler]
│     - รับไฟล์จาก FormFile("image")
│     - ตรวจสอบ content-type ต้องขึ้นต้นด้วย "image/"
│
├─► [Backend Service]
│     - อ่าน bytes ของไฟล์
│     - สร้างชื่อไฟล์: {member_id}_{timestamp}.{ext}
│     - POST → Supabase Storage REST API
│       Headers: Authorization: Bearer {SUPABASE_SERVICE_KEY}
│                x-upsert: true
│
├─► [Supabase Storage]
│     - บันทึกไฟล์ไว้ใน bucket
│     - ส่งคืน 200 OK
│
└─► [Backend สร้าง Public URL]
      - URL รูปแบบ: {SUPABASE_URL}/storage/v1/object/public/{BUCKET}/images/...
      - ส่งคืน { image_url: "https://..." } ไปยัง Frontend

[Frontend: onSuccess]
  - form.setValue("thumbnail_url", image_url)
  - แสดง Preview รูปภาพ
```

---

## Validation และ Error Cases

| สถานการณ์              | HTTP Status | ข้อความ                           |
| ---------------------- | ----------- | --------------------------------- |
| ไม่มีไฟล์แนบมา         | `400`       | `image file is required`          |
| ไฟล์ไม่ใช่รูปภาพ       | `400`       | `only image files are allowed`    |
| Supabase Storage Error | `500`       | `upload failed (status): details` |
| ไม่มี Token            | `401`       | Middleware reject ก่อนถึง handler |

---

## สรุป Upload API

| Method | Endpoint               | Hook             | คำอธิบาย                                                |
| ------ | ---------------------- | ---------------- | ------------------------------------------------------- |
| `POST` | `/api/v1/upload/image` | `useUploadImage` | อัปโหลดรูปภาพไปยัง Supabase Storage พร้อมรับ Public URL |
