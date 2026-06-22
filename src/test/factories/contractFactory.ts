// Minimal stub restored after dead-code cleanup
export const contractFactory = {
  create: (overrides?: any) => ({
    id: '1',
    status: 'active',
    startDate: new Date().toISOString(),
    endDate: new Date().toISOString(),
    totalAmount: 1000,
    monthlyAmount: 1000,
    customer: { id: 'c1', name: 'Test' },
    vehicle: { id: 'v1', plate: 'TEST' },
    ...overrides,
  }),
  createActiveContracts: (count: number) => Array.from({ length: count }, (_, i) => contractFactory.create({ id: `a${i}` })),
  createExpiredContracts: (count: number) => Array.from({ length: count }, (_, i) => contractFactory.create({ id: `e${i}`, status: 'expired' })),
  createDraftContracts: (count: number) => Array.from({ length: count }, (_, i) => contractFactory.create({ id: `d${i}`, status: 'draft' })),
  createInvalid: () => [contractFactory.create({ id: 'invalid', totalAmount: -1 })],
  calculationTests: () => ({ monthlyPaymentModule: { calculate: () => 1000 } }),
};
export default contractFactory;
