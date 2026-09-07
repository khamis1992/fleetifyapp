import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CustomerAssignmentDialog } from './CustomerAssignmentDialog';
const state=vi.hoisted(()=>({preview:{data:[] as unknown[],isFetching:false,isPending:false,isError:false,error:null,refetch:vi.fn()},assignment:{isPending:false,isSuccess:false,isError:false,mutate:vi.fn()}}));
vi.mock('@/hooks/useRelinkViolations',()=>({useRelinkViolations:()=>state}));
vi.mock('@/hooks/useCurrencyFormatter',()=>({useCurrencyFormatter:()=>({formatCurrency:(n:number)=>`${n} QAR`})}));
const row=(id:string,ready=true)=>({id,penalty_number:id,penalty_date:'2026-06-01',amount:200,vehicle_plate:'123',ready,reason:ready?'مطابقة':'تداخل عقود',token:`token-${id}`,candidates:[{contract_id:'contract',contract_number:'C-1',customer_id:'customer',customer_name:'العميل الأول',start_date:'2026-01-01',end_date:'2026-12-31'}]});
const show=()=>render(<MemoryRouter><CustomerAssignmentDialog companyId="company" onClose={vi.fn()} /></MemoryRouter>);
beforeEach(()=>{state.preview.data=[row('P-1'),row('P-2',false)];state.preview.isFetching=false;state.assignment.isPending=false;state.assignment.mutate.mockClear();});
describe('customer assignment review',()=>{
  it('does not assign on open and requires explicit eligible selection',()=>{
    show();expect(state.assignment.mutate).not.toHaveBeenCalled();
    expect(screen.getByRole('button',{name:'اعتماد إسناد 0 مخالفة'})).toBeDisabled();
    expect(screen.getByRole('checkbox',{name:'اختيار المخالفة P-2'})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox',{name:'اختيار المخالفة P-1'}));
    fireEvent.click(screen.getByRole('button',{name:'اعتماد إسناد 1 مخالفة'}));
    expect(state.assignment.mutate.mock.calls[0][0]).toEqual([row('P-1')]);
  });
  it('selects at most 50 eligible rows and allows pagination through all results',()=>{
    state.preview.data=Array.from({length:65},(_,i)=>row(`P-${i}`));show();
    fireEvent.click(screen.getByRole('button',{name:'اختيار أول 50 مطابقة معروضة'}));
    expect(screen.getByRole('button',{name:'اعتماد إسناد 50 مخالفة'})).toBeEnabled();
    fireEvent.click(screen.getByRole('button',{name:'التالي'}));
    fireEvent.click(screen.getByRole('button',{name:'التالي'}));
    expect(screen.getByRole('checkbox',{name:'اختيار المخالفة P-64'})).toBeDisabled();
  });
  it('limits bulk selection to the searched results',()=>{
    show();fireEvent.change(screen.getByRole('textbox',{name:'البحث في إسناد المخالفات'}),{target:{value:'P-2'}});
    fireEvent.click(screen.getByRole('button',{name:'اختيار أول 50 مطابقة معروضة'}));
    expect(screen.getByRole('button',{name:'اعتماد إسناد 0 مخالفة'})).toBeDisabled();
  });
  it('blocks submission while the preview is refreshing',()=>{
    state.preview.isFetching=true;show();
    expect(screen.getByRole('checkbox',{name:'اختيار المخالفة P-1'})).toBeDisabled();
  });
});
