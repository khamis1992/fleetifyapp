import { formatCustomerName } from '@/utils/formatCustomerName';
import { CustomerPanel } from '../customer-workspace/CustomerWorkspace';

export default function PersonalInfoTab({ customer }: { customer: any }) {
  const groups = [
    { title: 'الهوية والمعلومات الشخصية', items: [
      ['الاسم الكامل', formatCustomerName(customer)], ['رقم الهوية', customer.national_id],
      ['الجنسية', customer.nationality], ['تاريخ الميلاد', customer.date_of_birth],
      ['البريد الإلكتروني', customer.email], ['رخصة القيادة', customer.driver_license],
      ['صاحب العمل', customer.employer], ['المنصب', customer.job_title], ['المجموعة', customer.group_name],
    ] },
    { title: 'العنوان والإقامة', items: [
      ['العنوان', customer.address], ['العنوان الإضافي', customer.address_2], ['المدينة', customer.city],
      ['المنطقة', customer.state], ['البلد', customer.country], ['الرمز البريدي', customer.postal_code],
    ] },
  ];
  return <div className="cw-info-grid">{groups.map(group => <CustomerPanel key={group.title} title={group.title}>
    <dl className="cw-data-list">{group.items.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || <span className="font-normal text-slate-400">غير مسجل</span>}</dd></div>)}</dl>
  </CustomerPanel>)}</div>;
}
