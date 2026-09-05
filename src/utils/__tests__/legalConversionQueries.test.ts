import { describe,expect,it,vi } from 'vitest';
import { QueryClient } from '@tanstack/react-query';
import { refreshLegalConversionQueries } from '../legalConversionQueries';

describe('legal conversion read refresh',()=>{
  it('refreshes the details, existing case and actual legal queue after uncertain outcomes too',async()=>{
    const client=new QueryClient();
    const invalidate=vi.spyOn(client,'invalidateQueries').mockResolvedValue();
    expect(await refreshLegalConversionQueries(client)).toBe(true);
    for (const key of ['contract-details','existing-legal-case','manual-legal-delinquency-queue','opened-legal-cases-count']) {
      expect(invalidate).toHaveBeenCalledWith({queryKey:[key]},{throwOnError:true});
    }
    expect(invalidate.mock.calls.some(([filter])=>filter?.queryKey?.[0]==='contract-financial-sync')).toBe(false);
  });
  it('does not throw away a committed command result when one read fails',async()=>{
    const client=new QueryClient();
    const invalidate=vi.spyOn(client,'invalidateQueries').mockRejectedValueOnce(new Error('offline')).mockResolvedValue();
    expect(await refreshLegalConversionQueries(client)).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(13);
  });
  it('also contains synchronous cache failures while attempting the other refreshes',async()=>{
    const client=new QueryClient();
    const invalidate=vi.spyOn(client,'invalidateQueries').mockImplementationOnce(()=>{throw new Error('cache failure');}).mockResolvedValue();
    expect(await refreshLegalConversionQueries(client)).toBe(false);
    expect(invalidate).toHaveBeenCalledTimes(13);
  });
});
