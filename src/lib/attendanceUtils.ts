/**
 * Utility functions for attendance management
 */

export const formatTime = (timeString: string) => {
  if (!timeString) return '';
  return new Date(`1970-01-01T${timeString}`).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const getCurrentTime = () => {
  return new Date().toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
};

export const formatLocationError = (error: any, locationData?: any) => {
  // Handle Arabic error messages from the server
  if (error?.error && typeof error.error === 'string') {
    return error.error;
  }
  
  if (error?.needsConfiguration || locationData?.needsConfiguration) {
    return 'لم يتم تكوين موقع المكتب. يرجى التواصل مع المسؤول لإعداد موقع المكتب.';
  }
  
  // Handle detailed distance information
  if (locationData?.distance && locationData?.allowedRadius) {
    const distance = Math.round(locationData.distance);
    const allowedRadius = locationData.allowedRadius;
    
    if (distance > 1000) {
      const distanceKm = (distance / 1000).toFixed(1);
      return `أنت على بعد ${distanceKm} كم من المكتب. المسافة المسموحة هي ${allowedRadius} متر فقط. يرجى الاقتراب من المكتب أو التواصل مع المسؤول.`;
    } else {
      return `أنت على بعد ${distance} متر من المكتب. المسافة المسموحة هي ${allowedRadius} متر. يرجى الاقتراب أكثر من المكتب.`;
    }
  }
  
  // Check for specific error codes
  if (error?.errorCode) {
    switch (error.errorCode) {
      case 'LOCATION_OUT_OF_RANGE':
        return 'أنت خارج منطقة العمل المسموحة. يرجى الاقتراب من المكتب أو التواصل مع المسؤول.';
      case 'ALREADY_CLOCKED_IN':
        return 'تم تسجيل الحضور مسبقاً اليوم';
      case 'LOCATION_VERIFICATION_FAILED':
        return 'فشل في التحقق من الموقع. يرجى التأكد من تفعيل خدمة الموقع والمحاولة مرة أخرى';
      case 'DATABASE_ERROR':
        return 'خطأ في قاعدة البيانات. يرجى المحاولة مرة أخرى';
      case 'LOCATION_PERMISSION_DENIED':
        return 'تم رفض الوصول للموقع. يرجى السماح للتطبيق بالوصول للموقع في إعدادات المتصفح';
      case 'LOCATION_UNAVAILABLE':
        return 'لا يمكن تحديد الموقع الحالي. يرجى التأكد من تفعيل GPS والمحاولة مرة أخرى';
      default:
        return 'حدث خطأ غير متوقع';
    }
  }
  
  return error?.message || 'أنت خارج منطقة العمل المسموحة. يرجى التواصل مع المسؤول.';
};

export const isLocationConfigured = (locationStatus: string | null) => {
  return locationStatus !== 'not_configured';
};

export const canPerformAttendanceAction = (locationStatus: string | null) => {
  return locationStatus === 'verified';
};