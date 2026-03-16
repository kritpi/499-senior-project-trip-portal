# 👥 Trip Member API Flow — เอกสารอธิบายการทำงานของ Member APIs

APIs ในกลุ่มนี้เกี่ยวข้องกับการจัดการสมาชิกในทริป ได้แก่ การดูรายชื่อสมาชิก การเชิญ และการลบสมาชิก

> **Authentication**: ทุก API ในกลุ่มนี้ต้องแนบ `Authorization: Bearer <access_token>` ใน Header

---

## 1. GET /api/v1/trip/:id/members — ดึงรายชื่อสมาชิกทั้งหมดใน Trip

### ภาพรวม

ดึงรายชื่อสมาชิกทั้งหมดที่อยู่ใน Trip ที่ระบุ โดยตรวจสอบก่อนว่าผู้เรียกต้องเป็นสมาชิกของ Trip นั้น

### 🌐 Frontend (useGetTripMembers)

```typescript
// hooks/trip/use-get-trip-members.ts
export const useGetTripMembers = (
  trip_id: number,
  access_token: string,
  options?,
) => {
  return useQuery({
    queryKey: tripKeys.members(trip_id), // Cache key: ['trips', 'members', trip_id]
    queryFn: () => getTripMembers(trip_id, access_token),
    enabled: !!access_token && !!trip_id, // เรียกก็ต่อเมื่อมีทั้งสองค่า
    ...options,
  });
};
```

```typescript
// services/api/trip/get-trip-members.ts
const { data } = await apiClient.get(`/api/v1/trip/${trip_id}/members`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
return GetTripMemberSchema.parse(data); // Zod validation
```

### ⚙️ Backend Handler

```go
// GetTripMembers
func (h *restHandler) GetTripMembers(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)
    tripId, _ := strconv.Atoi(c.Params("id"))

    req := dto.GetTripMembersRequest{TripId: tripId}
    resp, err := h.svc.GetTripMembers(ctx, *req.ToDomain(jwtClaims.ID))

    return c.Status(fiber.StatusOK).JSON(dto.GetTripMembersResponse{}.FromDomain(resp))
}
```

### ⚙️ Service Layer

```go
// trip-members-get.go
func (s *service) GetTripMembers(ctx context.Context, in domain.GetTripMembersRequest) ([]domain.TripMemberDetails, error) {
    // 1. ตรวจสอบว่า member ที่ขอข้อมูลเป็น member ของ trip หรือไม่
    isMember, _ := s.repo.CheckTripMembership(ctx, in.TripId, in.MemberId)
    if !isMember {
        return nil, errors.New("forbidden: member not part of this trip")
    }

    // 2. ดึงรายชื่อสมาชิกทั้งหมดใน trip
    members, _ := s.repo.GetTripMembers(ctx, in.TripId)
    return members, nil
}
```

### Flow

```
Component → useGetTripMembers(tripId, token)
  → GET /api/v1/trip/:id/members
  → Handler parse tripId + memberId จาก JWT
  → Service: CheckTripMembership → 403 ถ้าไม่ใช่สมาชิก
  → Service: repo.GetTripMembers()
  → ส่งคืน [{ member_id, name, email, image_url, role }]
```

---

## 2. GET /api/v1/trip/:id/role — ดึง Role ของ Member ใน Trip

### ภาพรวม

ดึง Role (owner / editor / viewer) ของ Member ที่ล็อกอินอยู่ สำหรับ Trip ที่ระบุ

### 🌐 Frontend

ไม่มี Custom Hook — เรียกใช้ผ่าน `getTripById` ที่รวม `role` ไว้ใน Response แล้ว (ดูหัวข้อที่ 2 ของ trip_api_flow.md)

### ⚙️ Backend Handler

```go
// GetTripMemberRole
func (h *restHandler) GetTripMemberRole(c *fiber.Ctx) error {
    jwtClaims := c.Locals("users").(*model.JWTCustomClaims)
    tripId, _ := strconv.Atoi(c.Params("id"))

    req := dto.GetTripMemberRoleRequest{TripId: tripId}
    resp, err := h.svc.GetTripMemberRole(ctx, *req.ToDomain(jwtClaims.ID))
    // err → 404 ถ้าหาไม่เจอ

    return c.Status(fiber.StatusOK).JSON(dto.GetTripMemberRoleResponse{}.FromDomain(*resp))
}
```

### ⚙️ Service Layer

```go
// trip-member-role-get.go
func (s *service) GetTripMemberRole(ctx context.Context, in domain.GetTripMemberRoleRequest) (*string, error) {
    role, err := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)
    // ส่งคืน "owner" | "editor" | "viewer"
    return role, err
}
```

---

## 3. POST /api/v1/trip/invitation — เชิญ Member เข้า Trip

### ภาพรวม

เชิญสมาชิกเพิ่มเติมเข้า Trip โดย **เฉพาะ Owner เท่านั้น** ที่มีสิทธิ์เชิญ ระบุ Email และ Role ที่ต้องการให้

### 🌐 Frontend (useTripInvitation)

```typescript
// hooks/trip/use-trip-invitation.ts
export const useTripInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, access_token }) =>
      tripInvitation(payload, access_token),
    onSuccess: (data) => {
      // Invalidate cache เพื่อ reload รายการสมาชิกใหม่
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
};
```

```typescript
// services/api/trip/trip-invitation.ts
const { data } = await apiClient.post("/api/v1/trip/invitation", payload, {
  headers: { Authorization: `Bearer ${access_token}` },
});
```

**Request Body:**

```json
{
  "trip_id": 42,
  "email": "friend@example.com",
  "role": "editor"
}
```

**Response:**

```json
{
  "email": "friend@example.com",
  "role": "editor"
}
```

### ⚙️ Backend Handler

```go
// InviteMember
func (h *restHandler) InviteMember(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

    var req dto.TripInvitationRequest
    c.BodyParser(&req)

    resp, err := h.svc.InviteMember(ctx, *req.ToDomain(jwtClaims.ID))

    return c.Status(fiber.StatusOK).JSON(fiber.Map{
        "email": resp.Email,
        "role":  resp.Role,
    })
}
```

### ⚙️ Service Layer

```go
// trip-invitation-2.go
func (s *service) InviteMember(ctx context.Context, in domain.TripInvitationRequest) (*domain.TripInvitationResponse, error) {
    // 1. ดึง trip และตรวจสอบว่ามีอยู่
    trip, _ := s.repo.GetTripById(ctx, in.TripId)

    // 2. ตรวจสอบว่าผู้เชิญเป็น OWNER
    if in.MemberId != trip.OwnerId {
        return nil, errors.New("unable to create invitation (unauthorized)")
    }

    // 3. ตรวจสอบว่า Email ที่จะเชิญมีในระบบหรือยัง (ต้องเคย Login ด้วย Google ก่อน)
    existedMember, _ := s.repo.CheckExistingMember(ctx, in.Email)
    if existedMember == nil {
        return nil, errors.New("member is not exists")
    }

    // 4. สร้าง trip_member record
    s.repo.CreateTripMember(ctx, domain.CreateTripMemberRequest{
        TripId:   in.TripId,
        MemberId: existedMember.ID,
        Role:     in.Role,
    })

    return &domain.TripInvitationResponse{
        Email: existedMember.Email,
        Role:  in.Role,
    }, nil
}
```

> **หมายเหตุ:** สมาชิกที่จะถูกเชิญต้องเคยล็อกอินผ่าน Google เข้าระบบอย่างน้อยหนึ่งครั้งก่อน เนื่องจากต้องค้นหา Email ในตาราง `members`

### Flow

```
Owner กด "Invite Member" → ใส่ Email + Role
  → useTripInvitation().mutate({ payload, token })
  → POST /api/v1/trip/invitation
  → Handler อ่านผู้เชิญ (jwtClaims.ID)
  → Service:
      - ดึง trip → ตรวจ owner
      - CheckExistingMember(email)
      - CreateTripMember(tripId, memberId, role)
  → ส่งคืน { email, role }
  → onSuccess: invalidate cache → reload member list
```

---

## 4. DELETE /api/v1/trip/invitation — ลบสมาชิกออกจาก Trip

### ภาพรวม

ลบสมาชิกที่ถูกเชิญออกจาก Trip โดยระบุ Email ของสมาชิกที่ต้องการลบ

### 🌐 Frontend (useDeleteInvitation)

```typescript
// hooks/trip/use-delete-invitation.ts
export const useDeleteInvitation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ payload, access_token }) =>
      deleteInvitation(payload, access_token),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: tripKeys.all });
    },
  });
};
```

**Request Body:**

```json
{
  "trip_id": 42,
  "email": "friend@example.com"
}
```

### ⚙️ Backend Handler

```go
// DeleteInvitedMember
func (h *restHandler) DeleteInvitedMember(c *fiber.Ctx) error {
    var req dto.DeleteTripMemberRequest
    c.BodyParser(&req)

    err := h.svc.DeleteInvitedMember(ctx, *req.ToDomain())

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "deleted"})
}
```

### ⚙️ Service Layer

```go
// invited-member-delete.go
func (s *service) DeleteInvitedMember(ctx context.Context, in domain.DeleteTripMemberRequest) error {
    // 1. ตรวจสอบว่า member มีอยู่จริง
    member, _ := s.repo.CheckExistingMember(ctx, in.Email)
    if member == nil {
        return errors.New("member is not exists")
    }

    // 2. ลบออกจาก trip_members
    s.repo.DeleteInvitedMember(ctx, member.ID, in.TripId)
    return nil
}
```

### Flow

```
Owner กด "Remove Member" → เลือก Email
  → useDeleteInvitation().mutate({ payload, token })
  → DELETE /api/v1/trip/invitation
  → Service: CheckExistingMember → DeleteInvitedMember
  → onSuccess: invalidate cache → reload member list
```

---

## สรุป Member APIs

| Method   | Endpoint                   | Hook                  | คำอธิบาย                       |
| -------- | -------------------------- | --------------------- | ------------------------------ |
| `GET`    | `/api/v1/trip/:id/members` | `useGetTripMembers`   | ดึงรายชื่อสมาชิกทั้งหมดใน Trip |
| `GET`    | `/api/v1/trip/:id/role`    | — (รวมใน getTripById) | ดึง Role ของ member            |
| `POST`   | `/api/v1/trip/invitation`  | `useTripInvitation`   | เชิญสมาชิก (เฉพาะ Owner)       |
| `DELETE` | `/api/v1/trip/invitation`  | `useDeleteInvitation` | ลบสมาชิกออกจาก Trip            |
