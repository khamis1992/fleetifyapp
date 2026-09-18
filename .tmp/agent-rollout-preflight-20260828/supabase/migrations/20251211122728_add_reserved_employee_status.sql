-- إضافة حالة "محجوزة لموظف" للمركبات
ALTER TYPE vehicle_status ADD VALUE IF NOT EXISTS 'reserved_employee';;
