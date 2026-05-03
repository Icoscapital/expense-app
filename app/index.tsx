import { View, ActivityIndicator } from 'react-native';
import { Colors } from '../constants/theme';

// This screen is just a loading placeholder.
// The root _layout.tsx handles all redirects based on auth state.
export default function IndexScreen() {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background }}>
      <ActivityIndicator size="large" color={Colors.primary} />
    </View>
  );
}
