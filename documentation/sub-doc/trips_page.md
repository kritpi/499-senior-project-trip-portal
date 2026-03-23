# /trips Page Documentation

## 1. Page Overview

- **Purpose**: หน้า Dashboard หลักที่ใช้สำหรับแสดงรายการทริปทั้งหมดที่ผู้ใช้มีส่วนร่วม (Member)
- **User Actions**:
  - ดูรายการทริปทั้งหมดที่เข้าร่วม
  - กรอง (Filter) ทริปตามบทบาท (Role: Owner, Editor, Viewer) หรือช่วงเวลา (Date: Upcoming, Past)
  - ค้นหาทริปจากชื่อหรือสถานที่หลัก (Search query)
  - สร้างทริปใหม่ผ่านปุ่ม `CreateTripCard`
  - ดูข้อมูลโปรไฟล์เบื้องต้นและออกจากระบบ (Logout) ผ่านทาง Profile Popover
- **Main Components**:
  - `TripCard`: แสดงข้อมูลทริปแต่ละรายการ
  - `CreateTripCard`: การ์ดสำหรับกดสร้างทริปใหม่
  - `TripFilters`: ส่วนเครื่องมือกรองทริปและค้นหาข้อมูล
  - `ErrorCard` / `ProgressLoading`: สำหรับจัดการสถานะการดึงข้อมูล

## 2. Page Logic Flow

1. **Initial Page Load**:
   - เมื่อหน้าเพจโหลด จะทำการอ่าน `access_token` จาก `localStorage` ฝั่ง Client-side เท่านั้น
   - ทำการ Decode JWT เพื่อนำข้อมูลโปรไฟล์พื้นฐาน (Name, Email, Picture) มาแสดงผล
2. **Data Fetching**:
   - เรียกใช้ custom hook `useTrips(accessToken)` จาก React Query เพื่อไปดึงข้อมูลทริปจาก API
   - ในขณะรอข้อมูล จะแสดง `<ProgressLoading />`
3. **Filtering and Search**:
   - ข้อมูลทริปที่ได้จะถูกประมวลผลผ่าน `useMemo` เพื่อกรองข้อมูลตาม `selectedRoles`, `dateFilter`, และ `searchQuery` แบบเรียลไทม์บนฝั่ง Frontend
4. **UI Updates**:
   - ถ้าไม่มีข้อมูลทริปที่ตรงกับฟิลเตอร์เลย จะแสดงข้อความแนะนํา "No trips found"
   - ถ้ายอดทริปมีค่ามากกว่า 0 จะโยนข้อมูลเข้าไปทำการ Render เป็นลิสต์ของ `<TripCard />`

## 3. Frontend Rendering

### Component: TripsPage (Main Rendering Logic)

```tsx
<div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-6">
  <CreateTripCard />
  {filteredTrips.map((trip) => (
    <TripCard key={trip.trip_id} trip={trip} />
  ))}
</div>
```

**Explanation (Thai):**
ส่วนหลักในการ Render รายการทริป โดยจะมีการวนลูป (map) ตัวแปร `filteredTrips` เพื่อสร้าง `TripCard` สำหรับแต่ละทริป และจะวาง `CreateTripCard` ไว้ที่ช่องซ้ายบนสุดเสมอ

### Component: TripFilters

```tsx
<TripFilters
  selectedRoles={selectedRoles}
  onRolesChange={setSelectedRoles}
  dateFilter={dateFilter}
  onDateFilterChange={setDateFilter}
  searchQuery={searchQuery}
  onSearchChange={setSearchQuery}
/>
```

**Explanation (Thai):**
คอมโพเนนต์สำหรับรับ Input การกรองข้อมูล ค้นหา และช่วงวันที่ โดยรับ Props ที่เป็น State และ Setter เพื่อส่งข้อมูลกลับมาให้ตัว `useMemo` นำไปคำนวณปรับปรุงลิสต์การแสดงผลใหม่

## 4. Frontend API Calling Logic

### Fetch Member Trips

```tsx
// src/services/api/trip/get-trips.ts
export const getTrips = async (
  access_token: string,
): Promise<GetTripsResponse> => {
  const { data } = await apiClient.get<GetTripsResponse>("/api/v1/trip/", {
    headers: { Authorization: `Bearer ${access_token}` },
  });
  return GetTripsResSchema.parse(data);
};
```

**Explanation (Thai):**

- **Trigger**: เรียกอัตโนมัติเมื่อหน้าเพจถูกโหลดและมี `access_token` พร้อม (ผ่าน `useQuery` ใน `useTrips` hook)
- **Functionality**: เรียกไปยัง Backend API (`GET /api/v1/trip/`) เพื่อดึงข้อมูลทริปทั้งหมดของ Member ข้อมูลที่ได้จะถูก Validate schema ว่าถูกต้องก่อนใช้งานจริง
- **UI Update**: ข้อมูลใหม่จะถูกส่งเข้าตัวแปร `data.trips` จากนั้นระบบจะเข้ากระบวนการกรองข้อมูล และทำการ Render แสดงผลการ์ดทริปบนหน้าจอ

## 5. Backend API Logic

API ที่ใช้งาน: `GET /api/v1/trip/` (ใช้สำหรับการดึงรายการทริปของ Member)

### 1. Handler Layer

```go
func (h *restHandler) GetMemberTrips(c *fiber.Ctx) error {
	ctx := c.Context()
	jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

	req := dto.GetMemberTripsRequest{}
	resp, err := h.svc.GetMemberTrips(ctx, *req.ToDomain(jwtClaims.ID))
	// ... error handling
	return c.Status(fiber.StatusOK).JSON(dto.GetMemberTripsResponse{}.FromDomain(resp))
}
```

**Explanation (Thai):**
รับ Request เข้ามา ดึงข้อมูล JWT จาก context (ผ่าน Middleware) เพื่อเอา `ID` ของ User ส่งเป็น Parameter ส่งต่อไปยัง Service layer แล้วคืนค่า response กลับเป็น JSON

### 2. Business Logic Layer (Service)

```go
func (s *service) GetMemberTrips(ctx context.Context, in domain.GetMemberTripsRequest) (*domain.GetMemberTripsResponse, error) {
	trips, err := s.repo.GetMemberTrips(ctx, in)
	if err != nil {
		log.Errorf("unable to get trips from this member: %s, error: %+v", in.MemberId, err)
		return nil, err
	}
	if trips == nil {
		return nil, nil // Return empty safe fallback
	}
	return trips, nil
}
```

**Explanation (Thai):**
ส่วนหลักในการจัดการ Logic สำหรับ API นี้ทำหน้าที่เป็นตัวกลางในการส่งค่าคำขอไปยัง Repository Layer และจัดการ Error Logging กรณีเกิดข้อผิดพลาดในการดึงข้อมูล ถ้าไม่พบก็จะคืนค่าเป็น nil ให้รองรับใน Handler

### 3. Database Layer (Repository)

```go
queryString := fmt.Sprintf(`
    SELECT
        t.id,
        t.trip_name,
        t.start_date,
        t.end_date,
        t.main_location,
        t.image_url,
        tm.member_role
    FROM %s t
    INNER JOIN %s tm
        ON tm.trip_id = t.id
    WHERE tm.member_id = @member_id
    ORDER BY t.start_date ASC;
`, r.cfg.Table.TripTable, r.cfg.Table.TripMembersTable)
```

**Explanation (Thai):**
ทำการ JOIN Table ระหว่างตารางขัอมูลทริป (Trip) และตารางสมาชิก (TripMembers) โดยอิงตาม Member ID ดึงเอาข้อมูลพื้นฐานของทริปที่ต้องโชว์บน Dashboard จัดเรียงตามวันที่เริ่มทริปน้อยสุดขึ้นก่อน (ASC)

## 6. Data Flow Summary

User Action (Initial Load) → Frontend Component (`TripsPage`) → API Call (`useTrips` -> `GET /api/v1/trip/`) → Backend Handler (`GetMemberTrips`) → Business Logic (`GetMemberTrips`) → Database Query (`INNER JOIN Trip and TripMembers`) → Response → UI Update (แสดงตารางทริปบนหน้า Dashboard หรือสถานะโหลด/ข้อผิดพลาด)
