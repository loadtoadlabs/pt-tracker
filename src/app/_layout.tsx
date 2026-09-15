import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="setup"
          options={{ headerShown: false, gestureEnabled: false }}
        />
        <Stack.Screen name="log-workout" options={{ title: 'Log Workout' }} />
        <Stack.Screen name="workout-history" options={{ title: 'Workout History' }} />
      </Stack>
    </ThemeProvider>
  );
}
