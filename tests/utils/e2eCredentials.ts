export interface E2ECredentials {
  email: string;
  password: string;
}

export function getE2ECredentials(): E2ECredentials {
  const email = process.env.E2E_TEST_EMAIL?.trim();
  const password = process.env.E2E_TEST_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'Set E2E_TEST_EMAIL and E2E_TEST_PASSWORD before running authenticated E2E tests.',
    );
  }

  return { email, password };
}
