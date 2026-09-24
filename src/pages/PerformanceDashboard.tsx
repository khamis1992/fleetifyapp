import React from 'react';
import { TrendingUp, ArrowUpLeft } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageEmpty, PagePanel } from '@/components/dashboard/workspace/PageKit';
import '@/components/dashboard/workspace/dashboard-workspace.css';
import '@/components/dashboard/workspace/page-kit.css';

const PerformanceDashboard: React.FC = () => {
  return (
    <div className="dashboard-workspace" dir="rtl">
      <div className="dw-container">
        <header className="dw-header">
          <div>
            <div className="dw-eyebrow">
              <span className="dw-mark" />
              العراف لتأجير السيارات <span>/</span> مساحة العمل <span>/</span> لوحة الأداء
            </div>
            <h1>لوحة الأداء</h1>
            <p>تحليل مؤشرات الأداء التشغيلي والمالي للأسطول والفريق.</p>
          </div>
        </header>

        <div className="dw-main-grid">
          <PagePanel
            number="01"
            title="تحليل الأداء"
            subtitle="الصفحة قيد التطوير — ستتضمن مؤشرات الأداء التشغيلي والمالي"
            className="wk-panel-full"
          >
            <PageEmpty icon={TrendingUp} message="لوحة تحليل الأداء قيد التطوير">
              <Link to="/dashboard" className="dw-button">
                <ArrowUpLeft size={16} />
                العودة إلى لوحة التحكم
              </Link>
            </PageEmpty>
          </PagePanel>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;