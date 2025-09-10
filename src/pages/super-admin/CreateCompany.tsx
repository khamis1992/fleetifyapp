import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

import { ArrowLeft, Building2, CheckCircle } from 'lucide-react';
import { BusinessTypeSelector, businessTypes } from '@/components/super-admin/BusinessTypeSelector';
import { CompanyForm } from '@/components/super-admin/CompanyForm';
import { BusinessType } from '@/types/modules';
import { useToast } from '@/hooks/use-toast';

const CreateCompany: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [selectedBusinessType, setSelectedBusinessType] = useState<BusinessType | null>(null);
  const [showForm, setShowForm] = useState(false);

  const handleBusinessTypeSelect = (type: BusinessType) => {
    setSelectedBusinessType(type);
    setStep(2);
  };

  const handleCreateCompany = () => {
    if (!selectedBusinessType) {
      toast({
        title: 'خطأ',
        description: 'يرجى اختيار نوع النشاط التجاري أولاً',
        variant: 'destructive',
      });
      return;
    }
    setShowForm(true);
  };

  const handleFormSuccess = () => {
    setShowForm(false);
    setStep(3);
    
    // Auto redirect after 3 seconds
    setTimeout(() => {
      navigate('/super-admin/companies');
    }, 3000);
  };

  const selectedBusiness = businessTypes.find(b => b.type === selectedBusinessType);


  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">إنشاء شركة جديدة</h1>
          <p className="text-muted-foreground">
            اتبع الخطوات لإنشاء شركة جديدة وتحديد نوع النشاط التجاري
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/super-admin/companies')}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="h-4 w-4" />
          رجوع
        </Button>
      </div>

      {/* Progress Steps */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 1 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > 1 ? <CheckCircle className="h-4 w-4" /> : '1'}
              </div>
              <span className={`text-sm font-medium ${
                step >= 1 ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                اختيار نوع النشاط
              </span>
            </div>

            <div className="flex-1 h-px bg-border mx-4" />

            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 2 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step > 2 ? <CheckCircle className="h-4 w-4" /> : '2'}
              </div>
              <span className={`text-sm font-medium ${
                step >= 2 ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                معلومات الشركة
              </span>
            </div>

            <div className="flex-1 h-px bg-border mx-4" />

            <div className="flex items-center space-x-4 rtl:space-x-reverse">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                step >= 3 ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'
              }`}>
                {step >= 3 ? <CheckCircle className="h-4 w-4" /> : '3'}
              </div>
              <span className={`text-sm font-medium ${
                step >= 3 ? 'text-foreground' : 'text-muted-foreground'
              }`}>
                اكتمل
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Step Content */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              اختر نوع النشاط التجاري
            </CardTitle>
            <CardDescription>
              حدد نوع النشاط التجاري للشركة لتفعيل الوحدات والميزات المناسبة
            </CardDescription>
          </CardHeader>
          <CardContent>
            <BusinessTypeSelector
              selectedType={selectedBusinessType || undefined}
              onTypeSelect={handleBusinessTypeSelect}
            />
          </CardContent>
        </Card>
      )}

      {step === 2 && selectedBusiness && (
        <div className="space-y-6">
          {/* Selected Business Type Summary */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={`p-3 rounded-lg bg-gradient-to-r ${selectedBusiness.color} text-white`}>
                  {React.createElement(selectedBusiness.icon, { className: "h-6 w-6" })}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{selectedBusiness.name_ar}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedBusiness.description_ar}
                  </p>
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium mb-2">الوحدات المتضمنة:</p>
                  <div className="flex flex-wrap gap-1">
                    {selectedBusiness.modules.map((module) => (
                      <span 
                        key={module}
                        className="px-2 py-1 bg-primary/10 text-primary text-xs rounded-md"
                      >
                        {module}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex items-center justify-end">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setStep(1)}
                  >
                    تغيير النوع
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Create Company Action */}
          <Card>
            <CardHeader>
              <CardTitle>إدخال معلومات الشركة</CardTitle>
              <CardDescription>
                أدخل معلومات الشركة الأساسية ومعلومات الاتصال
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center py-8">
                <Button 
                  onClick={handleCreateCompany}
                  size="lg"
                  className="flex items-center gap-2"
                >
                  <Building2 className="h-4 w-4" />
                  إدخال معلومات الشركة
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {step === 3 && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6 text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-green-900 mb-2">
              تم إنشاء الشركة بنجاح!
            </h3>
            <p className="text-green-700 mb-4">
              تم إنشاء الشركة وتفعيل الوحدات المناسبة لنوع النشاط المحدد
            </p>
            <div className="flex items-center justify-center gap-4">
              <Button 
                onClick={() => navigate('/super-admin/companies')}
                variant="outline"
              >
                عرض جميع الشركات
              </Button>
              <Button 
                onClick={() => {
                  setStep(1);
                  setSelectedBusinessType(null);
                }}
              >
                إنشاء شركة أخرى
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Company Form Dialog */}
      {showForm && (
        <CompanyForm
          open={showForm}
          onOpenChange={setShowForm}
          onSuccess={handleFormSuccess}
        />
      )}
    </div>
  );
};

export default CreateCompany;