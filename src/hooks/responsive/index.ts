// Enhanced Responsive Hooks
export { useDeviceDetection, useDeviceType, useTouchDevice, useHoverCapability } from './useDeviceDetection'
export type { DeviceInfo } from './useDeviceDetection'

export { 
  useScreenOrientation, 
  useOrientation, 
  useIsPortrait, 
  useIsLandscape 
} from './useScreenOrientation'
export type { 
  ScreenOrientationInfo, 
  OrientationType, 
  OrientationAngle, 
  OrientationLockType 
} from './useScreenOrientation'
