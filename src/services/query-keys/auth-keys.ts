export const authKeys = {
  all: ['auth'] as const,
  google: () => [...authKeys.all, 'google'] as const,
  googleLogin: (code: string) => [...authKeys.google(), 'login', code] as const,
};
