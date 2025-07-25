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
  if (error?.needsConfiguration || locationData?.needsConfiguration) {
    return 'Office location is not configured. Please contact your administrator to set up the office location.';
  }
  
  if (locationData?.distance && locationData?.allowedRadius) {
    return `You are ${locationData.distance}m away from the office. Maximum allowed distance is ${locationData.allowedRadius}m.`;
  }
  
  return error?.message || 'You are outside the allowed work area.';
};

export const isLocationConfigured = (locationStatus: string | null) => {
  return locationStatus !== 'not_configured';
};

export const canPerformAttendanceAction = (locationStatus: string | null) => {
  return locationStatus === 'verified';
};