import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvitationRequest {
  employee_id: string;
  employee_name: string;
  employee_email: string;
  requester_name: string;
  roles: string[];
  invitation_url: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const {
      employee_id,
      employee_name,
      employee_email,
      requester_name,
      roles,
      invitation_url,
    }: InvitationRequest = await req.json();

    console.log("Sending invitation email to:", employee_email);

    // Translate roles to Arabic
    const roleTranslations: Record<string, string> = {
      'super_admin': 'مدير عام',
      'company_admin': 'مدير الشركة',
      'manager': 'مدير',
      'accountant': 'محاسب',
      'fleet_manager': 'مدير الأسطول',
      'sales_agent': 'مندوب مبيعات',
      'employee': 'موظف'
    };

    const translatedRoles = roles.map(role => roleTranslations[role] || role).join('، ');

    const emailResponse = await resend.emails.send({
      from: "نظام إدارة الشركة <onboarding@resend.dev>",
      to: [employee_email],
      subject: "دعوة لإنشاء حساب في نظام إدارة الشركة",
      html: `
        <div dir="rtl" style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #f8f9fa; padding: 30px; border-radius: 10px; text-align: center;">
            <h1 style="color: #2563eb; margin-bottom: 10px;">مرحباً ${employee_name}!</h1>
            <p style="font-size: 18px; color: #374151; margin-bottom: 30px;">
              تم دعوتك لإنشاء حساب في نظام إدارة الشركة
            </p>
          </div>
          
          <div style="padding: 30px 0;">
            <h2 style="color: #1f2937; margin-bottom: 20px;">تفاصيل الدعوة:</h2>
            
            <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
              <p style="margin: 10px 0;"><strong>الاسم:</strong> ${employee_name}</p>
              <p style="margin: 10px 0;"><strong>البريد الإلكتروني:</strong> ${employee_email}</p>
              <p style="margin: 10px 0;"><strong>الأدوار المخصصة:</strong> ${translatedRoles}</p>
              <p style="margin: 10px 0;"><strong>تم الطلب من قبل:</strong> ${requester_name}</p>
            </div>
            
            <h3 style="color: #1f2937; margin-bottom: 15px;">خطوات إنشاء الحساب:</h3>
            <ol style="padding-right: 20px; color: #374151; line-height: 1.6;">
              <li>انقر على الرابط أدناه للوصول إلى صفحة إنشاء الحساب</li>
              <li>قم بإنشاء كلمة مرور قوية لحسابك</li>
              <li>أكمل عملية التسجيل</li>
              <li>ستتمكن من الوصول إلى النظام بعد التفعيل</li>
            </ol>
            
            <div style="text-align: center; margin: 40px 0;">
              <a href="${invitation_url}" 
                 style="background-color: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                إنشاء الحساب الآن
              </a>
            </div>
            
            <div style="background-color: #fef3c7; border: 1px solid #f59e0b; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <p style="margin: 0; color: #92400e;">
                <strong>ملاحظة مهمة:</strong> هذه الدعوة صالحة لمدة محدودة. يرجى إنشاء حسابك في أقرب وقت ممكن.
              </p>
            </div>
          </div>
          
          <div style="border-top: 1px solid #e5e7eb; padding-top: 20px; text-align: center; color: #6b7280; font-size: 14px;">
            <p>إذا لم تكن تتوقع هذه الدعوة، يرجى تجاهل هذا البريد الإلكتروني.</p>
            <p>نظام إدارة الشركة</p>
          </div>
        </div>
      `,
    });

    console.log("Invitation email sent successfully:", emailResponse);

    return new Response(JSON.stringify(emailResponse), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-account-invitation function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);