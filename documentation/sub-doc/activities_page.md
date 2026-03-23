# /trips/[trip_id]/activities Page Documentation

## 1. Page Overview

- **Purpose**: หน้าสำหรับวางแผนและจัดการกิจกรรมในแต่ละวันของทริป (Itinerary Planning) แบบ Real-time Collaboration รองรับการทำงานร่วมกันหลายคน
- **User Actions**:
  - ดูปฏิทินและเลือกวัน (Day Tabs)
  - ค้นหาและปักหมุดสถานที่จาก Google Maps
  - จัดเรียงลำดับกิจกรรมด้วยการ Drag-and-Drop
  - แก้ไขเวลา เริ่มต้น-สิ้นสุด, ระยะเวลาเดินทาง (ETA), และ Note สำหรับแต่ละกิจกรรม
- **Main Components**:
  - `EditableActivityCard`: การ์ดแสดงกิจกรรมแต่ละรายการ (รองรับ Drag-and-Drop ผ่าน `@dnd-kit`)
  - `ActivityMap`: แสดงแผนที่ Google Maps, เส้นทาง (Directions), และปักหมุด (Markers)
  - `PlaceDetails`: Pop-up ข้อมูลสถานที่เมื่อคลิกเลือกจากแผนที่

## 2. Page Logic Flow

1. **Initial Load & Trip Details**:
   - ดึงรายละเอียดทริปผ่าน `useQuery(tripKeys.detail(tripId))` เพื่อเช็คช่วงวัน (Start-End Date)
   - ระบบจะสร้าง Day Tabs จากวันที่เหล่านั้น และเลือกวันแรกเป็นค่าเริ่มต้น (`selectedDate`)
2. **Real-time Socket Connection**:
   - เรียกใช้ custom hook `useActivitySocket` ซึ่งจะเชื่อมต่อไปยัง Backend โดยอัตโนมัติตาม `tripId` และ `selectedDate` ปัจจุบัน
3. **Map Interaction**:
   - ผู้ใช้สามารถคลิกพื้นที่บนแผนที่ หรือค้นหาข้อมูลสถานที่ (Google Places APIs)
   - เมื่อกดเลือกสถานที่จะแสดง `PlaceDetails` ผู้ใช้สามารถกดเพิ่มเข้าสู่แผงด้านซ้ายได้ผ่านฟังก์ชัน `handleAddPlace`
4. **Drag & Drop and Updates**:
   - เมื่อผู้ใช้อัปเดตข้อมูลสถานที่ เลื่อนจัดเรียง หรือลบออก ระบบจะเรียกฟังก์ชัน `upsertActivities` ซึ่งจะกระจายข้อมูลทั้งหมดผ่าน Socket.IO ทันทีเพื่อให้ผู้ใช้คนอื่นในห้องเห็นการเปลี่ยนแปลง (Real-time sync)

## 3. Frontend Rendering

### Component: Activities List with Drag-and-Drop (DnD)

```tsx
<DndContext
  sensors={sensors}
  collisionDetection={closestCenter}
  onDragEnd={handleDragEnd}
>
  <SortableContext
    items={activities.map((a) => a.id)}
    strategy={verticalListSortingStrategy}
  >
    {activities.map((activity, index) => (
      <EditableActivityCard
        key={activity.id}
        activity={activity}
        index={index}
        onRemove={handleRemoveActivity}
        onChange={handleActivityChange}
        etaText={index > 0 ? etas[index - 1] : undefined}
        isEditable={isEditable}
      />
    ))}
  </SortableContext>
</DndContext>
```

**Explanation (Thai):**
ใช้ชุดคำสั่งจาก `@dnd-kit` ควบคุมกระบวนการเรียงลำดับ List กิจกรรมใหม่ เมื่อการสลับตำแหน่งเสร็จสิ้น (DragEnd) จะทำการคำนวณ `rank` แต่ละไอเท็มใหม่ และสั่ง `upsertActivities` ส่งข้อมูลที่จัดเรียงแล้วไปยัง Backend

### Component: ActivityMap

```tsx
<ActivityMap
  locations={locations}
  onMapClick={onMapClick}
  directions={directions}
  setDirections={setDirections}
  mapCenter={mapCenter}
  onMapLoad={onMapLoad}
  selectedPlace={selectedPlace}
  onPlaceSelect={(place) => setSelectedPlace(place)}
/>
```

**Explanation (Thai):**
จัดการส่วน Google Maps Rendering ข้อมูล `locations` ถูกแปลงมาจาก Activities ปัจจุบันเพื่อสร้าง Markers นอกจากนี้ ยังจัดการการวาดเส้นประ (Directions) ระหว่างสถานที่หากมีมากกว่า 1 สถานที่

## 4. Frontend API Calling Logic (WebSocket)

หน้านี้ใช้ **Socket.IO** แทน REST API สำหรับการจัดการข้อมูลที่ต้องการความรวดเร็ว

### 1. Join Room (Initial Fetch)

```ts
// src/hooks/use-activity-socket.ts
socket.emit("activity:join", { trip_id: tripId, trip_date: tripDate });

socket.on("activity:join", (response: ActivityJoinResponse) => {
  setActivities(response.activities);
  setIsEditable(response.is_editable);
});
```

**Explanation (Thai):**

- **Trigger**: เมื่อเปลี่ยนวันหรือโหลดหน้าแรก
- **Functionality**: Frontend แจ้งขอเข้าร่วมแชนเนลสำหรับวันนี้ และ Backend จะคืนค่า กิจกรรมล่าสุด พร้อมสิทธิ์ว่าผู้ใช้แก้ไขได้หรือไม่ (IsEditable)

### 2. Activity Upsert (Save Data)

```ts
const payload: ActivityUpsertPayload = {
  trip_id: tripId,
  date: tripDate,
  activities: updatedActivities,
};
socket.emit("activity:upsert", payload);
```

**Explanation (Thai):**

- **Trigger**: เมื่อมีการ เพิ่ม, ลบ, แก้ไขรายละเอียด หรือสลับตำแหน่งการ์ด
- **Functionality**: ส่งโครงสร้างกิจกรรมทั้งหมดที่อัปเดตแล้วของวันนั้นขึ้นไปยัง Server เพื่อบันทึกฐานข้อมูลพร้อมกระจาย (Broadcast) แจ้งคนอื่นในห้อง

## 5. Backend API Logic (WebSocket Handlers)

### API 1: Event `activity:join`

**1. Handler Layer**

```go
func (h *socketHandler) ActivityJoin(socket socketio.Conn, in dto.ActivityJoinRequest) {
    socketContext := socket.Context().(*dto.SocketContext)
    roomName := GetActivityRoomName(in.TripId, in.TripDate)
    socket.Join(roomName)

    resp, err := h.svc.SocketActivityJoin(context.Background(), *in.ToDomain(socketContext.MemberId))
    socket.Emit(EventActivityJoin, dto.ActivityResponse{}.FromDomain(resp))
}
```

**Explanation (Thai):**
จัดการเพิ่มผู้ใช้เข้าสู่ Socket Room (`tripId_tripDate`) เพื่อรับ Broadcast เฉพาะวันนั้น จากนั้นให้ Service ไปดึงข้อมูลกิจกรรมกลับมาส่งคืนผู้เรียก

**2. Business Logic Layer**

```go
func (s *service) SocketActivityJoin(...) {
    MemberRole, err := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)
    activitiesResp, err := s.repo.GetActivities(ctx, ...)

    resp.IsEditable = true
    if *MemberRole == enum.MemberRoleViewer { resp.IsEditable = false }

    return &resp, nil
}
```

**Explanation (Thai):**
ตรวจสอบสิทธิ์ตามตาราง `trip_members` ถ้าเป็น Role Viewer จะไม่สามารถแก้ไขบนหน้าบ้านได้ (Frontend จะล็อกปุ่ม) ก่อนจะคืน Record กิจกรรมทั้งหมดกลับไป

---

### API 2: Event `activity:upsert`

**1. Handler Layer**

```go
func (h *socketHandler) ActivityUpsert(socket socketio.Conn, in dto.ActivityUpsertRequest) {
    err := h.svc.SocketActivityUpsert(context.Background(), *in.ToDomain(socketContext.MemberId))
    socket.Emit(EventActivityUpsert, map[string]interface{}{ "message": "activities scheduled" })
}
```

**Explanation (Thai):**
รับโครงสร้างกิจกรรมชุดใหม่ โยนให้ Service บันทึก และตอบรับกลับให้ผู้เรียก

**2. Business Logic Layer**

```go
func (s *service) SocketActivityUpsert(...) error {
    MemberRole, err := s.repo.GetTripMemberRole(...)
    if *MemberRole == enum.MemberRoleViewer { return errors.New("insufficient permissions") }

    // enqueue activities request to redis stream
    err = s.redisRepo.EnqueueActivitiesUpsert(ctx, domain.ActivityUpsertProcessRequest{
        TripId:     in.TripId,
        Date:       in.Date,
        Activities: in.Activities,
    })
    return nil
}
```

**Explanation (Thai):**
**สำคัญมาก**: จะเช็คสิทธิ์ซ้ำอีกรอบ ถ้าสิทธิ์ผ่าน แทนที่จะรันลงฐานข้อมูลทันที ระบบเลือกส่งเข้า **Redis Queue (Stream)** เพื่อรับประกันลำดับ (Order) และหลีกเลี่ยงภาระ Database จากการอัปเดตแบบ Realtime ถี่เกินไป (Rate limiting / Debouncing ภายใน Worker หรือ Processor ขาหลัง)

## 6. Data Flow Summary

**(Join Data Flow)**: Frontend `useActivitySocket` → Emit `activity:join` → Backend `JoinRoom` → Check Role & Fetch DB → Return `activity:join` (Activities + Editable Flag) → Render Drag-and-Drop List

**(Save Data Flow)**: User edit cards → Emit `activity:upsert` (Full Payload) → Backend Check Role → Enqueue job into **Redis** → (Async Consumer handles DB Write and `activity:broadcast` back to Room) → Remote Users see updates
