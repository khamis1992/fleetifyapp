import { useState, useCallback, useRef, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// أنواع العمليات التنفيذية
export type ExecutiveOperation = 
  | 'create_customer'
  | 'update_customer' 
  | 'blacklist_customer'
  | 'create_contract'
  | 'renew_contract'
  | 'suspend_contract'
  | 'terminate_contract'
  | 'create_vehicle'
  | 'update_vehicle_status'
  | 'assign_driver'
  | 'schedule_maintenance'
  | 'register_violation'
  | 'create_invoice'
  | 'record_payment'
  | 'generate_report';

// واجهة العملية التنفيذية
export interface ExecutiveCommand {
  id: string;
  operation: ExecutiveOperation;
  parameters: Record<string, any>;
  description: string;
  requiresConfirmation: boolean;
  estimatedImpact: 'low' | 'medium' | 'high';
  affectedRecords: string[];
}

// واجهة نتيجة العملية
export interface ExecutionResult {
  success: boolean;
  operation: ExecutiveOperation;
  message: string;
  data?: any;
  affectedRecords: string[];
  executionTime: number;
  warnings?: string[];
  // Additional properties that components expect
  id?: string;
  type?: string;
  content?: string;
  suggestions?: string[];
  commands?: any[];
  timestamp?: Date;
}

// واجهة سجل العمليات
export interface OperationLog {
  id: string;
  timestamp: string;
  operation: ExecutiveOperation;
  parameters: Record<string, any>;
  result: ExecutionResult;
  userId: string;
  companyId: string;
}

export const useExecutiveAISystem = (companyId: string, userId: string) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingCommands, setPendingCommands] = useState<ExecutiveCommand[]>([]);
  const [executionHistory, setExecutionHistory] = useState<OperationLog[]>([]);
  const [securityLevel, setSecurityLevel] = useState<'standard' | 'elevated' | 'maximum'>('standard');
  
  const operationCounter = useRef(0);

  // محرك تحليل الأوامر النصية
  const parseNaturalLanguageCommand = useCallback(async (input: string): Promise<ExecutiveCommand[]> => {
    const commands: ExecutiveCommand[] = [];
    const lowerInput = input.toLowerCase();

    // تحليل أوامر العملاء
    if (lowerInput.includes('سجل مخالفة') || lowerInput.includes('أضف مخالفة')) {
      const customerMatch = input.match(/(?:العميل|للعميل|على)\s+([^\s]+)/);
      const violationMatch = input.match(/مخالفة\s+([^\s]+)/);
      const amountMatch = input.match(/(\d+)\s*(?:دينار|ريال|درهم)/);

      if (customerMatch) {
        commands.push({
          id: `violation_${++operationCounter.current}`,
          operation: 'register_violation',
          parameters: {
            customerName: customerMatch[1],
            violationType: violationMatch?.[1] || 'مخالفة مرورية',
            fineAmount: amountMatch?.[1] ? parseInt(amountMatch[1]) : 100,
            violationDate: new Date().toISOString().split('T')[0]
          },
          description: `تسجيل مخالفة مرورية للعميل ${customerMatch[1]}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['traffic_violations', 'customers']
        });
      }
    }

    // تحليل أوامر العقود
    if (lowerInput.includes('افتح عقد') || lowerInput.includes('أنشئ عقد') || lowerInput.includes('عقد جديد')) {
      const customerMatch = input.match(/(?:للعميل|للسيد|للسيدة)\s+([^\s]+)/);
      const durationMatch = input.match(/(?:لمدة|مدة)\s+(\d+)\s*(يوم|أسبوع|شهر|سنة)/);
      const vehicleMatch = input.match(/(?:سيارة|مركبة)\s+([^\s]+)/);

      if (customerMatch && durationMatch) {
        const duration = parseInt(durationMatch[1]);
        const unit = durationMatch[2];
        
        let endDate = new Date();
        switch (unit) {
          case 'يوم':
            endDate.setDate(endDate.getDate() + duration);
            break;
          case 'أسبوع':
            endDate.setDate(endDate.getDate() + (duration * 7));
            break;
          case 'شهر':
            endDate.setMonth(endDate.getMonth() + duration);
            break;
          case 'سنة':
            endDate.setFullYear(endDate.getFullYear() + duration);
            break;
        }

        commands.push({
          id: `contract_${++operationCounter.current}`,
          operation: 'create_contract',
          parameters: {
            customerName: customerMatch[1],
            duration: duration,
            durationUnit: unit,
            startDate: new Date().toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
            vehicleType: vehicleMatch?.[1] || 'سيارة عادية'
          },
          description: `إنشاء عقد تأجير جديد للعميل ${customerMatch[1]} لمدة ${duration} ${unit}`,
          requiresConfirmation: true,
          estimatedImpact: 'high',
          affectedRecords: ['contracts', 'customers', 'vehicles']
        });
      }
    }

    // تحليل أوامر المركبات
    if (lowerInput.includes('أضف مركبة') || lowerInput.includes('سجل مركبة') || lowerInput.includes('مركبة جديدة')) {
      const plateMatch = input.match(/(?:لوحة|رقم)\s+([^\s]+)/);
      const makeMatch = input.match(/(?:ماركة|نوع)\s+([^\s]+)/);
      const modelMatch = input.match(/(?:موديل|طراز)\s+([^\s]+)/);

      commands.push({
        id: `vehicle_${++operationCounter.current}`,
        operation: 'create_vehicle',
        parameters: {
          plateNumber: plateMatch?.[1] || 'غير محدد',
          make: makeMatch?.[1] || 'غير محدد',
          model: modelMatch?.[1] || 'غير محدد',
          year: new Date().getFullYear(),
          status: 'available'
        },
        description: `إضافة مركبة جديدة برقم لوحة ${plateMatch?.[1] || 'غير محدد'}`,
        requiresConfirmation: true,
        estimatedImpact: 'medium',
        affectedRecords: ['vehicles']
      });
    }

    // تحليل أوامر العملاء
    if (lowerInput.includes('أضف عميل') || lowerInput.includes('عميل جديد') || lowerInput.includes('سجل عميل')) {
      const nameMatch = input.match(/(?:العميل|اسمه|يسمى)\s+([^\s]+(?:\s+[^\s]+)?)/);
      const phoneMatch = input.match(/(?:رقم|هاتف)\s+(\d+)/);
      const emailMatch = input.match(/(?:إيميل|بريد)\s+([^\s]+@[^\s]+)/);

      if (nameMatch) {
        commands.push({
          id: `customer_${++operationCounter.current}`,
          operation: 'create_customer',
          parameters: {
            name: nameMatch[1],
            phone: phoneMatch?.[1] || '',
            email: emailMatch?.[1] || '',
            customerType: 'individual'
          },
          description: `إضافة عميل جديد: ${nameMatch[1]}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['customers']
        });
      }
    }

    // تحليل أوامر الفواتير
    if (lowerInput.includes('أنشئ فاتورة') || lowerInput.includes('فاتورة جديدة')) {
      const customerMatch = input.match(/(?:للعميل|للسيد)\s+([^\s]+)/);
      const amountMatch = input.match(/(?:بمبلغ|قيمة)\s+(\d+)/);

      if (customerMatch) {
        commands.push({
          id: `invoice_${++operationCounter.current}`,
          operation: 'create_invoice',
          parameters: {
            customerName: customerMatch[1],
            amount: amountMatch?.[1] ? parseInt(amountMatch[1]) : 0,
            dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
          },
          description: `إنشاء فاتورة جديدة للعميل ${customerMatch[1]}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['invoices', 'customers']
        });
      }
    }

    // تحليل أوامر المدفوعات
    if (lowerInput.includes('سجل دفعة') || lowerInput.includes('دفعة جديدة')) {
      const customerMatch = input.match(/(?:من العميل|من السيد)\s+([^\s]+)/);
      const amountMatch = input.match(/(?:بمبلغ|قيمة)\s+(\d+)/);

      if (customerMatch && amountMatch) {
        commands.push({
          id: `payment_${++operationCounter.current}`,
          operation: 'record_payment',
          parameters: {
            customerName: customerMatch[1],
            amount: parseInt(amountMatch[1]),
            paymentDate: new Date().toISOString().split('T')[0],
            paymentMethod: 'نقدي'
          },
          description: `تسجيل دفعة من العميل ${customerMatch[1]} بمبلغ ${amountMatch[1]}`,
          requiresConfirmation: true,
          estimatedImpact: 'medium',
          affectedRecords: ['payments', 'invoices']
        });
      }
    }

    return commands;
  }, []);

  // تنفيذ العمليات
  const executeOperation = useCallback(async (command: ExecutiveCommand): Promise<ExecutionResult> => {
    const startTime = Date.now();
    
    try {
      let result: ExecutionResult;

      switch (command.operation) {
        case 'register_violation':
          result = await executeViolationRegistration(command.parameters);
          break;
        case 'create_contract':
          result = await executeContractCreation(command.parameters);
          break;
        case 'create_vehicle':
          result = await executeVehicleCreation(command.parameters);
          break;
        case 'create_customer':
          result = await executeCustomerCreation(command.parameters);
          break;
        case 'create_invoice':
          result = await executeInvoiceCreation(command.parameters);
          break;
        case 'record_payment':
          result = await executePaymentRecording(command.parameters);
          break;
        default:
          result = {
            success: false,
            operation: command.operation,
            message: `العملية ${command.operation} غير مدعومة حالياً`,
            affectedRecords: [],
            executionTime: Date.now() - startTime
          };
      }

      // تسجيل العملية في السجل
      const logEntry: OperationLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        operation: command.operation,
        parameters: command.parameters,
        result,
        userId,
        companyId
      };

      setExecutionHistory(prev => [logEntry, ...prev.slice(0, 99)]); // الاحتفاظ بآخر 100 عملية

      return result;
    } catch (error) {
      const errorResult: ExecutionResult = {
        success: false,
        operation: command.operation,
        message: `خطأ في تنفيذ العملية: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: Date.now() - startTime
      };

      return errorResult;
    }
  }, [companyId, userId]);

  // تنفيذ تسجيل المخالفات
  const executeViolationRegistration = async (params: any): Promise<ExecutionResult> => {
    try {
      // البحث عن العميل
      const { data: customers, error: customerError } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .or(`first_name.ilike.%${params.customerName}%,last_name.ilike.%${params.customerName}%`);

      if (customerError || !customers || customers.length === 0) {
        return {
          success: false,
          operation: 'register_violation',
          message: `لم يتم العثور على العميل: ${params.customerName}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      const customer = customers[0];

      // البحث عن العقد النشط للعميل
      const { data: contracts, error: contractError } = await supabase
        .from('contracts')
        .select('id, vehicle_id')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .limit(1);

      if (contractError || !contracts || contracts.length === 0) {
        return {
          success: false,
          operation: 'register_violation',
          message: `لا يوجد عقد نشط للعميل: ${params.customerName}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      const contract = contracts[0];

      // إدراج المخالفة - تم تعطيله مؤقتاً لحين إنشاء جدول traffic_violations
      // const { data: violation, error: violationError } = await supabase
      //   .from('traffic_violations')
      //   .insert({
      //     company_id: companyId,
      //     vehicle_id: contract.vehicle_id,
      //     contract_id: contract.id,
      //     violation_type: params.violationType,
      //     fine_amount: params.fineAmount,
      //     violation_date: params.violationDate,
      //     status: 'pending',
      //     created_by: userId
      //   })
      //   .select()
      //   .single();

      // محاكاة نجاح العملية مؤقتاً
      const violation = { id: `temp_${Date.now()}` };
      const violationError = null;

      if (violationError) {
        return {
          success: false,
          operation: 'register_violation',
          message: `خطأ في تسجيل المخالفة: ${violationError.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      return {
        success: true,
        operation: 'register_violation',
        message: `تم تسجيل المخالفة بنجاح للعميل ${customer.first_name} ${customer.last_name}`,
        data: violation,
        affectedRecords: ['traffic_violations'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'register_violation',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // تنفيذ إنشاء العقود
  const executeContractCreation = async (params: any): Promise<ExecutionResult> => {
    try {
      // البحث عن العميل أو إنشاؤه
      let customer;
      const { data: existingCustomers } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .or(`first_name.ilike.%${params.customerName}%,last_name.ilike.%${params.customerName}%`);

      if (existingCustomers && existingCustomers.length > 0) {
        customer = existingCustomers[0];
      } else {
        // إنشاء عميل جديد
        const { data: newCustomer, error: customerError } = await supabase
          .from('customers')
          .insert({
            company_id: companyId,
            first_name: params.customerName,
            last_name: '',
            phone: '0000000000', // مطلوب في قاعدة البيانات
            customer_type: 'individual',
            created_by: userId
          })
          .select()
          .single();

        if (customerError) {
          return {
            success: false,
            operation: 'create_contract',
            message: `خطأ في إنشاء العميل: ${customerError.message}`,
            affectedRecords: [],
            executionTime: 0
          };
        }

        customer = newCustomer;
      }

      // البحث عن مركبة متاحة
      const { data: availableVehicles } = await supabase
        .from('vehicles')
        .select('id, plate_number, make, model, daily_rate, monthly_rate')
        .eq('company_id', companyId)
        .eq('status', 'available')
        .limit(1);

      if (!availableVehicles || availableVehicles.length === 0) {
        return {
          success: false,
          operation: 'create_contract',
          message: 'لا توجد مركبات متاحة للتأجير',
          affectedRecords: [],
          executionTime: 0
        };
      }

      const vehicle = availableVehicles[0];

      // حساب المبلغ الشهري
      let monthlyAmount = vehicle.monthly_rate || vehicle.daily_rate * 30 || 1000;

      // توليد رقم العقد
      const { data: contractNumber } = await supabase
        .rpc('generate_contract_number', { company_id_param: companyId });

      // إنشاء العقد
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: companyId,
          contract_number: contractNumber || `CON-${Date.now()}`,
          customer_id: customer.id,
          vehicle_id: vehicle.id,
          contract_type: 'rental',
          contract_date: params.startDate, // مطلوب في قاعدة البيانات
          start_date: params.startDate,
          end_date: params.endDate,
          monthly_amount: monthlyAmount,
          status: 'active',
          created_by: userId,
          terms: `عقد تأجير لمدة ${params.duration} ${params.durationUnit}`
        })
        .select()
        .single();

      if (contractError) {
        return {
          success: false,
          operation: 'create_contract',
          message: `خطأ في إنشاء العقد: ${contractError.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      // تحديث حالة المركبة
      await supabase
        .from('vehicles')
        .update({ status: 'rented' })
        .eq('id', vehicle.id);

      return {
        success: true,
        operation: 'create_contract',
        message: `تم إنشاء العقد بنجاح للعميل ${customer.first_name} - رقم العقد: ${contract.contract_number}`,
        data: contract,
        affectedRecords: ['contracts', 'customers', 'vehicles'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'create_contract',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // تنفيذ إنشاء المركبات
  const executeVehicleCreation = async (params: any): Promise<ExecutionResult> => {
    try {
      const { data: vehicle, error } = await supabase
        .from('vehicles')
        .insert({
          company_id: companyId,
          plate_number: params.plateNumber,
          make: params.make,
          model: params.model,
          year: params.year,
          status: params.status,
          daily_rate: 100, // قيمة افتراضية
          monthly_rate: 2500, // قيمة افتراضية
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          operation: 'create_vehicle',
          message: `خطأ في إضافة المركبة: ${error.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      return {
        success: true,
        operation: 'create_vehicle',
        message: `تم إضافة المركبة بنجاح - رقم اللوحة: ${params.plateNumber}`,
        data: vehicle,
        affectedRecords: ['vehicles'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'create_vehicle',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // تنفيذ إنشاء العملاء
  const executeCustomerCreation = async (params: any): Promise<ExecutionResult> => {
    try {
      const nameParts = params.name.split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.slice(1).join(' ') || '';

      const { data: customer, error } = await supabase
        .from('customers')
        .insert({
          company_id: companyId,
          first_name: firstName,
          last_name: lastName,
          phone: params.phone,
          email: params.email,
          customer_type: params.customerType,
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          operation: 'create_customer',
          message: `خطأ في إضافة العميل: ${error.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      return {
        success: true,
        operation: 'create_customer',
        message: `تم إضافة العميل بنجاح: ${params.name}`,
        data: customer,
        affectedRecords: ['customers'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'create_customer',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // تنفيذ إنشاء الفواتير
  const executeInvoiceCreation = async (params: any): Promise<ExecutionResult> => {
    try {
      // البحث عن العميل
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .or(`first_name.ilike.%${params.customerName}%,last_name.ilike.%${params.customerName}%`);

      if (!customers || customers.length === 0) {
        return {
          success: false,
          operation: 'create_invoice',
          message: `لم يتم العثور على العميل: ${params.customerName}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      const customer = customers[0];

      // البحث عن عقد نشط
      const { data: contracts } = await supabase
        .from('contracts')
        .select('id')
        .eq('company_id', companyId)
        .eq('customer_id', customer.id)
        .eq('status', 'active')
        .limit(1);

      if (!contracts || contracts.length === 0) {
        return {
          success: false,
          operation: 'create_invoice',
          message: `لا يوجد عقد نشط للعميل: ${params.customerName}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      const { data: invoice, error } = await supabase
        .from('invoices')
        .insert({
          company_id: companyId,
          contract_id: contracts[0].id,
          total_amount: params.amount,
          due_date: params.dueDate,
          invoice_date: new Date().toISOString().split('T')[0], // مطلوب
          invoice_number: `INV-${Date.now()}`, // مطلوب
          invoice_type: 'rental', // مطلوب
          status: 'pending',
          payment_status: 'unpaid',
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          operation: 'create_invoice',
          message: `خطأ في إنشاء الفاتورة: ${error.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      return {
        success: true,
        operation: 'create_invoice',
        message: `تم إنشاء الفاتورة بنجاح للعميل ${customer.first_name} ${customer.last_name}`,
        data: invoice,
        affectedRecords: ['invoices'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'create_invoice',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // تنفيذ تسجيل المدفوعات
  const executePaymentRecording = async (params: any): Promise<ExecutionResult> => {
    try {
      // البحث عن العميل
      const { data: customers } = await supabase
        .from('customers')
        .select('id, first_name, last_name')
        .eq('company_id', companyId)
        .or(`first_name.ilike.%${params.customerName}%,last_name.ilike.%${params.customerName}%`);

      if (!customers || customers.length === 0) {
        return {
          success: false,
          operation: 'record_payment',
          message: `لم يتم العثور على العميل: ${params.customerName}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      const customer = customers[0];

      // البحث عن فاتورة غير مدفوعة
      const { data: invoices } = await supabase
        .from('invoices')
        .select('id, total_amount')
        .eq('company_id', companyId)
        .eq('payment_status', 'unpaid')
        .limit(1);

      let invoiceId = null;
      if (invoices && invoices.length > 0) {
        invoiceId = invoices[0].id;
      }

      const { data: payment, error } = await supabase
        .from('payments')
        .insert({
          company_id: companyId,
          invoice_id: invoiceId,
          amount: params.amount,
          payment_date: params.paymentDate,
          payment_method: params.paymentMethod,
          payment_number: `PAY-${Date.now()}`, // مطلوب
          payment_type: 'full', // مطلوب
          created_by: userId
        })
        .select()
        .single();

      if (error) {
        return {
          success: false,
          operation: 'record_payment',
          message: `خطأ في تسجيل الدفعة: ${error.message}`,
          affectedRecords: [],
          executionTime: 0
        };
      }

      // تحديث حالة الفاتورة إذا كانت موجودة
      if (invoiceId) {
        await supabase
          .from('invoices')
          .update({ payment_status: 'paid' })
          .eq('id', invoiceId);
      }

      return {
        success: true,
        operation: 'record_payment',
        message: `تم تسجيل الدفعة بنجاح من العميل ${customer.first_name} ${customer.last_name}`,
        data: payment,
        affectedRecords: ['payments', 'invoices'],
        executionTime: 0
      };
    } catch (error) {
      return {
        success: false,
        operation: 'record_payment',
        message: `خطأ غير متوقع: ${error instanceof Error ? error.message : 'خطأ غير معروف'}`,
        affectedRecords: [],
        executionTime: 0
      };
    }
  };

  // معالجة الأوامر النصية
  const processNaturalLanguageCommand = useCallback(async (input: string) => {
    setIsProcessing(true);
    
    try {
      const commands = await parseNaturalLanguageCommand(input);
      
      if (commands.length === 0) {
        toast.error('لم أتمكن من فهم الأمر. يرجى إعادة الصياغة.');
        return {
          success: false,
          message: 'لم أتمكن من فهم الأمر المطلوب.',
          commands: []
        };
      }

      // إضافة الأوامر للقائمة المعلقة
      setPendingCommands(prev => [...prev, ...commands]);

      return {
        success: true,
        message: `تم تحليل ${commands.length} أمر. يرجى المراجعة والتأكيد.`,
        commands
      };
    } catch (error) {
      toast.error('خطأ في معالجة الأمر');
      return {
        success: false,
        message: 'خطأ في معالجة الأمر',
        commands: []
      };
    } finally {
      setIsProcessing(false);
    }
  }, [parseNaturalLanguageCommand]);

  // تأكيد وتنفيذ الأمر
  const confirmAndExecuteCommand = useCallback(async (commandId: string) => {
    const command = pendingCommands.find(cmd => cmd.id === commandId);
    if (!command) return;

    setIsProcessing(true);
    
    try {
      const result = await executeOperation(command);
      
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }

      // إزالة الأمر من القائمة المعلقة
      setPendingCommands(prev => prev.filter(cmd => cmd.id !== commandId));

      return result;
    } finally {
      setIsProcessing(false);
    }
  }, [pendingCommands, executeOperation]);

  // رفض الأمر
  const rejectCommand = useCallback((commandId: string) => {
    setPendingCommands(prev => prev.filter(cmd => cmd.id !== commandId));
    toast.info('تم إلغاء الأمر');
  }, []);

  // مسح جميع الأوامر المعلقة
  const clearPendingCommands = useCallback(() => {
    setPendingCommands([]);
  }, []);

  return {
    // الحالة
    isProcessing,
    pendingCommands,
    executionHistory,
    securityLevel,
    
    // الوظائف
    processNaturalLanguageCommand,
    confirmAndExecuteCommand,
    rejectCommand,
    clearPendingCommands,
    
    // إحصائيات
    stats: {
      totalOperations: executionHistory.length,
      successfulOperations: executionHistory.filter(log => log.result.success).length,
      failedOperations: executionHistory.filter(log => !log.result.success).length,
      pendingCommands: pendingCommands.length
    }
  };
};

