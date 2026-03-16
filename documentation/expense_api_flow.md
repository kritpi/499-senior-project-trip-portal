# 💰 Expense API Flow — เอกสารอธิบายการทำงานของ Expense APIs

APIs ในกลุ่มนี้เกี่ยวข้องกับการจัดการค่าใช้จ่ายภายใน Trip ได้แก่ การดู สร้าง/อัปเดต และลบ Expense

> **Authentication**: ทุก API ในกลุ่มนี้ต้องแนบ `Authorization: Bearer <access_token>` ใน Header

---

## 1. GET /api/v1/trip/:id/expense — ดึง Expense ทั้งหมดใน Trip

### ภาพรวม

ดึงรายการค่าใช้จ่ายทั้งหมดของ Trip ที่ระบุ

### 🌐 Frontend (useGetTripExpenses)

```typescript
// hooks/expenses/use-get-trip-expenses.ts
export const useGetTripExpenses = (
  trip_id: number,
  access_token: string,
  options?,
) => {
  return useQuery({
    queryKey: expenseKeys.expensesByTrip(trip_id), // Cache key: ['expenses', trip_id]
    queryFn: () => getTripExpenses(trip_id, access_token),
  });
};
```

```typescript
// services/api/expenses/get-trip-expenses.ts
const { data } = await apiClient.get(`/api/v1/trip/${trip_id}/expense`, {
  headers: { Authorization: `Bearer ${access_token}` },
});
return GetTripExpensesResSchema.parse(data); // Zod validation
```

### ⚙️ Backend Handler

```go
// GetTripExpense
func (h *restHandler) GetTripExpense(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)
    tripId, _ := strconv.Atoi(c.Params("id"))

    tripExpense := dto.TripExpenseRequest{
        MemberId: jwtClaims.ID,
        TripId:   tripId,
    }
    resp, _ := h.svc.TripExpenseGet(ctx, *tripExpense.ToDomain())

    return c.Status(fiber.StatusOK).JSON(dto.TripExpenseResponse{}.FromDomain(resp))
}
```

### Flow

```
Component → useGetTripExpenses(tripId, token)
  → GET /api/v1/trip/:id/expense
  → Handler: parse tripId + memberId จาก JWT
  → Service → repo.GetTripExpenses()
  → ส่งคืน list of expenses พร้อม expense_members
```

---

## 2. PUT /api/v1/trip/:id/expense — สร้างหรืออัปเดต Expense (Upsert)

### ภาพรวม

สร้างรายการค่าใช้จ่ายใหม่ หรืออัปเดตรายการที่มีอยู่แล้ว พร้อมรองรับการหาร Expense ให้สมาชิกได้หลายแบบ

### ประเภทการหาร (SplitType)

| ค่า              | ความหมาย                         |
| ---------------- | -------------------------------- |
| `all_equal`      | หารเท่ากันให้ทุกคนใน Trip        |
| `selected_equal` | หารเท่ากันให้เฉพาะสมาชิกที่เลือก |
| `custom`         | กำหนดจำนวนเองสำหรับแต่ละคน       |

### 🌐 Frontend (useUpdateExpense)

```typescript
// hooks/expenses/use-update-expense.ts
export const useUpdateExpense = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ trip_id, body, access_token }) =>
      updateExpense(trip_id, body, access_token),
    onSuccess: (_, { trip_id }) => {
      // Invalidate cache สำหรับ trip นั้น ๆ
      queryClient.invalidateQueries({
        queryKey: expenseKeys.expensesByTrip(trip_id),
      });
    },
  });
};
```

```typescript
// services/api/expenses/update-expense.ts
export interface UpdateExpenseRequest extends UpsertExpenseFormValues {
  expense_id: string; // "" = สร้างใหม่, มี value = อัปเดต
}

await apiClient.put(`/api/v1/trip/${trip_id}/expense`, body, {
  headers: { Authorization: `Bearer ${access_token}` },
});
```

**Request Body (ตัวอย่าง):**

```json
{
  "expense_id": "",
  "title": "Dinner",
  "amount": 1200.0,
  "split_type": "all_equal",
  "participant": []
}
```

```json
{
  "expense_id": "uuid-abc",
  "title": "Hotel",
  "amount": 3000.0,
  "split_type": "selected_equal",
  "participant": [{ "member_id": "uuid-1" }, { "member_id": "uuid-2" }]
}
```

### ⚙️ Backend Handler

```go
// UpsertExpense
func (h *restHandler) UpsertExpense(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)
    tripId, _ := strconv.Atoi(c.Params("id"))

    var req dto.UpsertExpenseRequest
    req.TripId = tripId
    c.BodyParser(&req)

    h.svc.UpsertExpense(ctx, *req.ToDomain(jwtClaims.ID))

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{
        "message": "expense created successfully",
    })
}
```

### ⚙️ Service Layer

```go
// expense-upsert.go — Logic หลักทั้งหมดอยู่ที่นี่
func (s *service) UpsertExpense(ctx context.Context, in domain.UpsertExpenseRequest) error {
    // 1. ตรวจสอบ trip ว่ามีอยู่จริง
    trip, _ := s.repo.GetTripById(ctx, in.TripId)

    // 2. กำหนด UUID ให้ expense ใหม่ (ถ้า expense_id ว่าง)
    if in.ExpenseId == "" {
        in.ExpenseId = uuid.New().String()
    }

    // 3. ดึงสมาชิกทั้งหมดใน trip
    members, _ := s.repo.GetTripMembers(ctx, in.TripId)

    // 4. คำนวณ split ตาม SplitType
    var expenseMemberSplit []domain.ExpenseMember
    switch in.SplitType {
    case enum.ExpenseAllEqual:
        // หารให้ทุกคนเท่ากัน
        equalSplit := in.Amount.Div(decimal.NewFromInt(int64(len(members))))
        for _, m := range members {
            expenseMemberSplit = append(expenseMemberSplit, domain.ExpenseMember{
                MemberId: m.MemberId, Amount: &equalSplit,
            })
        }
    case enum.ExpenseSelectedEqual:
        // หารให้เฉพาะคนที่เลือก
        equalSplit := in.Amount.Div(decimal.NewFromInt(int64(len(in.Participant))))
        for _, p := range in.Participant {
            expenseMemberSplit = append(expenseMemberSplit, domain.ExpenseMember{
                MemberId: p.MemberId, Amount: &equalSplit,
            })
        }
    case enum.ExpenseCustom:
        expenseMemberSplit = in.Participant // ใช้ค่าที่กำหนดมาเลย
    }

    // 5. Upsert expense record
    s.repo.UpsertExpense(ctx, in)

    // 6. Transaction: ลบ expense_members เก่า แล้ว batch insert ใหม่
    s.repo.Transactional(ctx, func(txCtx context.Context) error {
        s.repo.DeleteExpenseMember(txCtx, in.ExpenseId)
        s.repo.BatchInsertExpenseMember(txCtx, domain.ExpenseMemberRequest{
            ExpenseId:     in.ExpenseId,
            ExpenseMember: expenseMemberSplit,
        })
        return nil
    })

    return nil
}
```

### Flow

```
User เพิ่ม/แก้ไข Expense → useUpdateExpense().mutate({ trip_id, body, token })
  → PUT /api/v1/trip/:id/expense
  → Handler: parse tripId + member_id
  → Service:
      - ดึง trip → validate
      - assign UUID ถ้าใหม่
      - คำนวณแบ่งเงิน (all_equal | selected_equal | custom)
      - UpsertExpense
      - Transaction:
          → DeleteExpenseMember เก่า
          → BatchInsertExpenseMember ใหม่
  → 201 Created
  → onSuccess: invalidate expense cache
```

---

## 3. DELETE /api/v1/trip/:id/expense — ลบ Expense

### ภาพรวม

ลบรายการค่าใช้จ่ายออกจาก Trip โดย **เฉพาะ Owner หรือ Editor เท่านั้น** ที่มีสิทธิ์ลบ (Viewer ถูกปฏิเสธ)

### 🌐 Frontend

```typescript
// services/api/expenses/delete-expense.ts
export interface DeleteExpenseRequest {
  expense_id: string;
}

await apiClient.delete(`/api/v1/trip/${trip_id}/expense`, {
  headers: { Authorization: `Bearer ${access_token}` },
  data: { expense_id: "uuid-abc" }, // DELETE body
});
```

### ⚙️ Backend Handler

```go
// DeleteTripExpense
func (h *restHandler) DeleteTripExpense(c *fiber.Ctx) error {
    jwtClaims := c.Locals("user").(*model.JWTCustomClaims)
    tripId, _ := strconv.Atoi(c.Params("id"))

    var deleteExpense dto.DeleteTripExpenseRequest
    deleteExpense.TripId = tripId
    c.BodyParser(&deleteExpense)

    h.svc.DeleteExpense(ctx, *deleteExpense.ToDomain(jwtClaims.ID))

    return c.Status(fiber.StatusCreated).JSON(fiber.Map{"message": "deleted"})
}
```

### ⚙️ Service Layer

```go
// delete-trip-expense.go — ตรวจ Role ก่อนลบ
func (s *service) DeleteExpense(ctx context.Context, in domain.DeleteTripExpenseRequest) error {
    // 1. ตรวจสอบ Role — Viewer ลบไม่ได้
    role, _ := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)
    if *role == enum.MemberRoleViewer {
        return errors.New("insufficient permissions - only owner or editor can delete expense")
    }

    // 2. Transaction: ลบ expense_members → ลบ expense
    return s.repo.Transactional(ctx, func(txCtx context.Context) error {
        s.repo.DeleteExpenseMember(txCtx, in.ExpenseId) // ลบ FK ก่อน
        s.repo.DeleteExpense(txCtx, in.ExpenseId)       // แล้วค่อยลบ expense
        return nil
    })
}
```

### Flow

```
User กดลบ Expense
  → DELETE /api/v1/trip/:id/expense { expense_id }
  → Handler: parse tripId + member_id
  → Service: GetTripMemberRole → reject ถ้าเป็น Viewer
  → Transaction:
      → DeleteExpenseMember (ลบ FK constraint ก่อน)
      → DeleteExpense
  → 201 (deleted)
```

---

## สรุป Expense APIs

| Method   | Endpoint                   | Hook                 | คำอธิบาย                               |
| -------- | -------------------------- | -------------------- | -------------------------------------- |
| `GET`    | `/api/v1/trip/:id/expense` | `useGetTripExpenses` | ดึง Expense ทั้งหมดใน Trip             |
| `PUT`    | `/api/v1/trip/:id/expense` | `useUpdateExpense`   | สร้าง/อัปเดต Expense พร้อม Split Logic |
| `DELETE` | `/api/v1/trip/:id/expense` | —                    | ลบ Expense (เฉพาะ Owner/Editor)        |
