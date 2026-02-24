import { basicInfoSchema } from '@/lib/validations/profile';

describe('profile username validation', () => {
  const validBase = {
    fullName: 'Jane Doe',
    dateOfBirth: '1990-01-01',
    gender: 'female' as const,
  };

  it('requires username in onboarding basic info', () => {
    const result = basicInfoSchema.safeParse({
      ...validBase,
      username: '',
    });

    expect(result.success).toBe(false);
  });

  it('accepts valid username and normalizes to lowercase', () => {
    const result = basicInfoSchema.safeParse({
      ...validBase,
      username: 'Outer_User_123',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.username).toBe('outer_user_123');
    }
  });

  it('rejects username with disallowed characters', () => {
    const result = basicInfoSchema.safeParse({
      ...validBase,
      username: 'bad.name',
    });

    expect(result.success).toBe(false);
  });
});
