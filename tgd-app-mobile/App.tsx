import { HomeScreen } from './src/screens/HomeScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { NotificationsScreen } from './src/screens/NotificationsScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';
import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// O entry point fica pequeno: a composição visual e o estado da página pertencem à tela.
export default function App() {
  const [screen, setScreen] = useState<'home' | 'dashboard' | 'notifications'>('home');

  return (
    <SafeAreaProvider>
      {screen === 'dashboard' ? (
        <DashboardScreen onBack={() => setScreen('home')} />
      ) : screen === 'notifications' ? (
        <NotificationsScreen onBack={() => setScreen('home')} />
      ) : (
        <HomeScreen
          onDashboardPress={() => setScreen('dashboard')}
          onNotificationsPress={() => setScreen('notifications')}
        />
      )}
    </SafeAreaProvider>
  );
}
