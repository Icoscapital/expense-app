import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
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
      // Not signed in → go to login
      if (!inAuthGroup) router.replace('/(auth)/login');
    } else if (profile) {
      // Signed in → route based on role
      if (profile.role === 'admin' && !inAdminGroup) {
        router.replace('/(admin)/dashboard');
      } else if (profile.role === 'employee' && !inEmployeeGroup) {
        router.replace('/(employee)/home');
      }
    }
  }, [session, profile, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="(auth)" />
      <Stack.Screen name="(employee)" />
      <Stack.Screen name="(admin)" />
      <Stack.Screen name="index" />
    </Stack>
  );
}
