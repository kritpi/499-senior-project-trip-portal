# 🗺️ Trip API Flow — เอกสารอธิบายการทำงานของ Trip APIs

APIs ในกลุ่มนี้เกี่ยวข้องกับการสร้าง / อ่าน Trip ทั้งหมดของ Member และ Trip ที่ระบุ ID

> **Authentication**: ทุก API ในกลุ่มนี้ต้องแนบ `Authorization: Bearer <access_token>` ใน Header

---

## 1. GET /api/v1/trip/ — ดึง Trip ทั้งหมดของ Member

### ภาพรวม

ดึงรายการ Trip ทั้งหมดที่ Member ที่ล็อกอินอยู่เป็นสมาชิก (รวมทั้ง Owner และ Invited)

### 🌐 Frontend (useTrips)

```typescript
// hooks/trip/use-trips.ts
export const useTrips = (access_token: string) => {
  return useQuery({
    queryKey: tripKeys.lists(), // Cache key: ['trips', 'list']
    queryFn: () => getTrips(access_token),
    enabled: !!access_token, // หยุดดึงถ้าไม่มี token
  });
};
```

```typescript
// services/api/trip/get-trips.ts
export const getTrips = async (
  access_token: string,
): Promise<GetTripsResponse> => {
  const { data } = await apiClient.get("/api/v1/trip/", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return GetTripsResSchema.parse(data); // Validate ด้วย Zod
};
```

### ⚙️ Backend Handler

```go
// GetMemberTrips — อ่าน member_id จาก JWT Claims
func (h *restHandler) GetMemberTrips(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

    req := dto.GetMemberTripsRequest{}
    resp, err := h.svc.GetMemberTrips(ctx, *req.ToDomain(jwtClaims.ID))

    return c.Status(fiber.StatusOK).JSON(dto.GetMemberTripsResponse{}.FromDomain(resp))
}
```

### ⚙️ Service Layer

```go
// member-trips-get.go
func (s *service) GetMemberTrips(ctx context.Context, in domain.GetMemberTripsRequest) (*domain.GetMemberTripsResponse, error) {
    trips, err := s.repo.GetMemberTrips(ctx, in)
    // Query: SELECT trips ที่ member_id เป็นส่วนหนึ่งของ trip_members
    return trips, nil
}
```

### Flow

```
Component → useTrips(token) → getTrips() → GET /api/v1/trip/
  → Handler อ่าน member_id จาก JWT
  → Service → repo.GetMemberTrips()
  → ส่งคืน list of trips
```

---

## 2. GET /api/v1/trip/:id — ดึง Trip ด้วย ID

### ภาพรวม

ดึงรายละเอียดของ Trip ตาม ID ที่ระบุ พร้อมตรวจสอบว่า Member ที่ขอข้อมูลเป็นส่วนหนึ่งของ Trip นั้นหรือไม่

### 🌐 Frontend (useGetTripById)

```typescript
// hooks/trip/use-get-trip-by-id.ts
export const useGetTripById = (
  trip_id: number,
  access_token: string,
  options?,
) => {
  return useQuery({
    queryKey: tripKeys.detail(trip_id), // Cache key: ['trips', 'detail', trip_id]
    queryFn: () => getTripById(trip_id, access_token),
    ...options,
  });
};
```

```typescript
// services/api/trip/get-trip-by-id.ts
const { data } = await apiClient.get(`/api/v1/trip/${trip_id}`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
```

### ⚙️ Backend Handler

```go
// GetTripById — รับ trip_id จาก URL param
func (h *restHandler) GetTripById(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

    tripId, _ := strconv.Atoi(c.Params("id"))
    req := domain.GetTripByIdRequest{
        TripId:   tripId,
        MemberId: jwtClaims.ID,
    }

    resp, err := h.svc.GetTripById(ctx, req)
    // err → 403 ถ้าไม่ใช่ member | 404 ถ้า trip ไม่มี

    return c.Status(fiber.StatusOK).JSON(dto.GetTripByIdResponse{}.FromDomain(resp))
}
```

### ⚙️ Service Layer

```go
// trip-get-by-id.go — มี 3 ขั้นตอนหลัก
func (s *service) GetTripById(ctx context.Context, in domain.GetTripByIdRequest) (*domain.GetTripByIdResponse, error) {
    // ขั้นที่ 1: ตรวจสอบว่า member เป็นส่วนหนึ่งของ trip หรือไม่
    isMember, _ := s.repo.CheckTripMembership(ctx, in.TripId, in.MemberId)
    if !isMember {
        return nil, errors.New("forbidden: member not part of this trip")
    }

    // ขั้นที่ 2: ดึงรายละเอียด trip
    trip, _ := s.repo.GetTripById(ctx, in.TripId)
    role, _ := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)

    // ขั้นที่ 3: ดึง trip members ทั้งหมด
    members, _ := s.repo.GetTripMembers(ctx, in.TripId)

    return &domain.GetTripByIdResponse{
        Trip:    trip,
        Role:    *role,
        Members: members,
    }, nil
}
```

### Flow

```
Component → useGetTripById(tripId, token)
  → GET /api/v1/trip/:id
  → Handler parse trip_id จาก URL
  → Service: CheckTripMembership → 403 ถ้าไม่ผ่าน
  → Service: GetTripById + GetTripMemberRole + GetTripMembers
  → ส่งคืน { trip, role, members }
```

---

## 3. PUT /api/v1/trip/ — สร้างหรืออัปเดต Trip (Upsert)

### ภาพรวม

ใช้ HTTP `PUT` สำหรับทั้งการสร้างและอัปเดต Trip โดยตรวจสอบว่า `id` ใน Body มีอยู่หรือไม่ — ถ้าไม่มี `id` → สร้างใหม่ ถ้ามี `id` → อัปเดต

### 🌐 Frontend (useUpsertTrip)

```typescript
// hooks/trip/use-upsert-trip.ts
export const useUpsertTrip = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, access_token }) =>
      upsertTrip(payload, access_token),
    onSuccess: (data) => {
      console.log("Trip id: ", data.trip_id);
      // Invalidate cache เพื่อ reload รายการ trip ใหม่
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
};
```

```typescript
// services/api/trip/upsert-trip.ts — ใช้ HTTP PUT
const { data } = await apiClient.put<UpsertTripResponse>(
  "/api/v1/trip/",
  payload,
  {
    headers: { Authorization: `Bearer ${access_token}` },
  },
);
return UpsertTripResSchema.parse(data);
```

**Request Body (ตัวอย่าง):**

```json
{
  "id": null,
  "title": "Trip to Chiang Mai",
  "description": "Summer trip",
  "thumbnail_url": "https://...",
  "start_date": "2026-04-01",
  "end_date": "2026-04-05"
}
```

> ถ้า `"id": null` → สร้าง Trip ใหม่  
> ถ้า `"id": 42` → อัปเดต Trip ที่มี id = 42

### ⚙️ Backend Handler

```go
// UpsertTrip — อ่าน member_id (เป็น owner) จาก JWT
func (h *restHandler) UpsertTrip(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)
    var req dto.UpsertTripRequest
    c.BodyParser(&req)

    // แปลง request ไปเป็น domain model พร้อมแนบ owner_id
    domainReq := req.ToDomain(jwtClaims.ID)
    resp, err := h.svc.UpsertTrip(ctx, *domainReq)

    return c.Status(fiber.StatusCreated).JSON(dto.UpsertTripResponse{TripId: resp.TripId})
}
```

### ⚙️ Service Layer

```go
// trip-upsert.go
func (s *service) UpsertTrip(ctx context.Context, in domain.UpsertTripRequest) (*domain.UpsertTripResponse, error) {
    // 1. ตรวจสอบว่า owner มีอยู่จริง
    member, _ := s.repo.GetMemberById(ctx, in.OwnerId)

    // 2. ตรวจสอบ start_date ต้องไม่มากกว่า end_date
    if in.EndDate.Before(*in.StartDate) {
        return nil, fmt.Errorf("end date cannot be before start date")
    }

    // 3. กำหนด CreatedAt / UpdatedAt
    if in.ID == nil { in.CreatedAt = now }
    in.UpdatedAt = now

    // 4. ทำ Transaction: Upsert Trip + สร้าง TripMember เป็น OWNER (ถ้าเป็น Trip ใหม่)
    s.repo.Transactional(ctx, func(txCtx context.Context) error {
        resp, _ = s.repo.UpsertTrip(txCtx, in)
        if in.ID == nil { // สร้างใหม่ → เพิ่ม owner เป็น member ด้วย
            s.repo.CreateTripMember(txCtx, domain.CreateTripMemberRequest{
                TripId: resp.TripId, MemberId: member.ID, Role: enum.MemberRoleOwner,
            })
        }
        return nil
    })

    return resp, nil
}
```

### Flow

```
Form Submit → useUpsertTrip() → upsertTrip(payload, token)
  → PUT /api/v1/trip/
  → Handler อ่าน owner_id จาก JWT Claims
  → Service: validate member + validate dates
  → Transaction:
      - UpsertTrip (INSERT หรือ UPDATE)
      - ถ้า Trip ใหม่ → CreateTripMember role=OWNER
  → ส่งคืน { trip_id }
  → onSuccess: invalidate cache → reload Trip list
```

---

## สรุป Trip APIs

| Method | Endpoint           | Hook             | คำอธิบาย                         |
| ------ | ------------------ | ---------------- | -------------------------------- |
| `GET`  | `/api/v1/trip/`    | `useTrips`       | ดึง Trip ทั้งหมดของ member       |
| `GET`  | `/api/v1/trip/:id` | `useGetTripById` | ดึง Trip ตาม ID พร้อมตรวจสิทธิ์  |
| `PUT`  | `/api/v1/trip/`    | `useUpsertTrip`  | สร้าง/อัปเดต Trip ใน Transaction |

---

## 4. Frontend Filter Logic — กรอง Trip แบบ Client-side

### ภาพรวม

หลังจาก `GET /api/v1/trip/` ดึงข้อมูล Trip ทั้งหมดมาแล้ว **ระบบกรองข้อมูลทั้งหมดในฝั่ง Frontend** ด้วย `useMemo` โดยไม่มีการส่ง API ซ้ำ จึงไม่กระทบ Performance ของ Server

> **ข้อสังเกต:** การกรองเกิดขึ้นใน `trips/page.tsx` เท่านั้น — ไม่มี Query Parameter ส่งกลับไปยัง Backend

### State ที่ใช้ควบคุม Filter

```typescript
// app/trips/page.tsx
const [selectedRoles, setSelectedRoles] = useState<RoleFilter[]>([]); // [] = ไม่กรอง
const [dateFilter, setDateFilter] = useState<DateFilter>("All"); // "All" | "Upcoming" | "Past"
const [searchQuery, setSearchQuery] = useState("");
```

### Logic การกรอง (`useMemo`)

```typescript
const filteredTrips = useMemo(() => {
  if (!data?.trips) return [];
  let filtered = data.trips; // เริ่มจาก trips ทั้งหมดที่ได้จาก API

  // ─── 1. กรองตาม Role ───────────────────────────────────────────────
  // selectedRoles: ["owner", "editor", "viewer"] หรือ [] = แสดงทั้งหมด
  if (selectedRoles.length > 0) {
    filtered = filtered.filter((trip) =>
      selectedRoles.includes(trip.role as RoleFilter),
    );
  }

  // ─── 2. กรองตามวันที่ ──────────────────────────────────────────────
  if (dateFilter !== "All") {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // เปรียบเทียบแค่วัน ไม่ใช้เวลา

    filtered = filtered.filter((trip) => {
      const endDate = new Date(trip.end_date);
      endDate.setHours(0, 0, 0, 0);

      if (dateFilter === "Upcoming") {
        return endDate >= today; // ยังไม่สิ้นสุด (รวม Trip ที่กำลังดำเนินอยู่)
      } else if (dateFilter === "Past") {
        return endDate < today; // สิ้นสุดแล้ว
      }
      return true;
    });
  }

  // ─── 3. กรองตาม Search Query ───────────────────────────────────────
  // ค้นหาจากชื่อ Trip หรือ Main Location (case-insensitive)
  if (searchQuery.trim()) {
    const query = searchQuery.toLowerCase();
    filtered = filtered.filter(
      (trip) =>
        trip.trip_name.toLowerCase().includes(query) ||
        trip.main_location.toLowerCase().includes(query),
    );
  }

  return filtered;
}, [data?.trips, selectedRoles, dateFilter, searchQuery]);
```

### Filter Components

```typescript
// components/features/trip-filters.tsx — ถูกเรียกใน page.tsx
<TripFilters
  selectedRoles={selectedRoles}
  onRolesChange={setSelectedRoles}
  dateFilter={dateFilter}
  onDateFilterChange={setDateFilter}
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

| State           | Type           | ค่าที่เป็นได้                           | ผลลัพธ์เมื่อว่าง        |
| --------------- | -------------- | --------------------------------------- | ----------------------- |
| `selectedRoles` | `RoleFilter[]` | `["owner"]`, `["editor","viewer"]`, ... | `[]` = แสดงทุก Role     |
| `dateFilter`    | `DateFilter`   | `"All"`, `"Upcoming"`, `"Past"`         | `"All"` = ไม่กรองวันที่ |
| `searchQuery`   | `string`       | ข้อความใดๆ                              | `""` = ไม่กรอง          |

### ตัวอย่างผลลัพธ์การกรองซ้อนกัน

```
data.trips = [
  { trip_name: "Chiang Mai", role: "owner",  end_date: "2026-05-01" },
  { trip_name: "Bangkok",    role: "viewer", end_date: "2025-12-01" },
  { trip_name: "Phuket",     role: "editor", end_date: "2026-06-01" },
]

selectedRoles = ["owner", "editor"]  → เหลือ Chiang Mai + Phuket
dateFilter    = "Upcoming"           → เหลือ Chiang Mai + Phuket (ทั้งคู่ยังไม่สิ้นสุด)
searchQuery   = "mai"                → เหลือ Chiang Mai เท่านั้น ✓
```

### Flow

```
useTrips(token) → GET /api/v1/trip/ → { trips: [...ทั้งหมด] }
         ↓
    data.trips (raw, จาก Server)
         ↓
    useMemo (re-run ทุกครั้งที่ filter เปลี่ยน)
      ├─ [1] filter by selectedRoles
      ├─ [2] filter by dateFilter (Upcoming / Past)
      └─ [3] filter by searchQuery (trip_name or main_location)
         ↓
  filteredTrips → Render TripCard
```

> **หมายเหตุ:** การนับแสดงผลจะเป็น `X of Y` เมื่อมีการกรอง เช่น `"2 of 5 trips"`
