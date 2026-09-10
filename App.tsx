import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  useColorScheme,
  Platform,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Clock, Globe, Compass, Calendar, Sun, Moon } from 'lucide-react-native';
import { AppTab, City } from './types';
import { COLORS, MOCK_CITIES } from './constants';
import Vakitler from './components/Vakitler';
import Sehirler from './components/Sehirler';
import Kible from './components/Kible';
import Gunler from './components/Gunler';

const MainScreen: React.FC = () => {
  const systemColorScheme = useColorScheme();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<AppTab>(AppTab.VAKITLER);
  const [cities, setCities] = useState<City[]>(MOCK_CITIES);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(systemColorScheme === 'dark');

  // Load saved theme and cities
  useEffect(() => {
    const loadSavedData = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('ezan_theme');
        if (savedTheme !== null) {
          setIsDarkMode(savedTheme === 'dark');
        }
        const savedCities = await AsyncStorage.getItem('ezan_saved_cities');
        if (savedCities) {
          setCities(JSON.parse(savedCities));
        }
      } catch (e) {
        console.error('Failed to load saved preferences:', e);
      }
    };
    loadSavedData();
  }, []);

  const toggleTheme = async () => {
    const nextTheme = !isDarkMode;
    setIsDarkMode(nextTheme);
    await AsyncStorage.setItem('ezan_theme', nextTheme ? 'dark' : 'light');
  };

  const updateCities = (newCities: City[]) => {
    setCities(newCities);
    AsyncStorage.setItem('ezan_saved_cities', JSON.stringify(newCities)).catch(console.error);
  };

  const currentCity = cities.find(c => c.isCurrent) || cities[0];
  const theme = isDarkMode ? COLORS.dark : COLORS.light;

  const renderContent = () => {
    switch (activeTab) {
      case AppTab.VAKITLER:
        return <Vakitler currentCity={currentCity} isDarkMode={isDarkMode} />;
      case AppTab.SEHIRLER:
        return <Sehirler cities={cities} onUpdateCities={updateCities} isDarkMode={isDarkMode} />;
      case AppTab.KIBLE:
        return <Kible currentCity={currentCity} isDarkMode={isDarkMode} />;
      case AppTab.GUNLER:
        return <Gunler isDarkMode={isDarkMode} />;
      default:
        return <Vakitler currentCity={currentCity} isDarkMode={isDarkMode} />;
    }
  };

  const tabItems = [
    { id: AppTab.VAKITLER, label: 'Vakitler', Icon: Clock },
    { id: AppTab.SEHIRLER, label: 'Şehirler', Icon: Globe },
    { id: AppTab.KIBLE, label: 'Kıble', Icon: Compass },
    { id: AppTab.GUNLER, label: 'Günler', Icon: Calendar },
  ];

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <StatusBar style={isDarkMode ? 'light' : 'dark'} />

      {/* Floating Dark Mode Toggle Button */}
      <TouchableOpacity
        onPress={toggleTheme}
        activeOpacity={0.8}
        style={[
          styles.themeToggleBtn,
          {
            top: insets.top + (Platform.OS === 'ios' ? 12 : 18),
            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(255,255,255,0.25)',
          },
        ]}
      >
        {isDarkMode ? <Sun size={20} color="#ffffff" /> : <Moon size={20} color="#ffffff" />}
      </TouchableOpacity>

      {/* Main Content Area */}
      <View style={[styles.contentArea, { paddingTop: insets.top }]}>
        {renderContent()}
      </View>

      {/* Bottom Navigation Tab Bar */}
      <View
        style={[
          styles.tabBar,
          {
            backgroundColor: theme.tabBarBg,
            borderTopColor: theme.tabBarBorder,
            paddingBottom: Math.max(insets.bottom, 10),
          },
        ]}
      >
        {tabItems.map(tab => {
          const isActive = activeTab === tab.id;
          const { Icon } = tab;
          return (
            <TouchableOpacity
              key={tab.id}
              activeOpacity={0.7}
              onPress={() => setActiveTab(tab.id)}
              style={styles.tabButton}
            >
              <Icon
                size={22}
                color={isActive ? theme.activeTab : theme.inactiveTab}
              />
              <Text
                style={[
                  styles.tabLabel,
                  {
                    color: isActive ? theme.activeTab : theme.inactiveTab,
                    fontWeight: isActive ? '900' : '700',
                  },
                ]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default function App() {
  return (
    <SafeAreaProvider>
      <MainScreen />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  themeToggleBtn: {
    position: 'absolute',
    right: 18,
    zIndex: 99,
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  tabBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    paddingTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 8,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingVertical: 4,
  },
  tabLabel: {
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
});
