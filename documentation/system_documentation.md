# 📘 เอกสารระบบ Wanderplan — อธิบายการทำงานรายหน้า

ระบบนี้เป็นแอปพลิเคชันวางแผนการเดินทางแบบ Collaborative โดยมีโครงสร้างหน้าหลัก ดังนี้:

```
/auth                          → หน้า Login
/auth/callback                 → หน้า Google OAuth Callback
/trips                         → หน้าจัดการ Trip ทั้งหมดของ User
/trips/create                  → หน้าสร้าง Trip ใหม่
/trips/[trip_id]               → หน้าตั้งค่า Trip + จัดการสมาชิก
/trips/[trip_id]/activities    → หน้าวางแผนกิจกรรมแบบ Real-time
/trips/[trip_id]/expenses      → หน้าจัดการค่าใช้จ่าย
```

---

## หน้าที่ 1 — การล็อกอินด้วย Google (`/auth`)

### ภาพรวม

หน้าแรกที่ผู้ใช้จะเห็น ประกอบด้วยแผงซ้าย (Branding) และแผงขวา (Sign-in Form) มีปุ่ม "Sign in with Google" เพียงปุ่มเดียว

### ขั้นตอนการทำงาน

```
1. User กดปุ่ม "Sign in with Google"
2. Frontend สร้าง PKCE code_verifier + code_challenge
3. Redirect → https://accounts.google.com/o/oauth2/v2/auth
4. Google แสดง Consent Screen
5. Google Redirect กลับมาที่ /auth/callback?code=...
6. Callback Page ส่ง code ไปยัง Backend
7. Backend แลก id_token กับ Google แล้วสร้าง JWT
8. Frontend เก็บ access_token ลง localStorage
9. Redirect → /trips
```

### Component ที่เกี่ยวข้อง

| ไฟล์                                          | หน้าที่                                          |
| --------------------------------------------- | ------------------------------------------------ |
| `app/auth/page.tsx`                           | หน้า Login หลัก + แสดง error toast จาก URL param |
| `app/auth/callback/page.tsx`                  | รับ OAuth code แล้วเรียก API ยืนยันตัวตน         |
| `components/features/google-login-button.tsx` | ปุ่ม Login + สร้าง PKCE                          |
| `hooks/auth/use-google-login.ts`              | React Query Mutation เรียก Backend               |
| `services/api/auth/google-auth.ts`            | POST `/api/v1/auth/google`                       |

### Frontend Code (สรุป)

```typescript
// 1. ปุ่ม: สร้าง PKCE แล้ว Redirect ไป Google
async function login() {
  const codeVerifier = base64UrlEncode(crypto.getRandomValues(new Uint8Array(32)));
  localStorage.setItem("google_code_verifier", codeVerifier);
  const codeChallenge = base64UrlEncode(await crypto.subtle.digest("SHA-256", encode(codeVerifier)));

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?` + new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: "http://localhost:3000/auth/callback",
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
}

// 2. Callback: ส่ง code ไปยัง Backend
const { mutate: googleLogin } = useGoogleLogin();
useEffect(() => {
  const code    = new URL(window.location.href).searchParams.get("code");
  const verifier = localStorage.getItem("google_code_verifier");
  googleLogin({ code, code_verifier: verifier, redirect_uri: ... }, {
    onSuccess: () => router.push(localStorage.getItem("return_to") || "/trips"),
    onError:   () => router.push("/auth?error=google_auth_failed"),
  });
}, []);
```

### Backend Code (สรุป)

```go
// Handler: handler-google-auth.go
func (h *restHandler) GoogleAuth(c *fiber.Ctx) error {
    var req dto.GoogleAuthRequest  // { code, code_verifier, redirect_uri }
    c.BodyParser(&req)

    // 1. แลก code → id_token กับ Google OAuth Endpoint
    idToken, _ := OutboundExchangeOAuthToken(req.Code, req.CodeVerifier, req.RedirectURI,
        h.cfg.Auth.ClientId, h.cfg.Auth.ClientSecrets)

    // 2. ส่งต่อไปยัง Service
    tokenResp, _ := h.svc.GoogleAuth(ctx, domain.GoogleIdToken{IDToken: idToken})
    return c.JSON(dto.GoogleAuthResponse{AccessToken: tokenResp.AccessToken})
}

// Service: google-auth.go
func (s *service) GoogleAuth(ctx context.Context, idToken domain.GoogleIdToken) (*domain.GoogleAuthResponse, error) {
    // 1. ตรวจสอบ id_token กับ Google Public Keys
    accountPayload, _ := VerifyGoogleIdToken(ctx, idToken.IDToken, s.cfg.Auth.ClientId)

    // 2. ค้นหา member ในฐานข้อมูล
    member, _ := s.repo.GetMemberByEmail(ctx, accountPayload.Email)
    if member == nil {
        // ผู้ใช้ใหม่ → สร้าง record
        s.repo.CreateMember(ctx, domain.Member{
            ID: uuid.New().String(), Name: accountPayload.Name,
            Email: accountPayload.Email, ImageUrl: accountPayload.ImageUrl,
        })
    }

    // 3. สร้าง JWT Token ของระบบ
    token, _ := utils.GenerateToken(*accountPayload, time.Now(), s.cfg)
    return &domain.GoogleAuthResponse{AccessToken: *token}, nil
}
```

---

## หน้าที่ 2 — จัดการ Trip ของ User (`/trips`)

### ภาพรวม

หน้าหลักหลังจาก Login แสดงรายการ Trip ทั้งหมดที่ User เป็นสมาชิก (ทั้งที่เป็น Owner และที่ถูกเชิญ) มี Filter และ Search Bar พร้อมปุ่มสร้าง Trip ใหม่

### ฟีเจอร์หลัก

| ฟีเจอร์              | คำอธิบาย                                                    |
| -------------------- | ----------------------------------------------------------- |
| **Trip Cards**       | แสดงการ์ด trip แต่ละอัน พร้อม thumbnail, ชื่อ, วันที่, role |
| **Create Trip Card** | ปุ่มสร้าง trip ใหม่ นำทางไปยัง `/trips/create`              |
| **Role Filter**      | กรองตาม role: Owner / Editor / Viewer                       |
| **Date Filter**      | กรองตาม Upcoming / Past / All                               |
| **Search**           | ค้นหาจากชื่อ trip หรือ location                             |
| **Profile Popover**  | แสดง Avatar + ชื่อ + Email + ปุ่ม Sign Out                  |

### ขั้นตอนการทำงาน

```
1. Page load → อ่าน access_token จาก localStorage
2. ถ้าไม่มี token → แสดง ErrorCard (401)
3. useTrips(token) → GET /api/v1/trip/
4. ได้รับรายการ trip → กรองด้วย useMemo ตาม Filter ปัจจุบัน
5. Render TripCard แต่ละ trip
```

### Component ที่เกี่ยวข้อง

| ไฟล์                                       | หน้าที่                                  |
| ------------------------------------------ | ---------------------------------------- |
| `app/trips/page.tsx`                       | หน้าหลักพร้อม state สำหรับ filter/search |
| `components/features/trip-card.tsx`        | การ์ดแสดง Trip แต่ละรายการ               |
| `components/features/create-trip-card.tsx` | การ์ดสร้าง Trip ใหม่                     |
| `components/features/trip-filters.tsx`     | UI สำหรับ Search + Role + Date filter    |
| `hooks/trip/use-trips.ts`                  | React Query ดึงรายการ Trip               |

### Frontend + Backend Code (สรุป)

```typescript
// hooks/trip/use-trips.ts
export const useTrips = (access_token: string) =>
  useQuery({
    queryKey: tripKeys.lists(),
    queryFn: () => getTrips(access_token),
    enabled: !!access_token,
  });

// Filter logic ใน page.tsx (client-side, ไม่มี API call เพิ่ม)
const filteredTrips = useMemo(() => {
  let filtered = data.trips;
  if (selectedRoles.length > 0)
    filtered = filtered.filter((t) => selectedRoles.includes(t.role));
  if (dateFilter === "Upcoming")
    filtered = filtered.filter((t) => new Date(t.end_date) >= today);
  if (dateFilter === "Past")
    filtered = filtered.filter((t) => new Date(t.end_date) < today);
  if (searchQuery.trim())
    filtered = filtered.filter(
      (t) =>
        t.trip_name.toLowerCase().includes(query) ||
        t.main_location.toLowerCase().includes(query),
    );
  return filtered;
}, [data?.trips, selectedRoles, dateFilter, searchQuery]);
```

```go
// Backend: GetMemberTrips
func (s *service) GetMemberTrips(ctx context.Context, in domain.GetMemberTripsRequest) (*domain.GetMemberTripsResponse, error) {
    trips, _ := s.repo.GetMemberTrips(ctx, in)
    // SQL: SELECT * FROM trips JOIN trip_members ON ... WHERE trip_members.member_id = ?
    return trips, nil
}
```

### API ที่ใช้

| Method | Endpoint        | คำอธิบาย                   |
| ------ | --------------- | -------------------------- |
| `GET`  | `/api/v1/trip/` | ดึง Trip ทั้งหมดของ member |

---

## หน้าที่ 3 — ตั้งค่า Trip และจัดการสมาชิก (`/trips/[trip_id]` หรือ `/trips/create`)

### ภาพรวม

หน้านี้ใช้ทั้งสร้าง Trip ใหม่ (เมื่อ `trip_id = "create"`) และแก้ไข Trip ที่มีอยู่ แบ่งเป็น 2 ส่วน:

1. **TripForm** — กรอกข้อมูล Trip (ชื่อ, วันที่, สถานที่, รูปภาพ)
2. **TripInvitation** — จัดการสมาชิก (เชิญ / ลบ) โดยแสดงเฉพาะเมื่อ trip มี ID แล้ว

### ขั้นตอนการทำงาน

```
[สร้างใหม่] trip_id = "create"
1. แสดง TripForm ว่างเปล่า
2. User กรอกข้อมูล + อัปโหลดรูป
3. กด "Next Step: Plan Activities"
4. useUpsertTrip → PUT /api/v1/trip/ { id: null, ... }
5. ได้ trip_id ใหม่ → router.push(`/trips/${trip_id}/activities`)

[แก้ไข] trip_id = 42
1. useGetTripById(42, token) → GET /api/v1/trip/42
2. ดึงข้อมูล Trip + สมาชิก + Role ของตัวเอง
3. Pre-fill TripForm ด้วยข้อมูลเดิม
4. แสดง TripInvitation (เชิญ / ลบสมาชิก)
5. กด "Next Step" → บันทึก + ไปหน้า activities
```

### Component ที่เกี่ยวข้อง

| ไฟล์                                  | หน้าที่                           |
| ------------------------------------- | --------------------------------- |
| `app/trips/[trip_id]/page.tsx`        | Logic หลัก: create vs edit mode   |
| `components/trip/TripForm.tsx`        | Form รายละเอียด trip + อัปโหลดรูป |
| `components/trip/TripInvitation.tsx`  | ส่วนจัดการสมาชิก                  |
| `hooks/trip/use-upsert-trip.ts`       | Mutation สร้าง/อัปเดต trip        |
| `hooks/trip/use-get-trip-by-id.ts`    | Query ดึง trip + members + role   |
| `hooks/trip/use-trip-invitation.ts`   | Mutation เชิญสมาชิก               |
| `hooks/trip/use-delete-invitation.ts` | Mutation ลบสมาชิก                 |
| `hooks/upload/use-upload-image.ts`    | Mutation อัปโหลดรูปภาพ            |

### Frontend Code (สรุป)

```typescript
// page.tsx — ตรวจสอบ mode
const isCreateTrip = tripId === "create";
const isEditTrip = typeof tripId === "number" && tripId > 0;

// ดึงข้อมูลเฉพาะตอนแก้ไข
const { data: trip } = useGetTripById(tripId, accessToken, {
  enabled: isEditTrip,
});

// กด "Next Step" → validate → upsert → redirect
const handleNavigateToActivities = async () => {
  const isValid = await tripFormRef.current?.validateForm();
  if (!isValid || !formData) return;
  upsertTrip.mutate(
    { payload: formData, access_token: accessToken },
    {
      onSuccess: (response) =>
        router.push(`/trips/${response.trip_id}/activities`),
    },
  );
};
```

### Backend Code (สรุป)

```go
// Service: trip-upsert.go
func (s *service) UpsertTrip(ctx context.Context, in domain.UpsertTripRequest) (*domain.UpsertTripResponse, error) {
    // ตรวจสอบ member มีอยู่จริง
    member, _ := s.repo.GetMemberById(ctx, in.OwnerId)

    // ตรวจสอบวันที่
    if in.EndDate.Before(*in.StartDate) {
        return nil, fmt.Errorf("end date cannot be before start date")
    }

    // Transaction: Upsert trip + ถ้าใหม่ → เพิ่ม owner as member
    s.repo.Transactional(ctx, func(txCtx context.Context) error {
        resp, _ = s.repo.UpsertTrip(txCtx, in)
        if in.ID == nil { // Trip ใหม่
            s.repo.CreateTripMember(txCtx, domain.CreateTripMemberRequest{
                TripId: resp.TripId, MemberId: member.ID, Role: enum.MemberRoleOwner,
            })
        }
        return nil
    })
    return resp, nil
}

// Service: trip-invitation-2.go (เชิญสมาชิก)
func (s *service) InviteMember(ctx context.Context, in domain.TripInvitationRequest) (*domain.TripInvitationResponse, error) {
    trip, _ := s.repo.GetTripById(ctx, in.TripId)
    if in.MemberId != trip.OwnerId { return nil, errors.New("unauthorized") }

    existedMember, _ := s.repo.CheckExistingMember(ctx, in.Email)
    if existedMember == nil { return nil, errors.New("member is not exists") }

    s.repo.CreateTripMember(ctx, domain.CreateTripMemberRequest{
        TripId: in.TripId, MemberId: existedMember.ID, Role: in.Role,
    })
    return &domain.TripInvitationResponse{Email: existedMember.Email, Role: in.Role}, nil
}
```

### Upload รูปภาพ (Supabase Storage)

```typescript
// Frontend: useUploadImage → uploadImage()
const formData = new FormData();
formData.append("image", imageFile);
const { image_url } = await axios.post("/api/v1/upload/image", formData, {
  headers: {
    "Content-Type": "multipart/form-data",
    Authorization: `Bearer ${token}`,
  },
});
form.setValue("image_url", image_url);
```

```go
// Backend: image-upload.go
func (s *service) UploadImage(ctx context.Context, in domain.UploadImageRequest) (*domain.UploadImageResponse, error) {
    fileBytes, _ := io.ReadAll(file)
    filename := fmt.Sprintf("%s_%d%s", in.MemberId, time.Now().Unix(), ext) // unique filename
    filePath := "images/" + filename

    // POST ตรงไปยัง Supabase Storage REST API
    req, _ := http.NewRequestWithContext(ctx, "POST", supabaseEndpoint, bytes.NewReader(fileBytes))
    req.Header.Set("Authorization", "Bearer "+s.cfg.Storage.ApiKey)
    req.Header.Set("x-upsert", "true")
    http.DefaultClient.Do(req)

    publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", supabaseURL, bucket, filePath)
    return &domain.UploadImageResponse{Url: publicURL}, nil
}
```

### APIs ที่ใช้

| Method   | Endpoint                   | คำอธิบาย                             |
| -------- | -------------------------- | ------------------------------------ |
| `GET`    | `/api/v1/trip/:id`         | ดึง Trip + Members + Role ของตัวเอง  |
| `PUT`    | `/api/v1/trip/`            | สร้าง / อัปเดต Trip (ใน Transaction) |
| `GET`    | `/api/v1/trip/:id/members` | ดึงรายชื่อสมาชิกทั้งหมด              |
| `POST`   | `/api/v1/trip/invitation`  | เชิญสมาชิก (เฉพาะ Owner)             |
| `DELETE` | `/api/v1/trip/invitation`  | ลบสมาชิกออกจาก Trip                  |
| `POST`   | `/api/v1/upload/image`     | อัปโหลดรูปภาพไปยัง Supabase Storage  |

---

## หน้าที่ 4 — วางแผนกิจกรรม Real-time (`/trips/[trip_id]/activities`)

### ภาพรวม

หน้านี้ใช้ **Socket.io** สำหรับการทำงานแบบ Real-time Collaborative — ผู้เล่นหลายคนสามารถแก้ไขกิจกรรมพร้อมกันได้ UI แบ่งเป็น 2 ส่วน:

- **ฝั่งซ้าย** — รายการกิจกรรมแบบ Drag-and-Drop (จัดเรียงลำดับได้)
- **ฝั่งขวา** — แผนที่ Google Maps (คลิกเพื่อเพิ่ม Location)

### ฟีเจอร์หลัก

| ฟีเจอร์            | คำอธิบาย                                                      |
| ------------------ | ------------------------------------------------------------- |
| **Day Tabs**       | แท็บแต่ละวันในทริป (Day 1, Day 2, ...)                        |
| **Drag & Drop**    | จัดเรียงลำดับกิจกรรมโดย @dnd-kit                              |
| **Google Maps**    | คลิก Place บน Map → ดึงรายละเอียดสถานที่ → เพิ่มเป็น Activity |
| **Real-time Sync** | Socket.io broadcast ไปทุก Client ในห้องเดียวกัน               |
| **isEditable**     | Owner/Editor แก้ไขได้, Viewer ดูอย่างเดียว                    |

### ขั้นตอนการทำงาน

```
1. Page load → อ่าน token + tripId จาก params
2. useQuery → GET /api/v1/trip/:id (ดึงวันที่ของ trip)
3. สร้าง Day Tabs จากช่วงวันที่ (eachDayOfInterval)
4. เลือก selectedDate → useActivitySocket เชื่อมต่อ Socket.io

--- Socket.io Flow ---
5. io(socketURL, { query: { token } }) → เชื่อมต่อ + ยืนยันตัวตน
6. socket.emit("activity:join", { trip_id, trip_date }) → เข้า "ห้อง"
7. socket.on("activity:join", response) → รับ activities + isEditable
8. User แก้ไข/เพิ่ม/ลบ/จัดเรียง Activity
9. upsertActivities(updatedList) → socket.emit("activity:upsert", payload)
10. Server บันทึก + Broadcast → socket.on("activity:broadcast") ทุก Client อัปเดต
```

### Component ที่เกี่ยวข้อง

| ไฟล์                                             | หน้าที่                               |
| ------------------------------------------------ | ------------------------------------- |
| `app/trips/[trip_id]/activities/page.tsx`        | หน้าหลัก, จัดการ state ทั้งหมด        |
| `hooks/use-activity-socket.ts`                   | ควบคุม Socket.io connection lifecycle |
| `components/features/editable-activity-card.tsx` | การ์ดกิจกรรมพร้อมแก้ไข                |
| `components/features/activity-map.tsx`           | Google Maps component                 |
| `components/features/place-details.tsx`          | Overlay แสดงรายละเอียดสถานที่ที่เลือก |

### Frontend Code (สรุป)

```typescript
// hooks/use-activity-socket.ts
const socket = io(socketUrl, {
  path: "/socket.io/",
  transports: ["websocket", "polling"],
  query: { token }, // Backend ตรวจสอบ JWT ที่นี่
});

socket.on("connect", () => {
  socket.emit("activity:join", { trip_id: tripId, trip_date: selectedDate });
});

socket.on("activity:join", (response) => {
  setActivities(response.activities);
  setIsEditable(response.is_editable); // ตรวจสอบว่าแก้ไขได้หรือไม่
});

socket.on("activity:broadcast", (data) => {
  if (data.trip_id === tripId && data.date === selectedDate) {
    setActivities(data.activities); // อัปเดตจาก user อื่น
  }
});

// ส่งการเปลี่ยนแปลงไปยัง Server
const upsertActivities = (updatedActivities) => {
  socket.emit("activity:upsert", {
    trip_id,
    date,
    activities: updatedActivities,
  });
};

// cleanup เมื่อออกจากหน้า
return () => {
  socket.emit("activity:leave", { trip_id, trip_date });
  socket.disconnect();
};
```

```typescript
// page.tsx — เพิ่ม Place จาก Map
const handleAddPlace = () => {
  const newActivity: Activity = {
    id: "",
    start_time: "09:00",
    end_time: "10:00",
    activity_location: {
      name: selectedPlace.name,
      address: selectedPlace.formatted_address,
      lat: selectedPlace.geometry.location.lat(),
      lng: selectedPlace.geometry.location.lng(),
    },
    rank: activities.length + 1,
  };
  upsertActivities([...activities, newActivity]); // ส่ง Socket ทันที
};

// Drag & Drop (dnd-kit)
const handleDragEnd = (event: DragEndEvent) => {
  const reordered = arrayMove(activities, oldIndex, newIndex).map((act, i) => ({
    ...act,
    rank: i + 1,
  }));
  upsertActivities(reordered); // ส่ง Socket ทันที
};
```

### Backend Socket Code (สรุป)

```go
// server.go — ยืนยันตัวตนทุก Connection
server.OnConnect("/", func(c socketio.Conn) error {
    token := c.URL().Query().Get("token")
    claims, err := utils.AuthenticateFromHeader("Bearer "+token, cfg)
    if err != nil { return err } // ตัดการเชื่อมต่อทันที

    c.SetContext(&dto.SocketContext{MemberId: claims.ID})
    return nil
})
```

```go
// socket-activity-join.go — เข้าห้องและส่ง activities
func (h *socketHandler) ActivityJoin(conn socketio.Conn, payload dto.ActivityJoinPayload) {
    socketCtx := conn.Context().(*dto.SocketContext)

    activities, isEditable, _ := h.svc.ActivityJoin(ctx, service.ActivityJoinRequest{
        TripId:   payload.TripId,
        TripDate: payload.TripDate,
        MemberId: socketCtx.MemberId,
    })

    room := fmt.Sprintf("trip_%d_%s", payload.TripId, payload.TripDate)
    conn.Join(room)

    conn.Emit("activity:join", dto.ActivityJoinResponse{
        Activities: activities,
        IsEditable: isEditable,
    })
}
```

```go
// activity-upsert-broadcast.go — บันทึก + กระจายให้ทุก Client
func (h *socketHandler) ActivityUpsert(conn socketio.Conn, payload dto.ActivityUpsertPayload) {
    // บันทึกลง DB
    h.svc.UpsertActivities(ctx, payload)

    // Broadcast ไปยังทุก Client ในห้องเดียวกัน
    room := fmt.Sprintf("trip_%d_%s", payload.TripId, payload.TripDate)
    h.server.BroadcastToRoom("/", room, "activity:broadcast", dto.ActivityBroadcastResponse{
        TripId:     payload.TripId,
        Date:       payload.TripDate,
        Activities: payload.Activities,
        IsEditable: true,
    })
}
```

### Socket Events

| Event                | ทิศทาง          | คำอธิบาย                             |
| -------------------- | --------------- | ------------------------------------ |
| `activity:join`      | Client → Server | ขอเข้าห้อง trip_date                 |
| `activity:join`      | Server → Client | ส่ง activities + isEditable กลับ     |
| `activity:upsert`    | Client → Server | ส่งการเปลี่ยนแปลง activities         |
| `activity:broadcast` | Server → Client | แจ้งทุก Client ให้ reload activities |
| `activity:leave`     | Client → Server | ออกจากห้อง                           |

---

## หน้าที่ 5 — จัดการค่าใช้จ่าย (`/trips/[trip_id]/expenses`)

### ภาพรวม

หน้าจัดการค่าใช้จ่ายทั้งหมดของ Trip แสดงยอดรวมทั้ง Trip และยอดของตัวเองแยกกัน พร้อม Tab กรองระหว่าง "All Expenses" และ "My Expenses"

### ฟีเจอร์หลัก

| ฟีเจอร์                 | คำอธิบาย                                                  |
| ----------------------- | --------------------------------------------------------- |
| **Trip Total**          | ยอดรวมทั้ง Trip + ค่าเฉลี่ยต่อวัน                         |
| **My Total**            | ยอดที่ตนเองต้องจ่ายรวม + ค่าเฉลี่ย                        |
| **All / My Tab**        | สลับมุมมองระหว่าง Expense ทั้งหมด / เฉพาะที่ฉันเกี่ยวข้อง |
| **ExpenseList**         | รายการ Expense แต่ละรายการ พร้อมปุ่มแก้ไขและลบ            |
| **UpsertExpenseDialog** | Dialog สำหรับสร้าง/แก้ไข Expense + เลือกการหาร            |
| **Split Types**         | `all_equal` / `selected_equal` / `custom`                 |

### ขั้นตอนการทำงาน

```
1. Page load → อ่าน token + tripId
2. useGetTripExpenses(tripId, token) → GET /api/v1/trip/:id/expense
3. ได้รับ { expenses, total_amount, avg_per_day, my_total_amount, ... }
4. Render TotalExpenseAmount (2 Cards) + ExpenseList

[สร้าง Expense]
5. กด "Add New Expense" → เปิด UpsertExpenseDialog
6. กรอก Title, Amount, SplitType, Participants
7. useUpdateExpense → PUT /api/v1/trip/:id/expense
8. onSuccess → invalidateQueries → refetch รายการ

[แก้ไข Expense]
5. กดที่ ExpenseCard → เปิด Dialog พร้อม pre-fill ข้อมูล
6. แก้ไขแล้ว Submit → PUT /api/v1/trip/:id/expense { expense_id: "uuid" }

[ลบ Expense]
5. กดปุ่มลบใน ExpenseCard
6. deleteExpense(tripId, { expense_id }, token) → DELETE /api/v1/trip/:id/expense
7. invalidateQueries → refetch
```

### Component ที่เกี่ยวข้อง

| ไฟล์                                           | หน้าที่                          |
| ---------------------------------------------- | -------------------------------- |
| `app/trips/[trip_id]/expenses/page.tsx`        | หน้าหลัก + state management      |
| `components/expense/expense-list.tsx`          | Component รายการ Expense         |
| `components/expense/upsert-expense-dialog.tsx` | Dialog สร้าง/แก้ไข Expense       |
| `components/expense/total-amount-card.tsx`     | Card แสดงยอดรวม                  |
| `hooks/expenses/use-get-trip-expenses.ts`      | Query ดึง Expenses               |
| `hooks/expenses/use-update-expense.ts`         | Mutation สร้าง/แก้ไข Expense     |
| `services/api/expenses/delete-expense.ts`      | DELETE Expense (เรียกตรงใน page) |

### Frontend Code (สรุป)

```typescript
// page.tsx
const { data: tripExpenses } = useGetTripExpenses(tripId, accessToken);
// tripExpenses = { expenses, total_amount, avg_per_day, my_total_amount, my_avg_per_day }

// Filter "My Expenses"
.filter(exp => selectedTab === "myExpenses" ? exp.my_shared > 0 : true)

// ลบ Expense โดยตรง (ไม่ผ่าน hook)
await deleteExpense(tripId, { expense_id: exp.expense_id }, accessToken);
queryClient.invalidateQueries({ queryKey: expenseKeys.expensesByTrip(tripId) });
```

```typescript
// hooks/expenses/use-update-expense.ts
return useMutation({
  mutationFn: ({ trip_id, body, access_token }) =>
    updateExpense(trip_id, body, access_token),
  onSuccess: (_, { trip_id }) =>
    queryClient.invalidateQueries({
      queryKey: expenseKeys.expensesByTrip(trip_id),
    }),
});
```

### Backend Code (สรุป)

```go
// Service: expense-upsert.go
func (s *service) UpsertExpense(ctx context.Context, in domain.UpsertExpenseRequest) error {
    // กำหนด UUID ถ้า Expense ใหม่
    if in.ExpenseId == "" { in.ExpenseId = uuid.New().String() }

    members, _ := s.repo.GetTripMembers(ctx, in.TripId)

    // คำนวณการหาร
    switch in.SplitType {
    case enum.ExpenseAllEqual:
        equalSplit := in.Amount.Div(decimal.NewFromInt(int64(len(members))))
        for _, m := range members {
            expenseMemberSplit = append(expenseMemberSplit,
                domain.ExpenseMember{MemberId: m.MemberId, Amount: &equalSplit})
        }
    case enum.ExpenseSelectedEqual:
        equalSplit := in.Amount.Div(decimal.NewFromInt(int64(len(in.Participant))))
        // หารให้เฉพาะคนที่เลือก
    case enum.ExpenseCustom:
        expenseMemberSplit = in.Participant // ใช้ค่าที่กำหนดมา
    }

    s.repo.UpsertExpense(ctx, in)

    // Transaction: ลบ member split เก่า → insert ใหม่
    s.repo.Transactional(ctx, func(txCtx context.Context) error {
        s.repo.DeleteExpenseMember(txCtx, in.ExpenseId)
        s.repo.BatchInsertExpenseMember(txCtx, domain.ExpenseMemberRequest{...})
        return nil
    })
    return nil
}

// Service: delete-trip-expense.go
func (s *service) DeleteExpense(ctx context.Context, in domain.DeleteTripExpenseRequest) error {
    role, _ := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)
    if *role == enum.MemberRoleViewer {
        return errors.New("insufficient permissions") // Viewer ลบไม่ได้
    }

    return s.repo.Transactional(ctx, func(txCtx context.Context) error {
        s.repo.DeleteExpenseMember(txCtx, in.ExpenseId) // ลบ FK ก่อน
        s.repo.DeleteExpense(txCtx, in.ExpenseId)
        return nil
    })
}
```

### APIs ที่ใช้

| Method   | Endpoint                   | คำอธิบาย                             |
| -------- | -------------------------- | ------------------------------------ |
| `GET`    | `/api/v1/trip/:id/expense` | ดึง Expenses พร้อม total + my_total  |
| `PUT`    | `/api/v1/trip/:id/expense` | สร้าง / อัปเดต Expense + Split Logic |
| `DELETE` | `/api/v1/trip/:id/expense` | ลบ Expense (Owner/Editor เท่านั้น)   |

---

## สรุปภาพรวมระบบ

```
/auth ──────────────────────────────────────────────────────────
  Google OAuth PKCE
    → POST /api/v1/auth/google { code, code_verifier }
    → Backend แลก id_token → Verify → GetMember / CreateMember → JWT
    → localStorage.access_token

/trips ─────────────────────────────────────────────────────────
  GET /api/v1/trip/
    → รายการ Trip ทั้งหมดที่เป็นสมาชิก
    → Filter/Search ฝั่ง Client

/trips/create หรือ /trips/:id ──────────────────────────────────
  GET /api/v1/trip/:id       → Trip info + members + role
  PUT /api/v1/trip/          → Create / Update Trip (Transaction)
  POST /api/v1/upload/image  → Upload thumbnail → Supabase Storage
  POST /api/v1/trip/invitation   → เชิญสมาชิก (Owner เท่านั้น)
  DELETE /api/v1/trip/invitation → ลบสมาชิก

/trips/:id/activities ──────────────────────────────────────────
  GET /api/v1/trip/:id            → ดึงวันที่ trip
  Socket.io: activity:join        → เข้า Room + รับ Activities
  Socket.io: activity:upsert      → ส่งการเปลี่ยนแปลง
  Socket.io: activity:broadcast   → รับ Update จาก User อื่น

/trips/:id/expenses ────────────────────────────────────────────
  GET /api/v1/trip/:id/expense   → Expenses + ยอดรวม
  PUT /api/v1/trip/:id/expense   → สร้าง/แก้ไข + Split Calculation
  DELETE /api/v1/trip/:id/expense → ลบ (เฉพาะ Owner/Editor)
```
