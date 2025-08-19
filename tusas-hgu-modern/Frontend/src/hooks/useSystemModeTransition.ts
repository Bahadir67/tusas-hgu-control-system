import { useEffect, useRef, useState } from 'react';
import { useOpcStore } from '../store/opcStore';

interface TransitionState {
  isTransitioning: boolean;
  targetMode: 'auto' | 'manual' | null;
  message: string;
  messageType: 'warning' | 'success' | 'error' | null;
}

export const useSystemModeTransition = () => {
  const systemEnable = useOpcStore((state) => state.system.systemEnable);
  const systemStatus = useOpcStore((state) => state.system.systemStatus);
  const prevSystemEnable = useRef<boolean | null>(null);
  const [transitionState, setTransitionState] = useState<TransitionState>({
    isTransitioning: false,
    targetMode: null,
    message: '',
    messageType: null
  });

  useEffect(() => {
    // Skip first render
    if (prevSystemEnable.current === null) {
      prevSystemEnable.current = systemEnable;
      return;
    }

    // Detect SYSTEM_ENABLE change
    if (systemEnable !== prevSystemEnable.current) {
      const targetMode = systemEnable ? 'auto' : 'manual';
      const modeText = systemEnable ? 'Otomatik' : 'Manuel';
      
      // Show transition message
      const msg = `Sistem ${modeText} Moda Geçiyor - Tüm motorlar durduruluyor ve setpoint'ler sıfırlanıyor...`;
      
      setTransitionState({
        isTransitioning: true,
        targetMode,
        message: msg,
        messageType: 'warning'
      });

      prevSystemEnable.current = systemEnable;
    }

    // Monitor system status for transition completion
    // Status codes:
    // 0=Init, 1=Auto Ready, 2=Running, 3=Error, 4=Transitioning to Auto, 5=Transitioning to Manual, 6=Manual Ready
    if (transitionState.isTransitioning) {
      if (systemStatus === 1 && transitionState.targetMode === 'auto') {
        // Auto mode ready
        setTransitionState({
          isTransitioning: false,
          targetMode: null,
          message: 'Sistem Otomatik Moda Geçti',
          messageType: 'success'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setTransitionState(prev => ({ ...prev, message: '', messageType: null }));
        }, 3000);
        
      } else if (systemStatus === 6 && transitionState.targetMode === 'manual') {
        // Manual mode ready
        setTransitionState({
          isTransitioning: false,
          targetMode: null,
          message: 'Sistem Manuel Moda Geçti',
          messageType: 'success'
        });
        
        // Clear message after 3 seconds
        setTimeout(() => {
          setTransitionState(prev => ({ ...prev, message: '', messageType: null }));
        }, 3000);
        
      } else if (systemStatus === 3) {
        // Error during transition
        setTransitionState({
          isTransitioning: false,
          targetMode: null,
          message: 'Mod geçişi sırasında hata oluştu!',
          messageType: 'error'
        });
        
        // Clear message after 5 seconds
        setTimeout(() => {
          setTransitionState(prev => ({ ...prev, message: '', messageType: null }));
        }, 5000);
      }
    }
  }, [systemEnable, systemStatus, transitionState.isTransitioning, transitionState.targetMode]);

  return transitionState;
};