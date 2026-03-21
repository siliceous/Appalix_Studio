import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { router } from 'expo-router';

// ---------------------------------------------------------------------------
// Notification handler — runs while app is in foreground
// ---------------------------------------------------------------------------
export function setupNotificationHandler() {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    }),
  });
}

// ---------------------------------------------------------------------------
// Request permission + get Expo push token
// ---------------------------------------------------------------------------
export async function registerForPushNotificationsAsync(): Promise<
  string | null
> {
  if (!Device.isDevice) {
    // Push notifications don't work on simulators
    console.warn('Push notifications require a physical device.');
    return null;
  }

  // Android channel must be created before requesting permission
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#15A4AE',
    });
  }

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission not granted.');
    return null;
  }

  try {
    const tokenData = await Notifications.getExpoPushTokenAsync();
    return tokenData.data;
  } catch (error) {
    console.error('Failed to get push token:', error);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Handle notification tap — parse deep link and navigate
// ---------------------------------------------------------------------------
export function handleNotificationResponse(
  response: Notifications.NotificationResponse,
) {
  const data = response.notification.request.content.data as
    | Record<string, string>
    | undefined;

  if (!data) return;

  const deepLink = data.deepLink ?? data.url ?? data.path;
  if (!deepLink) return;

  // deepLink format: e.g. "/feed/abc123", "/(app)/deals/xyz"
  try {
    // expo-router can navigate to string paths directly
    router.push(deepLink as never);
  } catch (error) {
    console.warn('Failed to navigate to deep link:', deepLink, error);
  }
}
