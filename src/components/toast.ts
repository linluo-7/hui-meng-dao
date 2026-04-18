import { Alert, Platform, ToastAndroid } from 'react-native';

export function toast(message: string, title = '提示') {
  if (Platform.OS === 'android') {
    ToastAndroid.show(message, ToastAndroid.SHORT);
    return;
  }
  Alert.alert(title, message);
}

