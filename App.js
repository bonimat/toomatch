import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import NewMatchScreen from './src/screens/NewMatchScreen';
import DirectoryScreen from './src/screens/DirectoryScreen';
import EntityDetailScreen from './src/screens/EntityDetailScreen';
import StatsScreen from './src/screens/StatsScreen';
import HistoryScreen from './src/screens/HistoryScreen';
import OnboardingScreen from './src/screens/OnboardingScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import { LanguageProvider, useLanguage } from './src/context/LanguageContext';
import { TRANSLATIONS } from './src/constants/translations';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder for other tabs
const PlaceholderScreen = ({ name }) => (
  <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>{name}</Text>
  </View>
);

// Wrapper components to avoid inline function warning
const HistoryTab = () => <PlaceholderScreen name="HISTORY" />;

// Tab Navigator
function MainTabs() {
  const { t } = useLanguage();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0a0a0a',
          borderTopColor: '#1c1c1e',
          height: 85,
          paddingBottom: 25,
        },
        tabBarActiveTintColor: '#ccff00',
        tabBarInactiveTintColor: '#666',
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.5,
          marginTop: 4
        }
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: t('TAB_HOME'),
          tabBarIcon: ({ color, size }) => <Ionicons name="home" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="History"
        component={HistoryScreen}
        options={{
          tabBarLabel: t('TAB_HISTORY'),
          tabBarIcon: ({ color, size }) => <Ionicons name="time" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="Stats"
        component={StatsScreen}
        options={{
          tabBarLabel: t('TAB_STATS'),
          tabBarIcon: ({ color, size }) => <Ionicons name="stats-chart" size={24} color={color} />
        }}
      />
      <Tab.Screen
        name="Club"
        component={DirectoryScreen}
        options={{
          tabBarLabel: t('TAB_CLUB'),
          tabBarIcon: ({ color, size }) => <Ionicons name="people" size={24} color={color} />
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <NavigationContainer>
        <StatusBar style="light" />
        <Stack.Navigator
          initialRouteName="Splash"
          screenOptions={{
            headerShown: false,
            ...TransitionPresets.SlideFromRightIOS,
          }}
        >
          <Stack.Screen name="Splash" component={SplashScreen} />
          <Stack.Screen name="Onboarding" component={OnboardingScreen} />
          <Stack.Screen name="Main" component={MainTabs} />
          <Stack.Screen name="EntityDetail" component={EntityDetailScreen} />

          {/* Modal for New Match */}
          <Stack.Screen
            name="NewMatch"
            component={NewMatchScreen}
            options={{
              presentation: 'modal',
              ...TransitionPresets.ModalSlideFromBottomIOS,
            }}
          />
          <Stack.Screen
            name="Profile"
            component={ProfileScreen}
            options={{
              presentation: 'modal',
              ...TransitionPresets.ModalSlideFromBottomIOS,
            }}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </LanguageProvider>
  );
}
