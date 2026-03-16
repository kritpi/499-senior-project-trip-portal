# 🔐 Google Login Flow — เอกสารอธิบายกระบวนการล็อกอินด้วย Google

## ภาพรวม (Overview)

ระบบใช้ **OAuth 2.0 Authorization Code Flow with PKCE** เพื่อยืนยันตัวตนผู้ใช้ผ่าน Google  
กระบวนการทั้งหมดมี 5 ขั้นตอนหลัก ดังนี้:

```
[User] → [Auth Page] → [Google OAuth] → [Callback Page] → [Backend API] → [Database]
```

---

## ขั้นตอนที่ 1 — หน้า Auth และ Component ปุ่ม Google Login

**ไฟล์ที่เกี่ยวข้อง:**

- `src/app/auth/page.tsx` — หน้า Login หลัก
- `src/components/features/google-login-button.tsx` — ปุ่ม "Sign in with Google"

เมื่อผู้ใช้เข้าสู่หน้า `/auth` จะเห็นปุ่ม **"Sign in with Google"** เมื่อกดปุ่ม จะมีการสร้าง PKCE Code Verifier ก่อน แล้วจึง Redirect ไปที่ Google

```tsx
// google-login-button.tsx
async function login() {
  // 1. สร้าง Code Verifier แบบ Random สำหรับ PKCE
  const codeVerifier = base64UrlEncode(
    crypto.getRandomValues(new Uint8Array(32)),
  );
  // บันทึกไว้ใน localStorage เพื่อใช้ในขั้นตอน Callback
  localStorage.setItem("google_code_verifier", codeVerifier);

  // 2. Hash codeVerifier → codeChallenge (SHA-256)
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(codeVerifier),
  );
  const codeChallenge = base64UrlEncode(digest);

  // 3. สร้าง URL แล้ว Redirect ไปหน้า Google Login
  const params = new URLSearchParams({
    client_id: process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID!,
    redirect_uri: "http://localhost:3000/auth/callback",
    response_type: "code",
    scope: "openid email profile",
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });

  window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}
```

> **PKCE คืออะไร?**  
> PKCE (Proof Key for Code Exchange) เป็นมาตรการความปลอดภัยเพิ่มเติม  
> `code_verifier` คือ Random String ที่สร้างขึ้น  
> `code_challenge` คือ SHA-256 Hash ของ `code_verifier`  
> ทั้งสองตัวนี้ใช้เพื่อป้องกัน Authorization Code Interception Attack

---

## ขั้นตอนที่ 2 — Google Consent Screen และ Redirect Callback

หลังจาก Redirect ไปที่ Google แล้ว ผู้ใช้จะเลือก Account และยืนยันสิทธิ์  
จากนั้น Google จะ Redirect กลับมาที่ `/auth/callback?code=<authorization_code>`

---

## ขั้นตอนที่ 3 — หน้า Callback: ส่ง Code ไปยัง Backend

**ไฟล์ที่เกี่ยวข้อง:**

- `src/app/auth/callback/page.tsx`
- `src/hooks/auth/use-google-login.ts`
- `src/services/api/auth/google-auth.ts`
- `src/services/schemas/google-login.schema.ts`

เมื่อผู้ใช้กลับมาที่ `/auth/callback` ระบบจะอ่าน Code จาก URL แล้วส่งไปให้ Backend ทันที

```tsx
// callback/page.tsx
export default function GoogleCallback() {
  const { mutate: googleLogin } = useGoogleLogin();

  useEffect(() => {
    const code = new URL(window.location.href).searchParams.get("code");
    const codeVerifier = localStorage.getItem("google_code_verifier");

    // เรียก Mutation Hook พร้อมส่ง code, code_verifier, และ redirect_uri
    googleLogin(
      {
        code: code!,
        code_verifier: codeVerifier!,
        redirect_uri: window.location.origin + window.location.pathname,
      },
      {
        onSuccess: () => {
          // ลบ code_verifier ออกจาก localStorage หลังใช้งานแล้ว
          localStorage.removeItem("google_code_verifier");
          // Redirect ไปหน้าที่ผู้ใช้ต้องการ หรือ /trips เป็น Default
          const returnTo = localStorage.getItem("return_to") || "/trips";
          router.push(returnTo);
        },
        onError: () => router.push("/auth?error=google_auth_failed"),
      },
    );
  }, [googleLogin, router]);
}
```

**Hook และ API Service Layer:**

```ts
// hooks/auth/use-google-login.ts — ใช้ React Query Mutation
export const useGoogleLogin = () => {
  return useMutation({
    mutationFn: (payload: GoogleAuthRequest) => createGoogleLogin(payload),
    onSuccess: (data) => {
      // เก็บ Access Token ที่ได้รับจาก Backend ลง localStorage
      localStorage.setItem("access_token", data.access_token);
    },
    onError: (error) => console.error("Google login failed:", error),
  });
};
```

```ts
// services/api/auth/google-auth.ts — เรียก REST API ด้วย Axios
export const createGoogleLogin = async (payload: GoogleAuthRequest) => {
  const { data } = await apiClient.post<GoogleAuthResp>(
    "/api/v1/auth/google",
    payload,
  );
  // Validate Response ด้วย Zod Schema ก่อน Return
  return GoogleAuthRespSchema.parse(data);
};
```

```ts
// services/schemas/google-login.schema.ts — Zod Schema สำหรับ Type Safety
export const GoogleAuthReqSchema = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string(),
});

export const GoogleAuthRespSchema = z.object({
  access_token: z.string(),
});
```

---

## ขั้นตอนที่ 4 — Backend Handler: แลก Code กับ Google ID Token

**ไฟล์ที่เกี่ยวข้อง:**

- `internal/handler/rest-api/handler-google-auth.go`

Backend รับ Request `POST /api/v1/auth/google` จาก Frontend แล้วนำ `code` ไปแลก `id_token` กับ Google

```go
// handler-google-auth.go
func (h *restHandler) GoogleAuth(c *fiber.Ctx) error {
    var req dto.GoogleAuthRequest // { code, code_verifier, redirect_uri }

    if err := c.BodyParser(&req); err != nil {
        return c.Status(fiber.StatusBadRequest).JSON(...)
    }

    // 1. ส่ง code ไปแลกกับ id_token จาก Google OAuth endpoint
    idToken, err := OutboundExchangeOAuthToken(
        req.Code,
        req.CodeVerifier,
        req.RedirectURI,
        h.cfg.Auth.ClientId,      // Google Client ID จาก Config
        h.cfg.Auth.ClientSecrets, // Google Client Secret จาก Config
    )
    if err != nil {
        return c.Status(fiber.StatusUnauthorized).JSON(...)
    }

    // 2. ส่ง idToken ต่อไปให้ Service Layer ตรวจสอบและสร้าง JWT
    tokenResp, err := h.svc.GoogleAuth(ctx, domain.GoogleIdToken{IDToken: idToken})

    return c.Status(fiber.StatusOK).JSON(dto.GoogleAuthResponse{
        AccessToken: tokenResp.AccessToken,
    })
}

// OutboundExchangeOAuthToken — เรียก Google Token Endpoint โดยตรง
func OutboundExchangeOAuthToken(code, codeVerifier, redirectURI, clientID, clientSecret string) (string, error) {
    data := url.Values{
        "code":          {code},
        "client_id":     {clientID},
        "client_secret": {clientSecret},
        "redirect_uri":  {redirectURI},
        "grant_type":    {"authorization_code"},
        "code_verifier": {codeVerifier}, // ส่ง PKCE Verifier ให้ Google ตรวจสอบ
    }

    resp, _ := http.PostForm("https://oauth2.googleapis.com/token", data)
    // Parse id_token ออกจาก Response
    var googleToken struct{ IdToken string `json:"id_token"` }
    json.NewDecoder(resp.Body).Decode(&googleToken)

    return googleToken.IdToken, nil
}
```

---

## ขั้นตอนที่ 5 — Service Layer: ตรวจสอบ ID Token และบันทึกข้อมูลผู้ใช้

**ไฟล์ที่เกี่ยวข้อง:**

- `internal/core/service/google-auth.go`
- `internal/core/domain/auth.go`

```go
// google-auth.go (service)
func (s *service) GoogleAuth(ctx context.Context, idToken domain.GoogleIdToken) (*domain.GoogleAuthResponse, error) {

    // 1. ตรวจสอบความถูกต้องของ Google ID Token ผ่าน Google's public keys
    accountPayload, err := VerifyGoogleIdToken(ctx, idToken.IDToken, s.cfg.Auth.ClientId)
    // accountPayload จะมีข้อมูล: { Sub, Email, Name, ImageUrl }

    // 2. ตรวจสอบว่า Email นี้มีในฐานข้อมูลหรือยัง
    member, err := s.repo.GetMemberByEmail(ctx, accountPayload.Email)

    if member == nil {
        // 3a. ถ้าเป็นผู้ใช้ใหม่ → สร้าง Member Record ในฐานข้อมูล
        newId, err := s.repo.CreateMember(ctx, domain.Member{
            ID:       uuid.New().String(),
            Name:     accountPayload.Name,
            Email:    accountPayload.Email,
            ImageUrl: accountPayload.ImageUrl,
        })
        accountPayload.Sub = newId
    } else {
        // 3b. ถ้าเป็นผู้ใช้เก่า → ใช้ ID จากฐานข้อมูลแทน
        accountPayload.Sub = member.ID
    }

    // 4. สร้าง JWT Access Token ด้วย Claims ของผู้ใช้
    token, err := utils.GenerateToken(*accountPayload, time.Now().Local(), s.cfg)

    return &domain.GoogleAuthResponse{AccessToken: *token}, nil
}

// VerifyGoogleIdToken — ตรวจสอบ ID Token กับ Google (cryptographic verification)
func VerifyGoogleIdToken(ctx context.Context, googleIdToken, googleClientID string) (*domain.GoogleUserClaims, error) {
    payload, err := idtoken.Validate(ctx, googleIdToken, googleClientID)

    return &domain.GoogleUserClaims{
        Sub:      payload.Claims["sub"].(string),
        Email:    payload.Claims["email"].(string),
        Name:     payload.Claims["name"].(string),
        ImageUrl: payload.Claims["picture"].(string),
    }, nil
}
```

**โครงสร้างข้อมูลที่สำคัญ (Domain models):**

```go
// domain/auth.go
type GoogleUserClaims struct {
    Sub      string // Google User ID (หรือ DB Member ID หลังแทนที่)
    Email    string
    Name     string
    ImageUrl string
}

type JWTCustomClaims struct {
    ID       string `json:"id"`
    Email    string `json:"email"`
    Name     string `json:"name"`
    ImageUrl string `json:"image_url"`
    jwt.RegisteredClaims
}
```

---

## สรุปภาพรวมทั้งหมด (Full Flow Diagram)

```
User กดปุ่ม "Sign in with Google"
│
├─► [google-login-button.tsx]
│     - สร้าง PKCE code_verifier + code_challenge
│     - บันทึก code_verifier ลง localStorage
│     - Redirect → https://accounts.google.com/o/oauth2/v2/auth
│
├─► [Google OAuth Server]
│     - แสดง Consent Screen ให้ผู้ใช้ยืนยัน
│     - Redirect กลับมา → /auth/callback?code=XXXXX
│
├─► [callback/page.tsx]
│     - อ่าน code จาก URL query
│     - อ่าน code_verifier จาก localStorage
│     - เรียก useGoogleLogin() mutation
│
├─► [use-google-login.ts → google-auth.ts]
│     - POST /api/v1/auth/google
│       Body: { code, code_verifier, redirect_uri }
│
├─► [handler-google-auth.go]
│     - รับ Request และ Parse Body
│     - POST https://oauth2.googleapis.com/token
│       Body: { code, code_verifier, client_id, client_secret, ... }
│     - รับ id_token กลับมาจาก Google
│
├─► [google-auth.go (service)]
│     - idtoken.Validate() → ตรวจสอบ id_token กับ Google Public Key
│     - GetMemberByEmail() → ดูว่ามีผู้ใช้ในระบบหรือยัง
│     - ถ้าไม่มี → CreateMember() → สร้างข้อมูลใหม่ใน DB
│     - GenerateToken() → สร้าง JWT ของระบบ
│
└─► [callback/page.tsx ได้รับ access_token]
      - localStorage.setItem("access_token", token)
      - router.push("/trips") ← Redirect ไปหน้าหลัก
```

---

## สิ่งที่ต้องตั้งค่า (Environment Variables)

| ตัวแปร                         | ฝั่งที่ใช้ | คำอธิบาย                                     |
| ------------------------------ | ---------- | -------------------------------------------- |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Frontend   | Google OAuth Client ID                       |
| `NEXT_PUBLIC_API_URL`          | Frontend   | Base URL ของ Backend API                     |
| `AUTH_CLIENT_ID`               | Backend    | Google OAuth Client ID (สำหรับ Verify token) |
| `AUTH_CLIENT_SECRETS`          | Backend    | Google OAuth Client Secret                   |
