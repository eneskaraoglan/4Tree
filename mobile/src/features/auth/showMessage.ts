import { Alert, Platform } from 'react-native';

/** Kısa bilgi penceresi. react-native-web'de Alert.alert çalışmadığı için web'de tarayıcı penceresi kullanılır. */
export function showMessage(title: string, message: string): void {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined') window.alert(`${title}\n${message}`);
    return;
  }
  Alert.alert(title, message);
}
