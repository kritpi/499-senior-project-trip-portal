# /trips/[trip_id]/expenses Page Documentation

## 1. Page Overview

- **Purpose**: หน้าสำหรับการจัดการค่าใช้จ่าย (Expenses) ของทริป สามารถบันทึก สรุปยอด และคำนวณส่วนแบ่งสำหรับสมาชิกแต่ละคนได้อย่างละเอียด
- **User Actions**:
  - ดูภาพรวมค่าใช้จ่ายทั้งหมดของทริป (Trip Total Expense) และยอดรวมเฉพาะส่วนที่ตนเองต้องจ่าย (My Total Expense)
  - สลับดูระหว่าง "รายจ่ายทั้งหมด" (All Expenses) และ "รายจ่ายของฉัน" (My Expenses) ผ่านระบบ Tabs
  - สร้างรายจ่ายใหม่ แตะดูรายละเอียด หรือแก้ไข/ลบรายการเดิม ผ่าน Component Modal
- **Main Components**:
  - `TotalExpenseAmount`: การ์ดสรุปยอดค่าใช้จ่าย (ใช้แสดงข้อมูล Trip Total และ My Total)
  - `ExpenseList`: รายการค่าใช้จ่ายแต่ละแถว แสดงชื่อ จำนวนเงิน คนสร้างรายการ และส่วนแบ่ง
  - `UpsertExpenseDialog`: Modal ฟอร์มให้กรอกและบันทึกรายละเอียด (รูปแบบการหารเงิน: ทั้งหมดเท่ากัน, บางคนเท่ากัน, หรือ ระบุเอง)

## 2. Page Logic Flow

1. **Initial Load**:
   - รับ `tripId` จาก URL Params พร้อมอ่าน `token` เพื่อให้สิทธิ์ในการเข้าถึง
2. **Data Fetching**:
   - ระบบเรียก `useGetTripExpenses` เพื่อดึงข้อมูล: ยอดรวมทริป ยอดรวมของ User รายการรายจ่ายทั้งหมด และวิธีที่หาร (Split types)
3. **Tabs Interface**:
   - ข้อมูล Array `tripExpenses.expenses` จะถูกแสดงบนหน้าจอ โดยถ้าผู้ใช้กดเลือก Tab "My Expenses" ระบบเพียงแค่ฝั่ง Frontend จะ filter แสดงเฉพาะรายการที่มี `my_shared > 0`
4. **Expense Interaction**:
   - **Click**: นำข้อมูลชุดเดิมไปตั้งค่าเป็น `selectedExpense` และเปิด `UpsertExpenseDialog`
   - **Delete**: กดลบรายการใน `ExpenseList` จะขึ้น Prompt หรือทำงานทันทีด้วย `deleteExpense` แล้ว invalidate Query ทิ้งเพื่อรีโหลดข้อมูล

## 3. Frontend Rendering

### Component: Expenses Tabs & List

```tsx
<Tabs defaultValue="allExpenses" onValueChange={setSelectedTab}>
  <TabsList> ... </TabsList>
</Tabs>;

{
  tripExpenses?.expenses
    .filter((exp) => (selectedTab === "myExpenses" ? exp.my_shared > 0 : true))
    .map((exp) => (
      <ExpenseList
        key={exp.expense_id}
        expenseId={exp.expense_id}
        title={exp.title}
        amount={exp.amount}
        myShared={exp.my_shared} // <--- แสดงส่วนแบ่งเฉพาะของคนล็อคอิน
        splitType={exp.split_type}
        // ... pass required props
      />
    ));
}
```

**Explanation (Thai):**
ใช้ Tab ทำหน้าที่เป็น State ควบคุม Filter รายการ ซึ่งเป็น Component-level Logic (ไม่ต้องต่อ API ใหม่) การ Render รายการจะส่งค่า Props ต่างๆ รวมถึง `myShared` ที่หลังบ้านคำนวณมาให้แล้วไปโชว์ในการ์ด

## 4. Frontend API Calling Logic

### Fetch All Expenses Data

```tsx
// src/services/api/expenses/get-trip-expenses.ts
const res = await apiClient.get(`/api/v1/trip/${trip_id}/expense`, { ... })
```

**Explanation (Thai):**

- **Trigger**: เมื่อหน้าเพจโหลดครั้งแรก หรือโดน Invalidate Cache
- **Functionality**: ดึงข้อมูลอัปเดตสถิติยอดเงินทั้งหมด และรายการรายจ่ายต่างๆ
- **UI Update**: ส่งเข้า Component `TotalExpenseAmount` และ `ExpenseList` เพื่ออัปเดตยอดวงเงินการใช้จ่าย

### Upsert (Create/Update) and Delete

```tsx
// src/services/api/expenses/update-expense.ts (PUT)
await apiClient.put(`/api/v1/trip/${trip_id}/expense`, body, { ... })

// src/services/api/expenses/delete-expense.ts (DELETE)
await apiClient.delete(`/api/v1/trip/${trip_id}/expense`, { data: body, ... })
```

**Explanation (Thai):**

- **Trigger**: เมื่อผู้ใช้กรอกฟอร์ม Modal หรือกดไอคอนถังขยะ
- **UI Update**: หลัง API ตอบกลับสำเร็จ จะสั่ง `queryClient.invalidateQueries` ให้ระบบไล่ Fetch Data ค่าใช้จ่ายตัวล่าสุดมาอัปเดตบนหน้าจออัตโนมัติ

## 5. Backend API Logic

### API 1: GET /api/v1/trip/:id/expense (Get Expenses)

**1. Handler Layer (`GetTripExpense`)**

```go
tripExpense := dto.TripExpenseRequest{ MemberId: jwtClaims.ID, TripId: tripId }
resp, err := h.svc.TripExpenseGet(ctx, *tripExpense.ToDomain())
return c.Status(fiber.StatusOK).JSON(...)
```

**2. Business Logic Layer (`TripExpenseGet`)**

```go
func (s *service) TripExpenseGet(...) ... {
    trip, _ := s.repo.GetTripById(ctx, in.TripId)
    tripExpenseTotalAmount, _ := s.repo.GetTripExpenseTotalAmount(ctx, in.TripId)
    myTotalSplit, _ := s.repo.GetTripMemberTotalExpenses(ctx, in)
    expenses, _ := s.repo.GetTripExpenses(ctx, in) // Get all lines & calculating user's split

    // Combine and return
}
```

**Explanation (Thai):**
เป็น Endpoint ทรงพลังหน้าเดียวครบจบ ไปเรียก Repository (DB Layer) ถึง 4 ส่วนเพื่อนำกลับมาเชื่อมกัน ได้แก่ (1) ข้อมูลทริป (2) ยอดเงินรวมทริป (3) ยอดที่ฉันต้องจ่ายรวม และ (4) ลิสต์รายจ่ายย่อย

---

### API 2: PUT /api/v1/trip/:id/expense (Upsert Expense)

**1. Business Logic Layer (`UpsertExpense`)**

```go
switch in.SplitType {
case enum.ExpenseAllEqual:
    // หารจำนวนเงินตามเพื่อนๆ ทั้งหมดในทริป
    lenMemberDecimal := decimal.NewFromInt(int64(len(members)))
    equalSplit := in.Amount.Div(lenMemberDecimal)
case enum.ExpenseSelectedEqual:
    // หารเงินตามเป้าหมาย (ผู้เข้าร่วม) ที่เลือก
case enum.ExpenseCustom:
    // กรอกระบุค่าเอาเอง
}
err = s.repo.UpsertExpense(ctx, in)

// Transaction DB
s.repo.Transactional(ctx, func(txCtx context.Context) error {
    s.repo.DeleteExpenseMember(txCtx, in.ExpenseId)
    s.repo.BatchInsertExpenseMember(txCtx, expenseMemberReq)
})
```

**Explanation (Thai):**
ส่วนหลักอยู่ที่ **Switch Case ในการหารเงิน (`SplitType`)** โดยใช้ไลบรารี `shopspring/decimal` เพื่อหลีกเลี่ยงปัญหาทศนิยมการเงินผิด หลังจากคำนวณส่วนแบ่งใน Array ได้แล้ว ระบบจะทำการ Update ตาราง Expense หลัก และเปิด Transaction สั่งลบสมาชิกจากยอดจ่ายเก่าทิ้งทั้งหมด แล้วยัดข้อมูลส่วนแบ่งการหารใหม่แบบ Batch Insert เข้าไป

---

### API 3: DELETE /api/v1/trip/:id/expense (Delete Expense)

**1. Business Logic Layer (`DeleteExpense`)**

```go
role, err := s.repo.GetTripMemberRole(ctx, in.MemberId, in.TripId)
if *role == enum.MemberRoleViewer { return errors.New("insufficient permissions") }

return s.repo.Transactional(ctx, func(txCtx context.Context) error {
    s.repo.DeleteExpenseMember(txCtx, in.ExpenseId)
    s.repo.DeleteExpense(txCtx, in.ExpenseId)
})
```

**Explanation (Thai):**
ตรวจสอบก่อนว่า User Role ต้องไม่ใช่ Viewer ถึงลบได้ จากนั้นเปิด Transaction บังคับลบตารางลูก `expense_member` ทิ้งก่อนตารางแม่ `expense` เสมอ (Drop constraint safety)

## 6. Data Flow Summary

**Load Flow**: Component Mount → `GET (:id/expense)` → Backend Fetches sum, ratios, and lists → Response → Filter by Tabs Action → Render UI

**Create/Update Flow**: Submit via Modal Dialog → Backend Switch cases logic to Divide `Decimal` amounts identically or specifically → Transaction (Upsert base expense + Wipe and Batch Insert splits) → Frontend Invalidates Cache → Refetch Expense List
