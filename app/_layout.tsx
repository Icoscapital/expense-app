import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator, Platform, StyleSheet } from 'react-native';
import { useAuth } from '../hooks/useAuth';
import { Colors } from '../constants/theme';

export default function RootLayout() {
  const { session, profile, loading } = useAuth();
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inEmployeeGroup = segments[0] === '(employee)';
    const inAdminGroup = segments[0] === '(admin)';

    if (!session) {
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (profile) {
      if (profile.role === 'admin' && !inAdminGroup) {
        router.replace('/(admin)/dashboard');
      } else if (profile.role === 'employee' && !inEmployeeGroup) {
        router.replace('/(employee)/home');
      }
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  const stack = (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(employee)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="index" />
    </Stack>
  );

  // On web: center the app in a phone-width container
  if (Platform.OS === 'web') {
    return (
      <View style={styles.webOuter}>
        <View style={styles.webInner}>
          {stack}
        </View>
      </View>
    );
  }

  return stack;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  webOuter: {
    flex: 1,
    backgroundColor: '#D1D5DB',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: 24,
    paddingBottom: 24,
  },
  webInner: {
    width: 390,
    flex: 1,
    maxHeight: '100%',
    backgroundColor: Colors.background,
    borderRadius: 40,
    borderWidth: 8,
    borderColor: '#1F2937',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 32,
  },
});
