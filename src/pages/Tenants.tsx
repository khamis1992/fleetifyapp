import React from 'react';
import { Users, ArrowUpLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageEmpty, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const Tenants: React.FC = () => {
  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> المستأجرين
            </div>
            <h1>المستأجرين</h1>
            <p>إدارة بيانات المستأجرين وعقودهم ومستحقاتهم.</p>
          </div>
        </header>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="إدارة المستأجرين"
            subtitle="الصفحة قيد التطوير — ستتضمن ملفات المستأجرين وعقودهم وسجل مدفوعاتهم"
            className="wk-panel-full"
          >
            <PageEmpty icon={Users} message="صفحة إدارة المستأجرين قيد التطوير">
              <Link to="/customers" className="dw-button">
                <ArrowUpLeft size={16} />
                الانتقال إلى دليل العملاء
              </Link>
            </PageEmpty>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

export default Tenants;