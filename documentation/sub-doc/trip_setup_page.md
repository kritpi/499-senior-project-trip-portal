# /trips/[trip_id] Page Documentation

## 1. Page Overview

หน้าสำหรับการสร้างทริปใหม่ (Create Trip) หรือแก้ไขข้อมูลทริปเดิม (Edit Trip) รวมทั้งจัดการสมาชิกในทริป

## 2. Page Logic Flow

- ระบบจะเช็คค่า `trip_id` จาก URL ถ้า id ของทริปเป็นคำว่า `create` หมายถึงการ **สร้างทริปใหม่** (กำหนด `isNewTrip = true`) ถ้าเป็นตัวเลข หมายถึงการ **แก้ไขทริป** (กำหนด `isEditTrip = true`)
- กรณีเป็นโหมดแก้ไข ระบบจะดึงข้อมูลทริปและนำมากำหนดค่าเริ่มต้นให้ฟอร์ม
- ระบบจะบันทึกข้อมูลของทริปเพื่อสร้างทริปใหม่ หรือแก้ไขทริปเดิมผ่าน API

## 3. Frontend Rendering

### Component: TripForm

```tsx
<TripForm
  ref={tripFormRef} // ใช้ส่ง Ref เพื่อให้หน้าหลักสั่งการ Validate ฟอร์มภายในได้
  isNewTrip={isNewTrip} // ระบุโหมดการทำงาน
  tripId={tripId}
  accessToken={accessToken}
  {...(trip && trip.image_url ? { initialData: trip } : {})} // ใส่ข้อมูลตั้งต้นถ้าเป็นการ Edit
  onSubmit={handleFormSubmit} // Callback เมื่อกด Submit กดยืนยันบันทึกข้อมูล
  onFormChange={handleFormSubmit}
/>
```

ข้อมูลของแบบฟอร์มในการสร้างทริปใหม่ หรือแก้ไขทริปเดิม โดยจะรับข้อมูลของทริปที่ได้รับจาก API และ ข้อมูลที่ชี้ว่าทริปนั้นๆ เป็นทริปเก่าที่ต้องแก้ไข หรือเป็นทริปที่สร้างใหม่

### Component: TripInvitation

```tsx
// เงื่อนไข: ถ้าเป็นทริปใหม่ (trip_id แบบ create) ตรงนี้จะยังไม่ทำงาน
// ต้องรอให้ทริปมี id ในฐานข้อมูลเสียก่อน (เป็นตัวเลข) จึงจะโชว์ส่วนเชิญเพื่อนได้
{typeof tripId === "number" && tripId > 0 && (
  <TripInvitation
    tripId={tripId}
    accessToken={accessToken}
    existingMembers={trip?.members?.map(...)} // แมปข้อมูลสมาชิกที่มีอยู่ส่งเข้าไปแสดงผล
  />
)}
```

ข้อมูลในส่วนของการจัดการสมาชิกของทริป โดยจะแสดงผลข้อมูลของสมาชิกที่เข้าร่วมอยู่ในทริปอยู่แล้ว รวมถึงมีฟอร์มสำหรับการเพิ่มสมาชิกใหม่ และลบสมาชิกเดิมที่มีอยู่

## 4. Frontend API Calling Logic

### Fetch Trip Details API

```tsx
// เรียกใช้ hook useGetTripById โดยส่ง tripId (ตัวเลขที่ได้จาก URL) และ accessToken
// hook นี้ทำงานอัตโนมัติเมื่อค่าตัวแปร tripId และเงื่อนไขต่างๆ มีการเปลี่ยนแปลง
const {
  data: trip,
  isLoading,
  error,
} = useGetTripById(typeof tripId === "number" ? tripId : 0, accessToken);

// ลึกลงไปใน useGetTripById (src/services/api/trip/get-trip-by-id.ts)
// จะเป็นการใช้ axios ยิง GET request
const res = await apiClient.get(`/api/v1/trip/${trip_id}`, {
  headers: {
    Authorization: `Bearer ${access_token}`,
  },
});
```

### Upsert (Create/Update) Trip API

```tsx
// เมื่อผู้ใช้กรอกฟอร์มเสร็จและกด "Next Step" ฝั่งคอมโพเนนต์จะเรียก trigger ส่งข้อมูล
// จากนั้นหน้าหลักจะเรียกใช้ useMutation hook (upsertTrip.mutate)
upsertTrip.mutate(
  {
    payload: {
      trip_id: tripId, // ถ้าเป็นทริปใหม่จะไม่ส่งรหัสนี้ไป หรืออาจจะ undefined
      trip_name: formData.trip_name,
      start_date: formData.start_date, // วันเริ่มต้นแรลลี่
      end_date: formData.end_date,
      // ... ฟิลด์ข้อมูลอื่นๆ โยนไปให้ Backend บันทึกลงฐานข้อมูล
    },
    access_token: accessToken,
  },
  {
    onSuccess: (data) => {
      // ถ้ายิง API สำเร็จ (ข้อมูลเซฟเรียบร้อยผ่าน backend)
      // จะทำการย้ายหน้า (Redirect) ไปหน้าจัดการกิจกรรมทันทีเพื่อวางแผนเที่ยวต่อ
      router.push(`/trips/${data.trip_id}/activities`);
    },
  },
);
```

### Invite/Delete Member API

```tsx
// ฟังก์ชันสำหรับเพิ่มสมาชิก
tripInvitation.mutate(
  {
    payload: {
      trip_id: tripId,
      email: inviteEmail, // อีเมลของคนที่จะเชิญที่กรอกในช่อง Input
      role: inviteRole, // ตำแหน่งที่เลือกให้ (EDITOR ดูและแก้หมายกำหนดการได้, VIEWER ดูได้อย่างเดียว)
    },
    access_token: accessToken,
  },
  {
    onSuccess: () => {
      // กระบวนการเมื่อเชิญเสร็จ ล้างช่องกรอกอีเมลให้กลับเป็นค่าว่าง พร้อมให้เชิญคนต่อไปได้
      setInviteEmail("");
      // ภายใน hook useTripInvitation จะมีการสั่ง queryClient.invalidateQueries(...)
      // ส่งผลให้ Component ฝั่ง Frontend รีโหลดข้อมูลหน้านี้ใหม่ เพื่อนำรายชื่อที่เพิ่งเชิญมาโชว์ในวงสมาชิก
    },
  },
);

// ฟังก์ชันสำหรับเตะสมาชิกออก (ลบ Invitation) จะถูกเรียกเมื่อ Owner ตัดสินใจคลิกปุ่มกากบาท
deleteInvitation.mutate({
  payload: {
    trip_id: tripId,
    email: member.email, // อีเมลของคนที่จะลบออกจากทริป
  },
  access_token: accessToken,
});
```

## 5. Backend API Logic

### API 1: GET /api/v1/trip/:id (Get Trip data)

**1. Handler Layer (`GetTripById`)**

```go
func (h *restHandler) GetTripById(c *fiber.Ctx) error {
	ctx := c.Context()
	jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

	// 1. แปลง parameter 'id' จาก String ที่ติดมากับ URL Path ให้กลายเป็นตัวเลข
	tripIdParam := c.Params("id")
	tripId, err := strconv.Atoi(tripIdParam)
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "invalid trip ID"})
	}

	// 2. ส่งต่อรหัสทริป (tripId) และบัญชีคนล็อกอิน (jwtClaims.ID) เข้า Service
	req := domain.GetTripByIdRequest{
		TripId:   tripId,
		MemberId: jwtClaims.ID,
	}

	resp, err := h.svc.GetTripById(ctx, req)
	if err != nil {
		if err.Error() == "forbidden: member not part of this trip" {
			return c.Status(fiber.StatusForbidden).JSON(...)
		}
		if err.Error() == "trip not found" {
			return c.Status(fiber.StatusNotFound).JSON(...)
		}
		return c.Status(fiber.StatusInternalServerError).JSON(...)
	}

	return c.Status(fiber.StatusOK).JSON(dto.GetTripByIdResponse{}.FromDomain(resp))
}
```

**2. Business Logic Layer (`GetTripById`)**

```go
func (s *service) GetTripById(ctx context.Context, in domain.GetTripByIdRequest) (*domain.GetTripByIdResponse, error) {
	// Step 1: ตรวจสอบก่อนว่าคนที่เรียกดู API มีสิทธิ์ในทริปนี้หรือไม่ (ป้องกัน Unauthorized Access)
	isMember, err := s.repo.CheckTripMembership(ctx, in.TripId, in.MemberId)
	if !isMember { // ถ้าไม่มีชื่อในทริปจะโดนเด้งออกทันที
		return nil, errors.New("forbidden: member not part of this trip")
	}

	// Step 2: ดึงรายละเอียดข้อมูลทริปหลักออกมา (ชื่อทริป สถานที่ เวลาเดินทาง เป็นต้น)
	trip, err := s.repo.GetTripById(ctx, in.TripId)
	if trip == nil {
		return nil, errors.New("trip not found") // ทริปถูกลบ หรือไม่มีอยู่จริง
	}

	// หาสิทธิ์และบทบาท (Role) ของผู้ใช้งานที่ล็อกอินเข้ามา ว่าเป็น Owner/Editor/Viewer
	// เพื่อให้ฝั่ง Frontend เอาไปซ่อนหรือโชว์การจัดการต่างๆ
	role, err := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)

	// Step 3: ดึงรายชื่อเพื่อนร่วมทริปทั้งหมดออกมา
	members, err := s.repo.GetTripMembers(ctx, in.TripId)

	return &domain.GetTripByIdResponse{
		Trip:    trip,
		Role:    *role,
		Members: members,
	}, nil
}
```

**3. Database Layer (`GetTripById`)**

```go
func (r *Repository) GetTripById(ctx context.Context, tripId int) (*domain.Trip, error) {
	// Query ข้อมูลทริป 1 แถวจากตารางข้อมูลหลักที่ชื่อ r.cfg.Table.TripTable
	queryString := fmt.Sprintf(`
		SELECT id, owner_id, trip_name, description, start_date,
		       end_date, main_location, image_url, created_at, updated_at
		FROM %s WHERE id = @id
	`, r.cfg.Table.TripTable)

	args := pgx.NamedArgs{"id": tripId}
	var trip entity.Trip

	// ใช้ QueryRow เพื่อดึงแค่ Row เดียวและแมปข้อมูลเข้า Struct ของเรา
	err := r.db.QueryRow(ctx, queryString, args).Scan(
		&trip.ID, &trip.OwnerId, &trip.TripName, &trip.Description,
		&trip.StartDate, &trip.EndDate, &trip.MainLocation, &trip.ImageUrl,
		&trip.CreatedAt, &trip.UpdatedAt,
	)
	if err == pgx.ErrNoRows { return nil, nil }
	return domain.Trip{}.FromEntity(trip), nil
}
```

---

### API 2: PUT /api/v1/trip/ (Upsert Trip)

**1. Handler Layer (`UpsertTrip`)**

```go
func (h *restHandler) UpsertTrip(c *fiber.Ctx) error {
	ctx := c.Context()
	jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

	var req dto.UpsertTripRequest
	// แกะ JSON body ว่ามีฟิลด์อะไรส่งมาบ้าง เข้ามาเก็บไว้ในตัวแปรโครงสร้าง req
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "invalid request"})
	}

	// นำข้อมูลทริปส่งเข้าหา Service ไปจัดการ Business logic ให้เรียบร้อย
	resp, err := h.svc.UpsertTrip(ctx, *req.ToDomain(jwtClaims.ID))
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(...)
	}

	// ได้รหัส TripId คืนมา
	return c.Status(fiber.StatusCreated).JSON(dto.UpsertTripResponse{
		TripId: resp.TripId,
	})
}
```

**2. Business Logic Layer (`UpsertTrip`)**

```go
func (s *service) UpsertTrip(ctx context.Context, in domain.UpsertTripRequest) (*domain.UpsertTripResponse, error) {
	// มีการตรวจสอบ Validate วันที่ End date ต้องไม่ก่อนหน้า Start date
	if in.StartDate != nil && in.EndDate != nil {
		if in.EndDate.Before(*in.StartDate) { return nil, fmt.Errorf("end date cannot be before start date") }
	}

	// บันทึกผ่าน Transaction เพื่อให้ปลอดภัยสูงสุด เพราะอาจจะต้องสร้างและแก้หลายตารางในเวลาเดียวกัน
	var resp *domain.UpsertTripResponse
	err = s.repo.Transactional(ctx, func(txCtx context.Context) error {
		var txErr error
		// 1. ทำการ Insert (ถ้าทริปใหม่) หรือ Update (ถ้าทริปเก่า)
		resp, txErr = s.repo.UpsertTrip(txCtx, in)

		// 2. ถ้าเป็นการสร้างทริปใหม่ (in.ID ไม่เคยถูกตั้งค่ามาก่อน) เราค่อยให้เพื่อนเพิ่มอีกตาราง
		if in.ID == nil {
			// ให้จับคนสร้าง ยัดลงตารางรวบรวมสมาชิกทริปในตำแหน่ง "เจ้าของทริป" (OWNER) เลยทันที
			createReq := domain.CreateTripMemberRequest{
				TripId: resp.TripId, MemberId: member.ID, Role: enum.MemberRoleOwner, CreatedAt: now,
			}
			txErr = s.repo.CreateTripMember(txCtx, createReq)
		}
		return nil // Commits level DB
	})

	return resp, nil
}
```

**3. Database Layer (`UpsertTrip`)**

```go
func (r *Repository) UpsertTrip(ctx context.Context, in domain.UpsertTripRequest) (*domain.UpsertTripResponse, error) {
	args := pgx.NamedArgs{
		"id": in.ID, "owner_id": in.OwnerId, "trip_name": in.TripName, ...
	}
	var queryString string

	if in.ID == nil {
		// เงื่อนไขที่ 1: ไม่มีรหัสทริปมาก่อน ถือเป็นการ INSERT ข้อมูลทริปใหม่เอี่ยมเข้าฐานข้อมูล
		queryString = fmt.Sprintf(`
			INSERT INTO %s (owner_id, trip_name, description, start_date, end_date,
                            main_location, image_url, created_at, updated_at)
			VALUES (@owner_id, @trip_name, @description, @start_date, @end_date,
                    @main_location, @image_url, @created_at, @updated_at)
			RETURNING id; -- คำสั่งนี้จะส่งรหัสแถวของทริปที่เพิ่งบันทึกคายกลับออกมาเป็น Result ด้วย
		`, r.cfg.Table.TripTable)
	} else {
		// เงื่อนไขที่ 2: กรระบุ ID แปลว่าต้องการทำ UPDATE ทับข้อมูลทริปเดิมที่มีอยู่
		queryString = fmt.Sprintf(`
			UPDATE %s SET
				trip_name = @trip_name, description = @description, start_date = @start_date,
				end_date = @end_date, main_location = @main_location, image_url = @image_url,
				updated_at = @updated_at
			WHERE id = @id
			RETURNING id;
		`, r.cfg.Table.TripTable)
	}

	var id int
	// ยิงคำสั่งและรับค่า RETURNING ID ไปใช้งานในส่วนอื่นต่อ
	if err := r.db.QueryRow(ctx, queryString, args).Scan(&id); err != nil {
		return nil, err
	}
	return &domain.UpsertTripResponse{TripId: id}, nil
}
```

---

### API 3: POST /api/v1/trip/invitation (Invite Member)

**1. Handler Layer (`InviteMember`)**

```go
func (h *restHandler) InviteMember(c *fiber.Ctx) error {
	ctx := c.Context()
	jwtClaims := c.Locals("user").(*model.JWTCustomClaims)

	// แปลง Body จากหน้าเว็บที่ผู้ใช้กรอกอีเมลเข้ามา
	var req dto.TripInvitationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{"message": "invalid request"})
	}

	resp, err := h.svc.InviteMember(ctx, *req.ToDomain(jwtClaims.ID))
	// หากสำเร็จก็ส่ง Email ของคนที่ชวนกลับมา
	return c.Status(fiber.StatusOK).JSON(fiber.Map{
		"email": resp.Email,
		"role": resp.Role,
	})
}
```

**2. Business Logic Layer (`InviteMember`)**

```go
func (s *service) InviteMember(ctx context.Context, in domain.TripInvitationRequest) (*domain.TripInvitationResponse, error) {
	// การตรวจสอบที่ 1: ตรวจว่าคนสั่งเชิญนี้คือ Owner หรือไม่ (ห้ามคนอื่นเชิญมั่ว)
	trip, err := s.repo.GetTripById(ctx, in.TripId)
	if in.MemberId != trip.OwnerId {
		return nil, errors.New("unable to create invitation (unauthorized)")
	}

	// การตรวจสอบที่ 2: เช็คว่าอีเมลของคนที่ชวนมีตัวตนลงทะเบียนอยู่ในระบบหรือไม่
	existedMember, err := s.repo.CheckExistingMember(ctx, in.Email)
	if existedMember == nil {
		return nil, errors.New("member is not exists")
	}

	// ถ้าตรวจผ่านทั้งหมดจึงจะสร้างความสัมพันธ์สมาชิกขึ้นในระบบ
	err = s.repo.CreateTripMember(ctx, domain.CreateTripMemberRequest{
		TripId:    in.TripId,
		MemberId:  existedMember.ID,
		Role:      in.Role, // role นี้หน้า Front เป็นคนเลือกว่าเป็น EDITOR/VIEWER
		CreatedAt: now,
	})

	return &domain.TripInvitationResponse { Email: existedMember.Email, Role: in.Role }, nil
}
```

**3. Database Layer (`CreateTripMember`)**

```go
// ฟังก์ชันนี้อยู่ภายในไฟล์ repository สร้างเพื่อจัดเก็บ Trip Member
// โดยรับรหัสทริป (trip_id) และรหัสผู้ใช้เป้าหมาย (member_id)
// ผูกเข้าด้วยกันลงในตารางรวบรวมสมาชิกทริปที่ชื่อ trip_members
// ถ้าทำสำเร็จ ถือว่าผู้ใช้รายนั้นจะได้สิทธิ์เข้าถึงเนื้อหาและเข้ามาแก้ไขทริปได้ทันที
```

---

### API 4: DELETE /api/v1/trip/invitation (Remove Member)

**1. Business Logic Layer (`DeleteInvitedMember`)**

```go
func (s *service) DeleteInvitedMember(ctx context.Context, in domain.DeleteTripMemberRequest) error {
	// นำ email ที่โดนกดเตะออก ไปหา ID ตัวเลขจริงๆ ของบัญชีนั้นออกมา
	member, err := s.repo.CheckExistingMember(ctx, in.Email)
	if member == nil {
		return errors.New("member is not exists")
	}

	// สั่งลบความสัมพันธ์ตาม ID ผู้ใช้คนนั้นออกจากตารางทรรปในฐานข้อมูลทิ้งไป
	err = s.repo.DeleteInvitedMember(ctx, member.ID, in.TripId)
	return err
}
```

## 6. Data Flow Summary

**(Edit Mode) Load Flow**: URL Parse → Frontend Component → `GET /api/v1/trip/:id` → Backend Check Membership & Fetch Data → Response → Populate Form

**(Save Flow) Update Flow**: User click 'Next' → Frontend Validate Ref → `PUT /api/v1/trip/` → Backend Validate Date & Run Transaction (Upsert + Add Owner If New) → Return Trip ID → Frontend Redirect (`/trips/:id/activities`)

**(Invitation Flow)**:

- **Add**: User Input Email/Role → `POST /api/v1/trip/invitation` → Backend checks Owner rights & Target email exists → Insert DB → Frontend invalidates query
- **Remove**: User clicks 'X' icon → `DELETE /api/v1/trip/invitation` → Backend fetches ID by Email → Delete relation DB → Frontend invalidates query
