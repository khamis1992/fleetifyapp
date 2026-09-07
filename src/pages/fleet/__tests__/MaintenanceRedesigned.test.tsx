import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import MaintenanceRedesigned from '../MaintenanceRedesigned';
// jsdom/cssstyle cannot resolve border shorthand with custom properties; styles are checked in the browser.
vi.mock('@/components/operations/operations-workspace.css', () => ({}));

const state=vi.hoisted(() => ({ mutation:vi.fn(), download:vi.fn(), refetch:vi.fn(), records:Array.from({length:15},(_,index) => ({ id:'record-'+index, maintenance_number:'M-'+index, maintenance_type:index===0?'routine':'repair', status:'pending', priority:'medium', scheduled_date:'2020-01-01', estimated_cost:0, actual_cost:0, vehicles:{plate_number:String(9000+index)} })) }));
vi.mock('@/hooks/useVehicles',()=>({useVehicleMaintenance:()=>({data:state.records,isLoading:false,refetch:state.refetch}),useDeleteVehicleMaintenance:()=>({mutateAsync:state.mutation}),useUpdateVehicleMaintenance:()=>({mutateAsync:state.mutation})}));
vi.mock('@/hooks/useMaintenanceVehicles',()=>({useMaintenanceVehicles:()=>({data:[],isLoading:false})}));
vi.mock('@/hooks/useMaintenanceStats',()=>({useMaintenanceStats:()=>({data:{pendingCount:15,inProgressCount:0,vehiclesInMaintenance:0,completedThisMonth:0,costThisMonth:0,overdueCount:15,urgentCount:0},isLoading:false})}));
vi.mock('@/hooks/useVehicleStatusIntegration',()=>({useCompleteMaintenanceStatus:()=>({mutateAsync:state.mutation})}));
vi.mock('@/hooks/useCurrencyFormatter',()=>({useCurrencyFormatter:()=>({formatCurrency:(n:number)=>n+' ر.ق'})}));
vi.mock('@/integrations/supabase/client',()=>({supabase:{}}));
vi.mock('@/components/fleet/MaintenanceSidePanel',()=>({MaintenanceSidePanel:()=>null}));
vi.mock('@/components/fleet/MaintenanceAlertsPanel',()=>({MaintenanceAlertsPanel:()=>null}));
vi.mock('@/components/operations/operationsPresentation',async importOriginal => ({...await importOriginal<object>(),downloadOperationsCsv:state.download}));
afterEach(()=>{cleanup();vi.clearAllMocks();});
const mount=()=>render(<MemoryRouter><MaintenanceRedesigned/></MemoryRouter>);
describe('maintenance workspace interactions',()=>{
  it('opens the register directly, and resets pagination when searching in Arabic',()=>{
    mount();
    fireEvent.click(screen.getByRole('button',{name:'سجل الطلبات',exact:true}));
    expect(screen.queryByRole('dialog')).toBeNull();
    fireEvent.click(screen.getByRole('button',{name:'2',exact:true}));
    expect(screen.getByRole('button',{name:'فتح طلب الصيانة M-14'})).toBeTruthy();
    fireEvent.change(screen.getByRole('textbox',{name:'البحث في سجل الصيانة'}),{target:{value:'دورية'}});
    expect(screen.getByRole('button',{name:'فتح طلب الصيانة M-0'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'فتح طلب الصيانة M-14'})).toBeNull();
    expect(state.mutation).not.toHaveBeenCalled();
  });
  it('exports exactly the filtered records and preserves zero costs',async()=>{
    mount();
    fireEvent.click(screen.getByRole('button',{name:'سجل الطلبات',exact:true}));
    fireEvent.change(screen.getByRole('textbox',{name:'البحث في سجل الصيانة'}),{target:{value:'M-14'}});
    fireEvent.click(screen.getByRole('button',{name:'تصدير السجل',exact:true}));
    await act(async () => { fireEvent.click(screen.getByRole('button',{name:'تنزيل CSV',exact:true})); });
    expect(state.download).toHaveBeenCalledOnce();
    const rows=state.download.mock.calls[0][1];
    expect(rows).toHaveLength(2);
    expect(rows[1]).toEqual(['M-14','9014','إصلاح','معلقة','متوسطة','2020-01-01',0,0]);
    expect(state.mutation).not.toHaveBeenCalled();
  });
});
