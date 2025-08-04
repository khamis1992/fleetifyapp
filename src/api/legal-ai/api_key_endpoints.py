"""
API Endpoints لإدارة OpenAI API Key
يوفر endpoints للتحقق من صحة واختبار API Keys
"""

from flask import request, jsonify
import openai
import os
import time
from datetime import datetime

def add_api_key_routes(app):
    """إضافة routes إدارة API Key للتطبيق"""
    
    @app.route('/api/check-api-key', methods=['POST'])
    def check_api_key():
        """فحص صحة وحالة API Key"""
        try:
            data = request.get_json()
            api_key = data.get('api_key', '').strip()
            
            if not api_key:
                return jsonify({
                    'success': False,
                    'error': 'API Key مطلوب'
                }), 400
            
            if not api_key.startswith('sk-'):
                return jsonify({
                    'success': False,
                    'error': 'API Key غير صحيح'
                }), 400
            
            # إنشاء عميل OpenAI مؤقت للاختبار
            client = openai.OpenAI(
                api_key=api_key,
                base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
            )
            
            # اختبار بسيط للتحقق من صحة المفتاح
            try:
                # محاولة الحصول على قائمة النماذج
                models = client.models.list()
                
                # إحصائيات وهمية (يمكن تطويرها لاحقاً)
                status = {
                    'isValid': True,
                    'isConnected': True,
                    'model': 'gpt-4o-mini',
                    'usage': {
                        'requests': 0,
                        'cost': 0.0,
                        'savings': 0.0
                    }
                }
                
                return jsonify({
                    'success': True,
                    'data': status
                })
                
            except openai.AuthenticationError:
                return jsonify({
                    'success': False,
                    'error': 'API Key غير صحيح أو منتهي الصلاحية'
                }), 401
                
            except openai.RateLimitError:
                return jsonify({
                    'success': False,
                    'error': 'تم تجاوز الحد المسموح، حاول لاحقاً'
                }), 429
                
            except openai.APIError as e:
                return jsonify({
                    'success': False,
                    'error': f'خطأ في API: {str(e)}'
                }), 500
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'خطأ في فحص API Key: {str(e)}'
            }), 500
    
    @app.route('/api/test-connection', methods=['POST'])
    def test_connection():
        """اختبار الاتصال مع OpenAI API"""
        try:
            data = request.get_json()
            api_key = data.get('api_key', '').strip()
            
            if not api_key:
                return jsonify({
                    'success': False,
                    'error': 'API Key مطلوب'
                }), 400
            
            # إنشاء عميل OpenAI مؤقت
            client = openai.OpenAI(
                api_key=api_key,
                base_url=os.getenv("OPENAI_API_BASE", "https://api.openai.com/v1")
            )
            
            # اختبار بسيط مع استفسار قصير
            start_time = time.time()
            
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "user", "content": "اختبار اتصال بسيط. أجب بكلمة واحدة: نجح"}
                    ],
                    max_tokens=10,
                    temperature=0
                )
                
                response_time = time.time() - start_time
                
                return jsonify({
                    'success': True,
                    'data': {
                        'response_time': round(response_time, 2),
                        'model': response.model,
                        'tokens_used': response.usage.total_tokens if response.usage else 0,
                        'message': 'تم اختبار الاتصال بنجاح'
                    }
                })
                
            except openai.AuthenticationError:
                return jsonify({
                    'success': False,
                    'error': 'فشل في المصادقة - تحقق من صحة API Key'
                }), 401
                
            except openai.RateLimitError:
                return jsonify({
                    'success': False,
                    'error': 'تم تجاوز الحد المسموح - حاول لاحقاً'
                }), 429
                
            except openai.APIError as e:
                return jsonify({
                    'success': False,
                    'error': f'خطأ في API: {str(e)}'
                }), 500
                
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'خطأ في اختبار الاتصال: {str(e)}'
            }), 500
    
    @app.route('/api/api-key-usage', methods=['POST'])
    def get_api_key_usage():
        """الحصول على إحصائيات استخدام API Key"""
        try:
            data = request.get_json()
            api_key = data.get('api_key', '').strip()
            
            if not api_key:
                return jsonify({
                    'success': False,
                    'error': 'API Key مطلوب'
                }), 400
            
            # إحصائيات وهمية (يمكن تطويرها لاحقاً من قاعدة البيانات)
            usage_stats = {
                'today': {
                    'requests': 25,
                    'tokens': 15000,
                    'cost': 0.45
                },
                'this_month': {
                    'requests': 750,
                    'tokens': 450000,
                    'cost': 13.50
                },
                'savings': {
                    'cache_hits': 180,
                    'local_responses': 95,
                    'total_saved': 8.25
                },
                'efficiency': {
                    'cache_hit_rate': 72,
                    'cost_efficiency': 85,
                    'response_time': 1.2
                }
            }
            
            return jsonify({
                'success': True,
                'data': usage_stats
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'خطأ في جلب إحصائيات الاستخدام: {str(e)}'
            }), 500
    
    @app.route('/api/validate-api-key-format', methods=['POST'])
    def validate_api_key_format():
        """التحقق من تنسيق API Key بدون إرسال طلبات"""
        try:
            data = request.get_json()
            api_key = data.get('api_key', '').strip()
            
            validation = {
                'is_valid_format': False,
                'errors': [],
                'warnings': []
            }
            
            if not api_key:
                validation['errors'].append('API Key فارغ')
            elif len(api_key) < 20:
                validation['errors'].append('API Key قصير جداً')
            elif not api_key.startswith('sk-'):
                validation['errors'].append('API Key يجب أن يبدأ بـ sk-')
            elif len(api_key) < 51:
                validation['warnings'].append('API Key قد يكون قديم أو غير مكتمل')
            else:
                validation['is_valid_format'] = True
            
            return jsonify({
                'success': True,
                'data': validation
            })
            
        except Exception as e:
            return jsonify({
                'success': False,
                'error': f'خطأ في التحقق من تنسيق API Key: {str(e)}'
            }), 500

