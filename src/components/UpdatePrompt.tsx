import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        setInterval(() => {
          registration.update();
        }, 60 * 1000);
      }
    },
  });

  return null;
}
