import React from 'react';
import { View, Text } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator, TransitionPresets } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';

// Screens
import SplashScreen from './src/screens/SplashScreen';
import HomeScreen from './src/screens/HomeScreen';
import NewMatchScreen from './src/screens/NewMatchScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Placeholder for other tabs
const PlaceholderScreen = ({ name }) => (
  <View style={{ flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' }}>
    <Text style={{ color: '#fff' }}>{name}</Text>
  </View>
);

// Tab Navigator
function MainTabs() {
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
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarLabel: 'HOME',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⬡</Text> // Using text icons for now, replace with Vectors
        }}
      />
      <Tab.Screen
        name="History"
        component={() => <PlaceholderScreen name="HISTORY" />}
        options={{
          tabBarLabel: 'HISTORY',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>☰</Text>
        }}
      />
      <Tab.Screen
        name="Stats"
        component={() => <PlaceholderScreen name="STATS" />}
        options={{
          tabBarLabel: 'STATS',
          tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 20 }}>⚡</Text>
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
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
        <Stack.Screen name="Main" component={MainTabs} />

        {/* Modal for New Match */}
        <Stack.Screen
          name="NewMatch"
          component={NewMatchScreen}
          options={{
            presentation: 'modal',
            ...TransitionPresets.ModalSlideFromBottomIOS,
          }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
