import { supabase } from '@/integrations/supabase/client';

interface PaymentForBankTransaction {
  id: string;
  company_id: string;
  amount: number;
  payment_date: string;
  payment_method: string;
  payment_number?: string;
  reference_number?: string;
  check_number?: string;
  transaction_type: 'inflow' | 'outflow' | 'receipt' | 'payment';
  bank_id?: string;
  notes?: string;
}

interface BankTransactionResult {
  success: boolean;
  transaction?: any;
  error?: string;
}

/**
 * إنشاء حركة بنكية من مدفوعة
 * تقوم هذه الدالة بإنشاء سجل في bank_transactions وتحديث رصيد البنك
 */
export async function createBankTransactionFromPayment(
  payment: PaymentForBankTransaction,
  userId?: string
): Promise<BankTransactionResult> {
  try {
    // التحقق من وجود bank_id
    if (!payment.bank_id) {
      console.log('⚠️ No bank_id provided, skipping bank transaction creation');
      return { success: true }; // ليس خطأ، فقط لا يوجد بنك محدد
    }

    // التحقق من أن طريقة الدفع تتطلب تحديث البنك
    const bankPaymentMethods = ['bank_transfer', 'check', 'wire_transfer', 'online_transfer'];
    if (!bankPaymentMethods.includes(payment.payment_method)) {
      console.log('⚠️ Payment method does not require bank transaction:', payment.payment_method);
      return { success: true };
    }

    // جلب بيانات البنك الحالية
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, current_balance, is_active, bank_name')
      .eq('id', payment.bank_id)
      .single();

    if (bankError || !bank) {
      console.error('❌ Bank not found:', bankError);
      return { success: false, error: 'البنك غير موجود' };
    }

    if (!bank.is_active) {
      return { success: false, error: 'البنك غير نشط' };
    }

    // تحديد نوع الحركة البنكية والرصيد الجديد
    const isInflow = payment.transaction_type === 'inflow' || payment.transaction_type === 'receipt';
    const bankTransactionType = isInflow ? 'deposit' : 'withdrawal';
    const balanceChange = isInflow ? payment.amount : -payment.amount;
    const balanceAfter = (bank.current_balance || 0) + balanceChange;

    // التحقق من كفاية الرصيد للسحب
    if (!isInflow && balanceAfter < 0) {
      console.warn('⚠️ Insufficient balance, but proceeding anyway');
      // يمكن تفعيل هذا لمنع السحب عند عدم كفاية الرصيد:
      // return { success: false, error: 'رصيد البنك غير كافٍ' };
    }

    // إنشاء رقم الحركة
    const transactionNumber = `BT-${Date.now().toString().slice(-8)}`;

    // إنشاء حركة البنك
    const { data: transaction, error: transactionError } = await supabase
      .from('bank_transactions')
      .insert({
        company_id: payment.company_id,
        bank_id: payment.bank_id,
        transaction_number: transactionNumber,
        transaction_date: payment.payment_date,
        transaction_type: bankTransactionType,
        amount: payment.amount,
        balance_after: balanceAfter,
        description: `${isInflow ? 'إيداع' : 'سحب'} - ${payment.payment_number || payment.reference_number || 'دفعة'}`,
        reference_number: payment.payment_number || payment.reference_number,
        check_number: payment.check_number,
        status: 'completed',
        reconciled: false,
        created_by: userId
      })
      .select()
      .single();

    if (transactionError) {
      console.error('❌ Failed to create bank transaction:', transactionError);
      return { success: false, error: 'فشل في إنشاء حركة البنك' };
    }

    // تحديث رصيد البنك
    const { error: updateError } = await supabase
      .from('banks')
      .update({
        current_balance: balanceAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.bank_id);

    if (updateError) {
      console.error('❌ Failed to update bank balance:', updateError);
      // حاول حذف الحركة التي تم إنشاؤها
      await supabase.from('bank_transactions').delete().eq('id', transaction.id);
      return { success: false, error: 'فشل في تحديث رصيد البنك' };
    }

    console.log('✅ Bank transaction created successfully:', {
      transactionId: transaction.id,
      bankName: bank.bank_name,
      type: bankTransactionType,
      amount: payment.amount,
      newBalance: balanceAfter
    });

    return { success: true, transaction };

  } catch (error) {
    console.error('❌ Unexpected error in createBankTransactionFromPayment:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

/**
 * عكس حركة بنكية عند إلغاء مدفوعة
 */
export async function reverseBankTransactionForPayment(
  paymentId: string,
  userId?: string
): Promise<BankTransactionResult> {
  try {
    // البحث عن الحركة البنكية المرتبطة بهذه المدفوعة
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id, company_id, bank_id, amount, payment_number, transaction_type')
      .eq('id', paymentId)
      .single();

    if (paymentError || !payment) {
      console.error('❌ Payment not found:', paymentError);
      return { success: false, error: 'المدفوعة غير موجودة' };
    }

    if (!payment.bank_id) {
      console.log('⚠️ Payment has no bank_id, nothing to reverse');
      return { success: true };
    }

    // جلب رصيد البنك الحالي
    const { data: bank, error: bankError } = await supabase
      .from('banks')
      .select('id, current_balance')
      .eq('id', payment.bank_id)
      .single();

    if (bankError || !bank) {
      return { success: false, error: 'البنك غير موجود' };
    }

    // عكس الحركة
    const isInflow = payment.transaction_type === 'inflow' || payment.transaction_type === 'receipt';
    const reversalType = isInflow ? 'withdrawal' : 'deposit';
    const balanceChange = isInflow ? -payment.amount : payment.amount;
    const balanceAfter = (bank.current_balance || 0) + balanceChange;

    // إنشاء حركة عكسية
    const transactionNumber = `BT-REV-${Date.now().toString().slice(-8)}`;

    const { data: reversalTransaction, error: reversalError } = await supabase
      .from('bank_transactions')
      .insert({
        company_id: payment.company_id,
        bank_id: payment.bank_id,
        transaction_number: transactionNumber,
        transaction_date: new Date().toISOString().split('T')[0],
        transaction_type: reversalType,
        amount: payment.amount,
        balance_after: balanceAfter,
        description: `عكس حركة - إلغاء دفعة ${payment.payment_number || paymentId}`,
        reference_number: `REV-${payment.payment_number || paymentId}`,
        status: 'completed',
        reconciled: false,
        created_by: userId
      })
      .select()
      .single();

    if (reversalError) {
      console.error('❌ Failed to create reversal transaction:', reversalError);
      return { success: false, error: 'فشل في إنشاء حركة العكس' };
    }

    // تحديث رصيد البنك
    const { error: updateError } = await supabase
      .from('banks')
      .update({
        current_balance: balanceAfter,
        updated_at: new Date().toISOString()
      })
      .eq('id', payment.bank_id);

    if (updateError) {
      console.error('❌ Failed to update bank balance after reversal:', updateError);
      return { success: false, error: 'فشل في تحديث رصيد البنك' };
    }

    console.log('✅ Bank transaction reversed successfully:', {
      originalPayment: paymentId,
      reversalId: reversalTransaction.id,
      newBalance: balanceAfter
    });

    return { success: true, transaction: reversalTransaction };

  } catch (error) {
    console.error('❌ Unexpected error in reverseBankTransactionForPayment:', error);
    return { success: false, error: 'حدث خطأ غير متوقع' };
  }
}

