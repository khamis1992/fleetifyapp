/**
 * Car Rental Scheduler - نظام جدولة الحجوزات المتطور
 * 
 * يوفر واجهة تقويمية (Gantt-like) لإدارة حجوزات المركبات مع:
 * - عرض المركبات في صفوف والأيام في أعمدة
 * - السحب والإفلات لتعديل الحجوزات
 * - إدارة السائقين وربطهم بالحجوزات
 * - التكامل مع قاعدة البيانات الحقيقية
 */

import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Car, 
  ChevronRight, 
  ChevronLeft, 
  Plus, 
  Search, 
  X,
  LayoutGrid,
  DollarSign,
  Activity,
  Filter,
  Trash2,
  CheckCircle,
  AlertTriangle,
  Clock,
  Users,
  Phone,
  FileText,
  MapPin,
  User,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { useCurrentCompanyId } from '@/hooks/useUnifiedCompanyAccess';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, parseISO, differenceInDays, addDays } from 'date-fns';
import { ar } from 'date-fns/locale';

// ===== Types =====
interface Vehicle {
  id: string;
  plate_number: string;
  make: string;
  model: string;
  daily_rate: number;
  status: string;
  vehicle_type?: string;
}

interface Booking {
  id: number | string;
  carId: string;
  start: Date;
  days: number;
  customer: string;
  customerId?: string;
  status: 'pending' | 'confirmed' | 'active' | 'completed' | 'cancelled' | 'maintenance';
  contractId?: string;
  driverId?: number | null;
  notes?: string;
}

interface Driver {
  id: number;
  name: string;
  license: string;
  phone: string;
  status: 'available' | 'busy' | 'vacation';
  location: string;
}

interface DragState {
  isDragging: boolean;
  mode: 'move' | 'resize_start' | 'resize_end';
  booking: Booking | null;
  startX: number;
  currX: number;
  initialDate: Date | null;
  initialDays: number;
  initialLeft: number;
  initialTop: number;
  hasMoved: boolean;
  snapDate: Date | null;
  snapDays: number;
  snapCarId: string | null;
}

interface ContextMenu {
  x: number;
  y: number;
  booking: Booking;
}

// ===== Constants =====
const CAR_TYPES = [
  { id: 'all', label: 'الكل' },
  { id: 'suv', label: 'دفع رباعي' },
  { id: 'sedan', label: 'سيدان' },
  { id: 'luxury', label: 'فاخرة' },
  { id: 'pickup', label: 'بيك أب' },
  { id: 'van', label: 'فان' },
];

const VEHICLE_STATUSES = [
  { id: 'all', label: 'كل الحالات' },
  { id: 'available', label: 'متوفرة ✅' },
  { id: 'rented', label: 'مؤجرة' },
  { id: 'reserved', label: 'محجوزة' },
  { id: 'reserved_employee', label: 'محجوزة لموظف 👤' },
  { id: 'maintenance', label: 'صيانة 🔧' },
];

// ===== Helper Functions =====
const getToday = () => {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
};

const formatDateForInput = (date: Date | null) => {
  if (!date) return '';
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const getStatusColor = (status: string) => {
  switch(status) {
    case 'confirmed': return 'bg-[#3B82F6] border-[#2563EB] text-white'; 
    case 'active': return 'bg-[#22C55E] border-[#16A34A] text-white';
    case 'pending': return 'bg-[#FACC15] border-[#EAB308] text-black';
    case 'maintenance': return 'bg-[#EF4444] border-[#DC2626] text-white stripes';
    case 'completed': return 'bg-[#6B7280] border-[#4B5563] text-white';
    case 'cancelled': return 'bg-[#9CA3AF] border-[#6B7280] text-white opacity-60';
    default: return 'bg-slate-400';
  }
};

// ===== Main Component =====
export default function CarRentalScheduler() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const companyId = useCurrentCompanyId();
  
  // Navigation State
  const [currentView, setCurrentView] = useState<'scheduler' | 'drivers'>('scheduler');

  // Scheduler State
  const [currentDate, setCurrentDate] = useState(getToday());
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState<any>(null);
  const [filterType, setFilterType] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all'); // 'all', 'available', 'rented', 'maintenance'
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Drivers State
  const [driverSearch, setDriverSearch] = useState('');
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [driverModalData, setDriverModalData] = useState<any>(null);

  // UI State
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null);
  const [hoveredBooking, setHoveredBooking] = useState<number | string | null>(null);

  // Configuration
  const daysToShow = 14;
  const cellWidth = 120;

  // Dragging State
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    mode: 'move',
    booking: null,
    startX: 0,
    currX: 0,
    initialDate: null,
    initialDays: 0,
    initialLeft: 0,
    initialTop: 0,
    hasMoved: false,
    snapDate: null,
    snapDays: 0,
    snapCarId: null
  });

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // ===== Data Fetching =====
  
  // Fetch Vehicles - Added limit for pagination
  const { data: vehicles = [], isLoading: vehiclesLoading } = useQuery({
    queryKey: ['scheduler-vehicles', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      const { data, error } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, daily_rate, status, vehicle_type')
        .eq('company_id', companyId)
        .eq('is_active', true)
        .order('plate_number')
        .limit(200); // Added pagination limit
      if (error) throw error;
      return (data || []) as Vehicle[];
    },
    enabled: !!companyId,
    staleTime: 2 * 60 * 1000, // 2 minutes cache
    gcTime: 5 * 60 * 1000,
  });

  // Fetch Contracts as Bookings - Added cache settings
  const { data: contractBookings = [], isLoading: contractsLoading } = useQuery({
    queryKey: ['scheduler-contracts', companyId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!companyId) return [];
      
      const startRange = new Date(currentDate);
      startRange.setDate(startRange.getDate() - 7);
      const endRange = new Date(currentDate);
      endRange.setDate(endRange.getDate() + daysToShow + 7);

      const { data, error } = await supabase
        .from('contracts')
        .select(`
          id, 
          vehicle_id, 
          start_date, 
          end_date, 
          status,
          customer_id,
          customers(id, first_name, last_name, first_name_ar, last_name_ar, company_name, company_name_ar)
        `)
        .eq('company_id', companyId)
        .lte('start_date', format(endRange, 'yyyy-MM-dd'))
        .gte('end_date', format(startRange, 'yyyy-MM-dd'))
        .in('status', ['draft', 'active', 'pending']);

      if (error) throw error;
      
      return (data || []).map((contract: any) => {
        const customer = contract.customers;
        const customerName = customer?.company_name_ar || customer?.company_name || 
          `${customer?.first_name_ar || customer?.first_name || ''} ${customer?.last_name_ar || customer?.last_name || ''}`.trim() || 
          'عميل غير محدد';
        
        const startDate = parseISO(contract.start_date);
        const endDate = parseISO(contract.end_date);
        const days = differenceInDays(endDate, startDate) + 1;

        return {
          id: `contract-${contract.id}`,
          carId: contract.vehicle_id,
          start: startDate,
          days,
          customer: customerName,
          customerId: contract.customer_id,
          status: contract.status === 'active' ? 'active' : contract.status === 'pending' ? 'pending' : 'confirmed',
          contractId: contract.id,
          driverId: null,
        } as Booking;
      });
    },
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minute cache for contracts
    gcTime: 5 * 60 * 1000,
  });

  // Fetch Reservations
  const { data: reservationBookings = [], isLoading: reservationsLoading } = useQuery({
    queryKey: ['scheduler-reservations', companyId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!companyId) return [];
      
      const startRange = new Date(currentDate);
      startRange.setDate(startRange.getDate() - 7);
      const endRange = new Date(currentDate);
      endRange.setDate(endRange.getDate() + daysToShow + 7);

      const { data, error } = await supabase
        .from('vehicle_reservations')
        .select('*')
        .eq('company_id', companyId)
        .lte('start_date', format(endRange, 'yyyy-MM-dd'))
        .gte('end_date', format(startRange, 'yyyy-MM-dd'))
        .in('status', ['pending', 'confirmed']);

      if (error) throw error;
      
      return (data || []).map((res: any) => {
        const startDate = parseISO(res.start_date);
        const endDate = parseISO(res.end_date);
        const days = differenceInDays(endDate, startDate) + 1;

        return {
          id: `reservation-${res.id}`,
          carId: res.vehicle_id,
          start: startDate,
          days,
          customer: res.customer_name || 'حجز مؤقت',
          customerId: res.customer_id,
          status: res.status as 'pending' | 'confirmed',
          notes: res.notes,
          driverId: null,
        } as Booking;
      });
    },
    enabled: !!companyId,
    staleTime: 1 * 60 * 1000, // 1 minute cache for reservations
    gcTime: 5 * 60 * 1000,
  });

  // Fetch Maintenance Records
  const { data: maintenanceRecords = [] } = useQuery({
    queryKey: ['scheduler-maintenance', companyId, format(currentDate, 'yyyy-MM')],
    queryFn: async () => {
      if (!companyId) return [];
      
      const startRange = new Date(currentDate);
      startRange.setDate(startRange.getDate() - 7);
      const endRange = new Date(currentDate);
      endRange.setDate(endRange.getDate() + daysToShow + 7);

      const { data, error } = await supabase
        .from('vehicle_maintenance')
        .select('id, vehicle_id, scheduled_date, status, maintenance_type')
        .eq('company_id', companyId)
        .gte('scheduled_date', format(startRange, 'yyyy-MM-dd'))
        .lte('scheduled_date', format(endRange, 'yyyy-MM-dd'))
        .in('status', ['pending', 'in_progress', 'scheduled']);

      if (error) throw error;
      return data || [];
    },
    enabled: !!companyId,
  });

  // Fetch Drivers (from employees with driver role or dedicated drivers table)
  const { data: drivers = [], isLoading: driversLoading } = useQuery({
    queryKey: ['scheduler-drivers', companyId],
    queryFn: async () => {
      if (!companyId) return [];
      
      // Try to fetch from employees with driver position
      const { data, error } = await supabase
        .from('employees')
        .select('id, first_name, last_name, phone, position, is_active')
        .eq('company_id', companyId)
        .ilike('position', '%سائق%')
        .eq('is_active', true);

      if (error) {
        console.error('Error fetching drivers:', error);
        return [];
      }
      
      return (data || []).map((emp: any, index: number) => ({
        id: index + 1,
        name: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() || 'سائق',
        license: `DL-${emp.id?.slice(0, 6) || '000000'}`,
        phone: emp.phone || '',
        status: emp.is_active ? 'available' : 'busy',
        location: '',
        employeeId: emp.id,
      })) as Driver[];
    },
    enabled: !!companyId,
  });

  // Combine all bookings
  const bookings = useMemo(() => {
    const all: Booking[] = [...contractBookings, ...reservationBookings];
    
    // Add maintenance as special bookings
    maintenanceRecords.forEach((m: any) => {
      const scheduledDate = parseISO(m.scheduled_date);
      all.push({
        id: `maintenance-${m.id}`,
        carId: m.vehicle_id,
        start: scheduledDate,
        days: 1,
        customer: `صيانة: ${m.maintenance_type}`,
        status: 'maintenance',
        driverId: null,
      });
    });
    
    return all;
  }, [contractBookings, reservationBookings, maintenanceRecords]);

  // ===== Mutations =====
  
  // Create Reservation
  const createReservation = useMutation({
    mutationFn: async (values: any) => {
      if (!companyId) throw new Error('Company ID not found');

      const vehicle = vehicles.find(v => v.id === values.carId);
      
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .insert({
          company_id: companyId,
          vehicle_id: values.carId,
          customer_name: values.customer,
          vehicle_plate: vehicle?.plate_number || '',
          vehicle_make: vehicle?.make || '',
          vehicle_model: vehicle?.model || '',
          start_date: values.start,
          end_date: format(addDays(new Date(values.start), values.days - 1), 'yyyy-MM-dd'),
          hold_until: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
          status: values.status || 'pending',
          notes: values.notes || null,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-reservations'] });
      toast.success('تم إنشاء الحجز بنجاح');
      setIsModalOpen(false);
      setModalData(null);
    },
    onError: (error) => {
      toast.error('فشل في إنشاء الحجز');
      console.error(error);
    },
  });

  // Update Reservation
  const updateReservation = useMutation({
    mutationFn: async ({ id, startDate, endDate, vehicleId }: { 
      id: string; 
      startDate: Date; 
      endDate: Date; 
      vehicleId: string 
    }) => {
      const reservationId = id.replace('reservation-', '');
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .update({
          start_date: format(startDate, 'yyyy-MM-dd'),
          end_date: format(endDate, 'yyyy-MM-dd'),
          vehicle_id: vehicleId,
        })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-reservations'] });
      toast.success('تم تحديث الحجز');
    },
    onError: (error) => {
      toast.error('فشل في تحديث الحجز');
      console.error(error);
    },
  });

  // Cancel Reservation
  const cancelReservation = useMutation({
    mutationFn: async (id: string) => {
      const reservationId = id.replace('reservation-', '');
      const { data, error } = await supabase
        .from('vehicle_reservations')
        .update({ status: 'cancelled' })
        .eq('id', reservationId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['scheduler-reservations'] });
      toast.success('تم إلغاء الحجز');
    },
    onError: (error) => {
      toast.error('فشل في إلغاء الحجز');
      console.error(error);
    },
  });

  // ===== Computed Values =====
  
  // Filter vehicles
  const filteredCars = useMemo(() => {
    return vehicles.filter(vehicle => {
      const matchesSearch = 
        vehicle.plate_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.make.toLowerCase().includes(searchTerm.toLowerCase()) ||
        vehicle.model.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesType = filterType === 'all' || vehicle.vehicle_type === filterType;
      
      const matchesStatus = filterStatus === 'all' || vehicle.status === filterStatus;
      
      return matchesSearch && matchesType && matchesStatus;
    });
  }, [vehicles, searchTerm, filterType, filterStatus]);

  // Filter drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(d => 
      d.name.includes(driverSearch) || 
      d.phone.includes(driverSearch) || 
      d.license.includes(driverSearch)
    );
  }, [drivers, driverSearch]);

  // Date headers
  const dateHeaders = useMemo(() => {
    const dates: Date[] = [];
    for (let i = 0; i < daysToShow; i++) {
      const d = new Date(currentDate);
      d.setDate(d.getDate() + i);
      dates.push(d);
    }
    return dates;
  }, [currentDate, daysToShow]);

  // Statistics
  const stats = useMemo(() => {
    const totalRevenue = bookings.reduce((acc, b) => {
      if (b.status === 'maintenance' || b.status === 'cancelled') return acc;
      const vehicle = vehicles.find(v => v.id === b.carId);
      return acc + (vehicle ? vehicle.daily_rate * b.days : 0);
    }, 0);

    const activeBookings = bookings.filter(b => b.status === 'active').length;
    
    const totalDays = filteredCars.length * daysToShow;
    const bookedDays = bookings.reduce((acc, b) => {
      if (b.status === 'cancelled' || b.status === 'maintenance') return acc;
      return acc + b.days;
    }, 0);
    const utilization = totalDays > 0 ? Math.round((bookedDays / totalDays) * 100) : 0;

    return { totalRevenue, activeBookings, utilization };
  }, [bookings, vehicles, filteredCars.length, daysToShow]);

  // ===== Helper Functions =====
  
  const getCarById = useCallback((id: string) => {
    return vehicles.find(v => v.id === id);
  }, [vehicles]);

  const getCarName = useCallback((id: string) => {
    const car = getCarById(id);
    return car ? `${car.make} ${car.model}` : 'غير معروف';
  }, [getCarById]);

  const getCarPrice = useCallback((id: string) => {
    return getCarById(id)?.daily_rate || 0;
  }, [getCarById]);

  const getDriverName = useCallback((id: number | null | undefined) => {
    if (!id) return '';
    return drivers.find(d => d.id === id)?.name || '';
  }, [drivers]);

  const checkOverlap = useCallback((newStart: Date, days: number, carId: string, excludeBookingId: number | string | null = null) => {
    const newEnd = new Date(newStart);
    newEnd.setDate(newEnd.getDate() + days);
    newStart.setHours(0, 0, 0, 0);

    return bookings.some(b => {
      if (b.id === excludeBookingId) return false;
      if (b.carId !== carId) return false;
      if (b.status === 'cancelled') return false;

      const bStart = new Date(b.start);
      bStart.setHours(0, 0, 0, 0);
      const bEnd = new Date(bStart);
      bEnd.setDate(bEnd.getDate() + b.days);

      return newStart < bEnd && newEnd > bStart;
    });
  }, [bookings]);

  // ===== Event Handlers =====
  
  const handleMouseDown = (e: React.MouseEvent, booking: Booking, mode: 'move' | 'resize_start' | 'resize_end' = 'move') => {
    if (e.button !== 0) return;
    // Don't allow dragging contracts or maintenance
    if (String(booking.id).startsWith('contract-') || String(booking.id).startsWith('maintenance-')) {
      return;
    }
    e.stopPropagation();
    setContextMenu(null);

    const target = e.currentTarget.closest('[data-booking-id]');
    if (!target) return;
    const rect = target.getBoundingClientRect();
    
    setDragState({
      isDragging: true,
      mode,
      booking,
      startX: e.clientX,
      currX: e.clientX,
      initialDate: new Date(booking.start),
      initialDays: booking.days,
      initialLeft: rect.left,
      initialTop: rect.top,
      hasMoved: false,
      snapDate: new Date(booking.start),
      snapDays: booking.days,
      snapCarId: booking.carId
    });
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragState.isDragging || !dragState.booking || !dragState.initialDate) return;
      
      const deltaX = e.clientX - dragState.startX;
      const isMoving = dragState.hasMoved || Math.abs(deltaX) > 3;

      const daysShift = Math.round(deltaX / cellWidth);

      let nextDate = new Date(dragState.initialDate);
      let nextDays = dragState.initialDays;
      const nextCarId = dragState.booking.carId;

      if (dragState.mode === 'move') {
        nextDate.setDate(nextDate.getDate() + daysShift);
      } else if (dragState.mode === 'resize_end') {
        nextDays = Math.max(1, dragState.initialDays + daysShift);
      } else if (dragState.mode === 'resize_start') {
        const potentialDays = dragState.initialDays - daysShift;
        if (potentialDays >= 1) {
          nextDate.setDate(nextDate.getDate() + daysShift);
          nextDays = potentialDays;
        }
      }

      setDragState(prev => ({
        ...prev,
        currX: e.clientX,
        hasMoved: isMoving,
        snapDate: nextDate,
        snapDays: nextDays,
        snapCarId: nextCarId
      }));
    };

    const handleMouseUp = () => {
      if (!dragState.isDragging || !dragState.booking || !dragState.snapDate) return;

      if (dragState.hasMoved) {
        const finalDate = new Date(dragState.snapDate);
        finalDate.setHours(0, 0, 0, 0);
        const finalDays = dragState.snapDays;
        const finalCarId = dragState.snapCarId || dragState.booking.carId;

        const hasConflict = checkOverlap(finalDate, finalDays, finalCarId, dragState.booking.id);

        if (!hasConflict && String(dragState.booking.id).startsWith('reservation-')) {
          const endDate = new Date(finalDate);
          endDate.setDate(endDate.getDate() + finalDays - 1);
          
          updateReservation.mutate({
            id: String(dragState.booking.id),
            startDate: finalDate,
            endDate,
            vehicleId: finalCarId,
          });
        } else if (hasConflict) {
          setErrorMsg("عذراً، يوجد تداخل مع حجز آخر!");
          setTimeout(() => setErrorMsg(null), 3000);
        }
      }
      setDragState(prev => ({ ...prev, isDragging: false, booking: null }));
    };

    if (dragState.isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState, checkOverlap, updateReservation]);

  // ===== CRUD Handlers =====
  
  const handleNewBooking = (carId: string | null, startDate: Date | null) => {
    const car = carId ? getCarById(carId) : filteredCars[0];
    if (!car) {
      toast.error('لا توجد مركبات متاحة');
      return;
    }

    const start = startDate || new Date();
    start.setHours(0, 0, 0, 0);
    
    if (checkOverlap(start, 1, car.id)) {
      setErrorMsg("التاريخ المحدد مشغول لهذه السيارة");
      setTimeout(() => setErrorMsg(null), 3000);
      return;
    }

    setModalData({
      id: null,
      carId: car.id,
      start: formatDateForInput(start),
      days: 1,
      customer: '',
      status: 'confirmed',
      driverId: ''
    });
    setIsModalOpen(true);
  };

  const saveBooking = (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalData) return;

    const start = new Date(modalData.start);
    start.setHours(0, 0, 0, 0);
    const days = parseInt(modalData.days);
    const carId = modalData.carId;

    if (checkOverlap(start, days, carId, modalData.id)) {
      toast.error("لا يمكن الحفظ: يوجد تداخل مع حجز آخر!");
      return;
    }

    createReservation.mutate({
      carId,
      start: formatDateForInput(start),
      days,
      customer: modalData.customer,
      status: modalData.status,
      driverId: modalData.driverId || null,
    });
  };

  // ===== Context Menu =====
  
  const handleContextMenu = (e: React.MouseEvent, booking: Booking) => {
    e.preventDefault();
    setContextMenu({ x: e.clientX, y: e.clientY, booking });
  };

  const handleContextMenuAction = (action: string) => {
    if (!contextMenu) return;
    const { booking } = contextMenu;

    if (action === 'delete') {
      if (String(booking.id).startsWith('reservation-')) {
        cancelReservation.mutate(String(booking.id));
      }
    } else if (action === 'edit') {
      if (String(booking.id).startsWith('contract-')) {
        navigate(`/contracts/${booking.contractId}`);
      } else if (String(booking.id).startsWith('maintenance-')) {
        navigate('/fleet/maintenance');
      } else {
        setModalData({ 
          ...booking, 
          start: formatDateForInput(booking.start),
          driverId: booking.driverId || ''
        });
        setIsModalOpen(true);
      }
    } else if (action === 'confirm') {
      toast.info('سيتم تأكيد الحجز');
    } else if (action === 'active') {
      toast.info('سيتم تفعيل الحجز');
    }
    setContextMenu(null);
  };

  useEffect(() => {
    const closeMenu = () => setContextMenu(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  // ===== Drivers Handlers =====
  
  const handleNewDriver = () => {
    setDriverModalData({
      id: null,
      name: '',
      license: '',
      phone: '',
      status: 'available',
      location: ''
    });
    setIsDriverModalOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setDriverModalData({ ...driver });
    setIsDriverModalOpen(true);
  };

  const saveDriver = (e: React.FormEvent) => {
    e.preventDefault();
    toast.info('حفظ السائق - سيتم ربطه مع جدول الموظفين');
    setIsDriverModalOpen(false);
  };

  const deleteDriver = (id: number) => {
    if (confirm('هل أنت متأكد من حذف هذا السائق؟')) {
      toast.info('حذف السائق - سيتم تعديل سجل الموظف');
    }
  };

  // ===== Render =====
  
  const isLoading = vehiclesLoading || contractsLoading || reservationsLoading;

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-96 bg-slate-50">
        <Loader2 className="w-12 h-12 text-rose-500 animate-spin mb-4" />
        <p className="text-slate-600 font-medium">جاري تحميل جدول الحجوزات...</p>
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-280px)] bg-slate-50 text-slate-800 font-sans overflow-hidden" dir="rtl">
      
      {/* Toast Error */}
      {errorMsg && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-[100] bg-red-600 text-white px-6 py-3 rounded-full shadow-lg font-bold animate-bounce flex items-center gap-2">
          <AlertTriangle className="w-5 h-5" />
          {errorMsg}
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-slate-50">
        
        {currentView === 'scheduler' ? (
          <>
            {/* --- SCHEDULER HEADER --- */}
            <header className="bg-white border-b border-slate-200 shadow-sm z-40 flex-none px-6 py-3 flex justify-between items-center">
              <div className="flex gap-6 items-center">
                <h2 className="text-lg font-bold text-slate-800">الجدول الزمني</h2>
                
                {/* Navigation Tabs */}
                <div className="flex bg-slate-100 p-1 rounded-lg">
                  <button 
                    onClick={() => setCurrentView('scheduler')} 
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${currentView === 'scheduler' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <LayoutGrid className="w-4 h-4" /> الجدول
                  </button>
                  <button 
                    onClick={() => setCurrentView('drivers')} 
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${currentView === 'drivers' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Users className="w-4 h-4" /> السائقين
                  </button>
                </div>

                <div className="hidden lg:flex gap-4 border-r border-slate-200 pr-4 mr-4">
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs">
                    <DollarSign className="w-3.5 h-3.5 text-blue-600" />
                    <span className="text-slate-500">الدخل:</span>
                    <span className="font-bold text-slate-800">{stats.totalRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 text-xs">
                    <Activity className="w-3.5 h-3.5 text-green-600" />
                    <span className="text-slate-500">إشغال:</span>
                    <span className="font-bold text-slate-800">{stats.utilization}%</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="flex items-center bg-slate-100 rounded-lg px-3 py-2 border border-slate-200 focus-within:border-rose-500 transition-colors">
                  <Search className="w-4 h-4 text-slate-400 ml-2" />
                  <input 
                    type="text" 
                    placeholder="بحث مركبات..." 
                    className="bg-transparent border-none focus:outline-none text-sm w-32 md:w-48 text-slate-700"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button 
                  onClick={() => handleNewBooking(null, null)}
                  className="bg-rose-500 hover:bg-coral-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-bold shadow-sm transition"
                >
                  <Plus className="w-4 h-4" />
                  <span className="hidden md:inline">حجز جديد</span>
                </button>
              </div>
            </header>

            {/* --- SCHEDULER TOOLBAR --- */}
            <div className="flex items-center justify-between px-6 py-2 bg-white border-b border-slate-200 flex-none">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 bg-slate-50 rounded-lg border border-slate-200 p-1">
                  <button 
                    onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()-7); setCurrentDate(d); }} 
                    className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  <span className="font-bold text-slate-800 px-3 min-w-[120px] text-center text-sm">
                    {currentDate.toLocaleDateString('ar-EG', { month: 'short', year: 'numeric' })}
                  </span>
                  <button 
                    onClick={() => { const d = new Date(currentDate); d.setDate(d.getDate()+7); setCurrentDate(d); }} 
                    className="p-1 hover:bg-slate-200 rounded text-slate-600"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-400" />
                    <select 
                      value={filterType} 
                      onChange={(e) => setFilterType(e.target.value)} 
                      className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer"
                    >
                      {CAR_TYPES.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="flex items-center gap-2 border-r border-slate-200 pr-4">
                    <Car className="w-4 h-4 text-slate-400" />
                    <select 
                      value={filterStatus} 
                      onChange={(e) => setFilterStatus(e.target.value)} 
                      className="text-sm bg-transparent border-none focus:ring-0 text-slate-600 font-medium cursor-pointer"
                    >
                      {VEHICLE_STATUSES.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="flex gap-3 text-xs font-medium">
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#3B82F6]"></span> مؤكد</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#22C55E]"></span> جاري</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#FACC15]"></span> انتظار</div>
                <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#EF4444]"></span> صيانة</div>
              </div>
            </div>

            {/* --- SCHEDULER BODY --- */}
            <div className="flex-1 overflow-hidden flex flex-col relative select-none bg-white">
              {/* Timeline Header */}
              <div className="flex border-b border-slate-200 bg-white relative z-30 shadow-sm flex-none">
                <div className="w-64 flex-shrink-0 p-3 font-bold text-slate-700 border-l border-slate-200 bg-slate-50 flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <LayoutGrid className="w-4 h-4 text-slate-400" />
                    السيارات
                  </div>
                  <span className="text-xs bg-rose-100 text-coral-600 px-2 py-0.5 rounded-full font-bold">
                    {filteredCars.length}
                  </span>
                </div>
                <div className="flex-1 overflow-hidden">
                  <div className="flex" style={{ width: `${daysToShow * cellWidth}px` }}>
                    {dateHeaders.map((date, i) => {
                      const isToday = date.toDateString() === new Date().toDateString();
                      return (
                        <div 
                          key={i} 
                          className={`border-l border-slate-100 flex-shrink-0 text-center py-2 text-sm flex flex-col justify-center transition-colors relative ${isToday ? 'bg-red-50/40' : 'bg-white'}`} 
                          style={{ width: `${cellWidth}px` }}
                        >
                          <div className={`text-[10px] mb-0.5 ${isToday ? 'text-rose-500 font-bold' : 'text-slate-400'}`}>
                            {date.toLocaleDateString('ar-EG', { weekday: 'short' })}
                          </div>
                          <div className={`text-sm ${isToday ? 'text-rose-500 font-bold' : 'text-slate-700'}`}>
                            {date.getDate()}
                          </div>
                          {isToday && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-rose-500"></div>}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Rows */}
              <div ref={scrollContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden relative bg-white">
                <div 
                  className="absolute top-0 bottom-0 pointer-events-none z-10 border-r-2 border-rose-500 border-dashed opacity-50" 
                  style={{ 
                    right: 'auto', 
                    left: `${(Math.floor((new Date().getTime() - currentDate.getTime()) / (1000 * 60 * 60 * 24))) * cellWidth + cellWidth/2 + 256}px` 
                  }}
                ></div>

                {filteredCars.map(car => (
                  <div key={car.id} data-car-id={car.id} className="flex border-b border-slate-100 hover:bg-slate-50/50 transition group h-16 relative">
                    <div className="w-64 flex-shrink-0 px-4 py-2 border-l border-slate-200 flex flex-col justify-center bg-white z-40 relative group-hover:bg-slate-50 transition">
                      <div className="font-bold text-slate-800 text-sm truncate flex items-center gap-2">
                        {car.make} {car.model}
                        {car.status === 'available' && <div className="w-2 h-2 rounded-full bg-green-500"></div>}
                        {car.status === 'rented' && <div className="w-2 h-2 rounded-full bg-blue-500"></div>}
                        {car.status === 'reserved' && <div className="w-2 h-2 rounded-full bg-yellow-500"></div>}
                        {car.status === 'maintenance' && <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>}
                      </div>
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-slate-500 bg-slate-100 px-1.5 rounded border border-slate-200 font-mono">{car.plate_number}</span>
                        <span className="text-[11px] font-bold text-slate-900">{car.daily_rate} ر.ق</span>
                      </div>
                    </div>
                    <div className="flex-1 relative">
                      <div className="flex h-full absolute inset-0" style={{ width: `${daysToShow * cellWidth}px` }}>
                        {dateHeaders.map((date, i) => (
                          <div 
                            key={i} 
                            onClick={() => !dragState.hasMoved && handleNewBooking(car.id, date)} 
                            className={`border-l border-slate-100/80 h-full flex-shrink-0 cursor-pointer hover:bg-red-50/10 transition ${date.toDateString() === new Date().toDateString() ? 'bg-red-50/20' : ''}`} 
                            style={{ width: `${cellWidth}px` }} 
                          />
                        ))}
                      </div>
                      {bookings.filter(b => b.carId === car.id).map(booking => {
                        const diffTime = booking.start.getTime() - currentDate.getTime();
                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                        if (diffDays + booking.days < 0 || diffDays > daysToShow) return null;
                        const left = diffDays * cellWidth;
                        const width = booking.days * cellWidth;
                        const isBeingDragged = dragState.isDragging && dragState.booking?.id === booking.id;
                        
                        const assignedDriver = booking.driverId ? drivers.find(d => d.id === booking.driverId) : null;
                        const isReservation = String(booking.id).startsWith('reservation-');

                        return (
                          <div 
                            key={booking.id} 
                            data-booking-id={booking.id} 
                            onMouseDown={(e) => handleMouseDown(e, booking, 'move')} 
                            onDoubleClick={(e) => { 
                              e.stopPropagation(); 
                              handleContextMenuAction('edit');
                            }} 
                            onContextMenu={(e) => handleContextMenu(e, booking)} 
                            onMouseEnter={() => setHoveredBooking(booking.id)} 
                            onMouseLeave={() => setHoveredBooking(null)} 
                            className={`absolute top-2 h-12 rounded-md shadow-sm border group/booking flex flex-col justify-center px-3 text-xs overflow-hidden transition-all z-20 hover:shadow-md hover:z-30 ${getStatusColor(booking.status)} ${isBeingDragged ? 'opacity-30' : ''} ${isReservation ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`} 
                            style={{ left: `${left}px`, width: `${width - 8}px`, direction: 'rtl' }}
                          >
                            {isReservation && (
                              <>
                                <div 
                                  className="absolute left-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-40 transition-colors flex items-center justify-center" 
                                  onMouseDown={(e) => handleMouseDown(e, booking, 'resize_start')}
                                >
                                  <div className="w-1 h-4 bg-white/40 rounded-full"></div>
                                </div>
                                <div 
                                  className="absolute right-0 top-0 bottom-0 w-3 cursor-ew-resize hover:bg-black/10 z-40 transition-colors flex items-center justify-center" 
                                  onMouseDown={(e) => handleMouseDown(e, booking, 'resize_end')}
                                >
                                  <div className="w-1 h-4 bg-white/40 rounded-full"></div>
                                </div>
                              </>
                            )}
                            
                            <div className="flex justify-between items-center w-full">
                              <div className="font-bold truncate text-[12px] select-none pointer-events-none flex-1">{booking.customer}</div>
                              {assignedDriver && (
                                <div className="flex-none bg-white/20 p-1 rounded-full mr-1" title={assignedDriver.name}>
                                  <User className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            
                            {hoveredBooking === booking.id && !dragState.isDragging && (
                              <div className="absolute -top-10 right-0 bg-slate-800 text-white text-[10px] p-2 rounded shadow-lg z-50 whitespace-nowrap pointer-events-none flex flex-col gap-1">
                                <span>{booking.days} أيام • {car.daily_rate * booking.days} ر.ق</span>
                                {assignedDriver && <span className="text-yellow-300 flex items-center gap-1"><User className="w-3 h-3"/> {assignedDriver.name}</span>}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
                
                {filteredCars.length === 0 && (
                  <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-2">
                    <Car className="w-12 h-12 text-slate-200" />
                    <p>لا توجد مركبات مطابقة للبحث</p>
                  </div>
                )}
              </div>
            </div>

            {/* Ghost Element */}
            {dragState.isDragging && dragState.booking && (
              <div 
                className={`fixed pointer-events-none z-[35] rounded-md shadow-2xl border-2 px-3 py-1 flex flex-col justify-center text-xs opacity-95 scale-105 ${getStatusColor(dragState.booking.status)}`} 
                style={{ 
                  left: dragState.mode === 'move' 
                    ? dragState.initialLeft + (dragState.currX - dragState.startX) 
                    : dragState.initialLeft + (dragState.mode === 'resize_start' ? (dragState.currX - dragState.startX) : 0), 
                  top: dragState.initialTop, 
                  width: `${dragState.snapDays * cellWidth - 8}px`, 
                  height: '48px', 
                  direction: 'rtl' 
                }}
              >
                <div className="flex justify-between items-center border-b border-white/20 pb-1 mb-1">
                  <span className="font-bold truncate text-white">{getCarName(dragState.snapCarId || '')}</span>
                </div>
                <div className="flex justify-between items-end">
                  <div className="font-bold truncate text-sm text-white">{dragState.booking.customer}</div>
                  <div className="text-[10px] bg-black/20 text-white px-1.5 py-0.5 rounded font-mono">{dragState.snapDays} يوم</div>
                </div>
                {dragState.snapDate && checkOverlap(dragState.snapDate, dragState.snapDays, dragState.snapCarId || '', dragState.booking.id) && (
                  <div className="absolute inset-0 bg-red-500/50 flex items-center justify-center font-bold text-white text-sm">تداخل!</div>
                )}
              </div>
            )}
            
            {/* Booking Modal */}
            {isModalOpen && modalData && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h3 className="font-bold text-xl text-slate-800">{modalData.id ? 'تعديل الحجز' : 'حجز جديد'}</h3>
                    <button onClick={() => setIsModalOpen(false)} className="bg-white p-1 rounded-full text-slate-400 hover:text-slate-600 shadow-sm border border-slate-100">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={saveBooking} className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">العميل</label>
                      <input 
                        required 
                        type="text" 
                        value={modalData.customer} 
                        onChange={e => setModalData({...modalData, customer: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none" 
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">السيارة</label>
                        <select 
                          value={modalData.carId} 
                          onChange={e => setModalData({...modalData, carId: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                        >
                          {vehicles.map(c => <option key={c.id} value={c.id}>{c.make} {c.model}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">الحالة</label>
                        <select 
                          value={modalData.status} 
                          onChange={e => setModalData({...modalData, status: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                        >
                          <option value="pending">انتظار</option>
                          <option value="confirmed">مؤكد</option>
                          <option value="active">جاري</option>
                        </select>
                      </div>
                    </div>
                    
                    {/* Driver Selection */}
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">السائق (اختياري)</label>
                      <select 
                        value={modalData.driverId || ''} 
                        onChange={e => setModalData({...modalData, driverId: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                      >
                        <option value="">-- بدون سائق --</option>
                        {drivers.map(driver => (
                          <option key={driver.id} value={driver.id}>
                            {driver.name} ({driver.status === 'available' ? 'متاح' : 'مشغول'})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">تاريخ البدء</label>
                        <input 
                          required 
                          type="date" 
                          value={modalData.start} 
                          onChange={e => setModalData({...modalData, start: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">المدة (أيام)</label>
                        <input 
                          required 
                          type="number" 
                          min="1" 
                          max="30" 
                          value={modalData.days} 
                          onChange={e => setModalData({...modalData, days: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500" 
                        />
                      </div>
                    </div>
                    
                    <div className="bg-slate-50 rounded-xl p-4 flex justify-between items-center border border-slate-100">
                      <div className="text-sm text-slate-500">التكلفة المتوقعة</div>
                      <div className="font-bold text-lg text-rose-500">
                        {(getCarPrice(modalData.carId) * modalData.days).toLocaleString()} ر.ق
                      </div>
                    </div>
                    
                    <div className="pt-2">
                      <button 
                        type="submit" 
                        disabled={createReservation.isPending}
                        className="w-full bg-rose-500 hover:bg-coral-600 text-white py-2.5 rounded-xl font-bold shadow-md shadow-rose-200 transition disabled:opacity-50"
                      >
                        {createReservation.isPending ? 'جاري الحفظ...' : 'حفظ التغييرات'}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </>
        ) : (
          /* --- DRIVERS VIEW --- */
          <div className="p-8 h-full overflow-y-auto">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">قائمة السائقين</h2>
                
                {/* Navigation Tabs (Drivers View) */}
                <div className="flex bg-slate-100 p-1 rounded-lg mt-2 inline-flex">
                  <button 
                    onClick={() => setCurrentView('scheduler')} 
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${currentView === 'scheduler' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <LayoutGrid className="w-4 h-4" /> الجدول
                  </button>
                  <button 
                    onClick={() => setCurrentView('drivers')} 
                    className={`px-4 py-1.5 rounded-md text-sm font-bold transition flex items-center gap-2 ${currentView === 'drivers' ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                  >
                    <Users className="w-4 h-4" /> السائقين
                  </button>
                </div>
              </div>
              <button 
                onClick={handleNewDriver} 
                className="bg-rose-500 hover:bg-coral-600 text-white px-6 py-2.5 rounded-xl font-bold shadow-sm transition flex items-center gap-2"
              >
                <Plus className="w-5 h-5" /> إضافة سائق
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-100 flex items-center gap-4">
                <div className="flex items-center bg-slate-50 rounded-lg px-3 py-2 border border-slate-200 w-96">
                  <Search className="w-5 h-5 text-slate-400 ml-2" />
                  <input 
                    type="text" 
                    placeholder="بحث بالاسم أو رقم الرخصة..." 
                    className="bg-transparent border-none focus:outline-none text-sm w-full"
                    value={driverSearch}
                    onChange={e => setDriverSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-600 font-bold text-sm">
                    <tr>
                      <th className="px-6 py-4 rounded-tr-lg">الاسم</th>
                      <th className="px-6 py-4">رقم الرخصة</th>
                      <th className="px-6 py-4">الجوال</th>
                      <th className="px-6 py-4">الموقع</th>
                      <th className="px-6 py-4">الحالة</th>
                      <th className="px-6 py-4 rounded-tl-lg">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                    {filteredDrivers.map(driver => (
                      <tr key={driver.id} className="hover:bg-slate-50 transition group">
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold">
                              {driver.name.charAt(0)}
                            </div>
                            <div className="font-bold text-slate-800">{driver.name}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-mono text-slate-600">{driver.license}</td>
                        <td className="px-6 py-4 text-slate-600" dir="ltr">{driver.phone}</td>
                        <td className="px-6 py-4 text-slate-600">{driver.location}</td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                            driver.status === 'available' ? 'bg-green-100 text-green-700' :
                            driver.status === 'busy' ? 'bg-orange-100 text-orange-700' :
                            'bg-slate-100 text-slate-700'
                          }`}>
                            {driver.status === 'available' ? 'متاح' : driver.status === 'busy' ? 'مشغول' : 'إجازة'}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition">
                            <button onClick={() => handleEditDriver(driver)} className="p-2 hover:bg-blue-50 text-blue-600 rounded-lg">
                              <FileText className="w-4 h-4" />
                            </button>
                            <button onClick={() => deleteDriver(driver.id)} className="p-2 hover:bg-red-50 text-red-600 rounded-lg">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filteredDrivers.length === 0 && (
                  <div className="p-12 text-center text-slate-400">
                    {driversLoading ? 'جاري تحميل السائقين...' : 'لا يوجد سائقين مطابقين'}
                  </div>
                )}
              </div>
            </div>

            {/* Driver Modal */}
            {isDriverModalOpen && driverModalData && (
              <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center backdrop-blur-sm p-4">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-xl text-slate-800">{driverModalData?.id ? 'تعديل بيانات سائق' : 'إضافة سائق جديد'}</h3>
                    <button onClick={() => setIsDriverModalOpen(false)} className="bg-white p-1 rounded-full text-slate-400 hover:text-slate-600 shadow-sm">
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <form onSubmit={saveDriver} className="p-6 space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-slate-700 mb-1.5">الاسم الثلاثي</label>
                      <input 
                        required 
                        type="text" 
                        value={driverModalData.name} 
                        onChange={e => setDriverModalData({...driverModalData, name: e.target.value})} 
                        className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 focus:outline-none" 
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الرخصة</label>
                        <input 
                          required 
                          type="text" 
                          value={driverModalData.license} 
                          onChange={e => setDriverModalData({...driverModalData, license: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">رقم الجوال</label>
                        <input 
                          required 
                          type="text" 
                          value={driverModalData.phone} 
                          onChange={e => setDriverModalData({...driverModalData, phone: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500" 
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">الموقع الحالي</label>
                        <input 
                          type="text" 
                          value={driverModalData.location} 
                          onChange={e => setDriverModalData({...driverModalData, location: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500" 
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1.5">الحالة</label>
                        <select 
                          value={driverModalData.status} 
                          onChange={e => setDriverModalData({...driverModalData, status: e.target.value})} 
                          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-rose-500 bg-white"
                        >
                          <option value="available">متاح</option>
                          <option value="busy">مشغول</option>
                          <option value="vacation">إجازة</option>
                        </select>
                      </div>
                    </div>
                    <div className="pt-2">
                      <button type="submit" className="w-full bg-rose-500 hover:bg-coral-600 text-white py-2.5 rounded-xl font-bold shadow-md shadow-rose-200 transition">
                        حفظ البيانات
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Context Menu (Scheduler) */}
      {contextMenu && (
        <div 
          className="fixed bg-white border border-slate-200 shadow-xl rounded-lg py-1 z-[60] text-sm w-48 text-right" 
          style={{ top: contextMenu.y, left: contextMenu.x }} 
          onClick={(e) => e.stopPropagation()}
        >
          <div className="px-3 py-2 border-b border-slate-100 font-bold text-slate-700 bg-slate-50">{contextMenu.booking.customer}</div>
          <button onClick={() => handleContextMenuAction('edit')} className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
            <Clock className="w-4 h-4 text-slate-400" /> 
            {String(contextMenu.booking.id).startsWith('contract-') ? 'عرض العقد' : 'تعديل الحجز'}
          </button>
          {!String(contextMenu.booking.id).startsWith('contract-') && !String(contextMenu.booking.id).startsWith('maintenance-') && (
            <>
              <button onClick={() => handleContextMenuAction('confirm')} className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-blue-500" /> تأكيد (مؤكد)
              </button>
              <button onClick={() => handleContextMenuAction('active')} className="w-full text-right px-4 py-2 hover:bg-slate-50 flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-500" /> بدء الرحلة (جاري)
              </button>
              <div className="border-t border-slate-100 my-1"></div>
              <button onClick={() => handleContextMenuAction('delete')} className="w-full text-right px-4 py-2 hover:bg-red-50 text-red-600 flex items-center gap-2">
                <Trash2 className="w-4 h-4" /> حذف الحجز
              </button>
            </>
          )}
        </div>
      )}

      <style>{`
        .stripes { background-image: linear-gradient(45deg,rgba(255,255,255,.15) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.15) 50%,rgba(255,255,255,.15) 75%,transparent 75%,transparent); background-size: 1rem 1rem; }
        .flex-1.relative { direction: ltr; }
      `}</style>
    </div>
  );
}
