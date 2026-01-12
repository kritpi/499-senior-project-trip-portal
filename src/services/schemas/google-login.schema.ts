import { z } from "zod";

export const GoogleAuthReqSchema = z.object({
  code: z.string(),
  code_verifier: z.string(),
  redirect_uri: z.string()
});

export const GoogleAuthRespSchema = z.object({
    access_token: z.string()
})

export type GoogleAuthRequest = z.infer<typeof GoogleAuthReqSchema>;
export type GoogleAuthResp = z.infer<typeof GoogleAuthRespSchema>;