import { HomeScreen } from './src/screens/HomeScreen';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useState } from 'react';

// O entry point fica pequeno: a composição visual e o estado da página pertencem à tela.
export default function App() {
  const [showDashboard, setShowDashboard] = useState(false);

  return (
    <SafeAreaProvider>
      {showDashboard ? (
        <DashboardScreen onBack={() => setShowDashboard(false)} />
      ) : (
        <HomeScreen onDashboardPress={() => setShowDashboard(true)} />
      )}
    </SafeAreaProvider>
  );
}
