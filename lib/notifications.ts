import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from './supabase';

/**
 * Request notification permissions, get the Expo push token,
 * and save it to the user's profile in Supabase.
 *
 * expo-notifications is loaded lazily (dynamic require) so its module-level
 * side effects (DevicePushTokenAutoRegistration.fx.js) never run in Expo Go,
 * which would crash with "warnOfExpoGoPushUsage".
 */
export async function registerForPushNotifications(userId: string): Promise<string | null> {
  // Push notifications are not supported in Expo Go — skip entirely
  const appOwnership = Constants.appOwnership;
  if (appOwnership === 'expo') {
    console.log('Push notifications skipped in Expo Go — will work in a standalone build.');
    return null;
  }

  // Lazy-load expo-notifications so its module-level side effects never
  // execute when running inside Expo Go.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Notifications = require('expo-notifications') as typeof import('expo-notifications');
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const Device = require('expo-device') as typeof import('expo-device');

  if (!Device.isDevice) {
    console.warn('Push notifications only work on physical devices.');
    return null;
  }

  // Set foreground notification handler
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.warn('Push notification permission denied.');
    return null;
  }

  // Android requires a notification channel
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#4F46E5',
    });
  }

  const projectId =
    Constants?.expoConfig?.extra?.eas?.projectId ??
    Constants?.easConfig?.projectId;

  const tokenData = await Notifications.getExpoPushTokenAsync(
    projectId ? { projectId } : undefined
  );
  const pushToken = tokenData.data;

  // Persist to Supabase profile
  await supabase
    .from('profiles')
    .update({ push_token: pushToken })
    .eq('id', userId);

  return pushToken;
}
