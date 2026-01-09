import { useState, useEffect } from 'react';
import { Preferences } from '@capacitor/preferences';
import { supabase } from '@/integrations/supabase/client';

export interface BiometricAuthResult {
  success: boolean;
  error?: string;
}

export const useBiometricAuth = () => {
  const [isAvailable, setIsAvailable] = useState(false);
  const [hasSavedCredentials, setHasSavedCredentials] = useState(false);
  const [savedEmail, setSavedEmail] = useState<string>('');
  const [isLoading, setIsLoading] = useState(true);

  // Check if WebAuthn is available and if there are saved credentials
  useEffect(() => {
    checkBiometricAvailability();
  }, []);

  const checkBiometricAvailability = async () => {
    try {
      // Check if WebAuthn is supported
      const webAuthnAvailable =
        window.PublicKeyCredential !== undefined &&
        typeof window.PublicKeyCredential === 'function';

      // Check if user has a biometric device
      const hasBiometricDevice = webAuthnAvailable
        ? await window.PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable()
        : false;

      setIsAvailable(hasBiometricDevice);

      // Check for saved credentials
      const { value: savedEmailValue } = await Preferences.get({ key: 'biometric_email' });
      if (savedEmailValue) {
        setSavedEmail(savedEmailValue);
        setHasSavedCredentials(true);
      }
    } catch (error) {
      console.error('[useBiometricAuth] Error checking availability:', error);
      setIsAvailable(false);
    } finally {
      setIsLoading(false);
    }
  };

  const saveCredentials = async (email: string) => {
    try {
      await Preferences.set({ key: 'biometric_email', value: email });
      setSavedEmail(email);
      setHasSavedCredentials(true);
      console.log('[useBiometricAuth] Credentials saved for:', email);
    } catch (error) {
      console.error('[useBiometricAuth] Error saving credentials:', error);
    }
  };

  const clearCredentials = async () => {
    try {
      await Preferences.remove({ key: 'biometric_email' });
      setSavedEmail('');
      setHasSavedCredentials(false);
      console.log('[useBiometricAuth] Credentials cleared');
    } catch (error) {
      console.error('[useBiometricAuth] Error clearing credentials:', error);
    }
  };

  const authenticateWithBiometrics = async (email?: string): Promise<BiometricAuthResult> => {
    try {
      const emailToUse = email || savedEmail;

      if (!emailToUse) {
        return {
          success: false,
          error: 'لا يوجد بريد إلكتروني محفوظ'
        };
      }

      setIsLoading(true);

      // First, get the user from Supabase to verify the account exists
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Create a challenge for WebAuthn
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Convert email to user handle
      const encoder = new TextEncoder();
      const userHandle = encoder.encode(emailToUse);

      // Get credentials with biometric
      const credential = await navigator.credentials.get({
        publicKey: {
          challenge: challenge,
          rpId: window.location.hostname,
          userVerification: 'required',
          timeout: 60000,
          allowCredentials: [] // Empty array = allow any credential
        } as any
      });

      if (!credential) {
        return {
          success: false,
          error: 'تم إلغاء المصادقة البيومترية'
        };
      }

      // If we got here, biometric authentication succeeded
      // Now we need to sign in with Supabase
      // For this, we'll need to use a passwordless flow or MFA
      // For now, let's try to get the session

      console.log('[useBiometricAuth] Biometric auth successful, attempting to get session');

      // Check if there's an active session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();

      if (sessionError) throw sessionError;

      if (session) {
        return { success: true };
      }

      // If no active session, we need to sign in
      // This is where you'd implement a passwordless/MFA flow
      // For now, we'll return an error indicating the user needs to enter password
      return {
        success: false,
        error: 'يرجى إدخال كلمة المرور للمرة الأولى'
      };

    } catch (error: any) {
      console.error('[useBiometricAuth] Biometric auth error:', error);

      // Handle common errors
      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'تم إلغاء المصادقة أو انتهت المهلة'
        };
      }

      if (error.name === 'NotSupportedError') {
        return {
          success: false,
          error: 'المصادقة البيومترية غير مدعومة على هذا الجهاز'
        };
      }

      if (error.name === 'SecurityError') {
        return {
          success: false,
          error: 'خطأ أمني، يرجى المحاولة مرة أخرى'
        };
      }

      return {
        success: false,
        error: error.message || 'فشلت المصادقة البيومترية'
      };
    } finally {
      setIsLoading(false);
    }
  };

  const registerBiometric = async (email: string): Promise<BiometricAuthResult> => {
    try {
      setIsLoading(true);

      // Create a challenge for WebAuthn
      const challenge = new Uint8Array(32);
      crypto.getRandomValues(challenge);

      // Create user handle
      const encoder = new TextEncoder();
      const userHandle = encoder.encode(email);

      // Create credentials with biometric
      const credential = await navigator.credentials.create({
        publicKey: {
          challenge: challenge,
          rp: {
            name: 'Fleetify',
            id: window.location.hostname
          },
          user: {
            id: userHandle,
            name: email,
            displayName: email.split('@')[0]
          },
          pubKeyCredParams: [
            { type: 'public-key', alg: -7 }  // ES256
          ],
          authenticatorSelection: {
            authenticatorAttachment: 'platform',
            userVerification: 'required',
            requireResidentKey: false
          },
          timeout: 60000,
          attestation: 'none'
        } as any
      });

      if (!credential) {
        return {
          success: false,
          error: 'تم إلغاء التسجيل البيومتري'
        };
      }

      // Save the email for future biometric logins
      await saveCredentials(email);

      // Store the credential ID for later
      await Preferences.set({
        key: 'biometric_credential_id',
        value: (credential as any).id
      });

      console.log('[useBiometricAuth] Biometric registration successful');

      return { success: true };

    } catch (error: any) {
      console.error('[useBiometricAuth] Biometric registration error:', error);

      if (error.name === 'NotAllowedError') {
        return {
          success: false,
          error: 'تم إلغاء التسجيل أو انتهت المهلة'
        };
      }

      if (error.name === 'NotSupportedError') {
        return {
          success: false,
          error: 'المصادقة البيومترية غير مدعومة'
        };
      }

      return {
        success: false,
        error: error.message || 'فشل التسجيل البيومتري'
      };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isAvailable,
    hasSavedCredentials,
    savedEmail,
    isLoading,
    authenticateWithBiometrics,
    registerBiometric,
    saveCredentials,
    clearCredentials,
    checkBiometricAvailability
  };
};
