'use client';

import React, { useEffect, useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'react-native-secure-storage';
import Toast from 'react-native-toast-message';

// Screen imports
import LoginScreen from './src/screens/LoginScreen';
import SignupScreen from './src/screens/SignupScreen';
import MFASetupScreen from './src/screens/MFASetupScreen';
import MFAVerificationScreen from './src/screens/MFAVerificationScreen';
import HomeScreen from './src/screens/HomeScreen';
import SIMRegistrationScreen from './src/screens/SIMRegistrationScreen';
import ViewRegisteredSIMsScreen from './src/screens/ViewRegisteredSIMsScreen';
import TrackOrderScreen from './src/screens/TrackOrderScreen';
import SettingsScreen from './src/screens/SettingsScreen';

// Icons
import HomeIcon from './src/icons/HomeIcon';
import SIMIcon from './src/icons/SIMIcon';
import TrackIcon from './src/icons/TrackIcon';
import SettingsIcon from './src/icons/SettingsIcon';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

/**
 * Authentication Stack
 */
const AuthStack = () => (
  <Stack.Navigator
    screenOptions={{
      headerShown: false,
      animationEnabled: true,
    }}
  >
    <Stack.Screen name="Login" component={LoginScreen} />
    <Stack.Screen name="Signup" component={SignupScreen} />
    <Stack.Screen name="MFASetup" component={MFASetupScreen} />
    <Stack.Screen name="MFAVerification" component={MFAVerificationScreen} />
  </Stack.Navigator>
);

/**
 * Main App Stack (after authentication)
 */
const AppStack = () => (
  <Tab.Navigator
    screenOptions={{
      headerStyle: {
        backgroundColor: '#3B2F8F',
      },
      headerTintColor: '#fff',
      headerTitleStyle: {
        fontWeight: 'bold',
        fontSize: 18,
      },
      tabBarActiveTintColor: '#3B2F8F',
      tabBarInactiveTintColor: '#999',
      tabBarStyle: {
        backgroundColor: '#fff',
        borderTopColor: '#e0e0e0',
        paddingBottom: 5,
        paddingTop: 5,
      },
    }}
  >
    <Tab.Screen
      name="HomeTab"
      component={HomeScreen}
      options={{
        title: 'Home',
        tabBarLabel: 'Home',
        tabBarIcon: ({ color }) => <HomeIcon color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="RegisterSIMTab"
      component={SIMRegistrationScreen}
      options={{
        title: 'Register SIM',
        tabBarLabel: 'Register',
        tabBarIcon: ({ color }) => <SIMIcon color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="ViewSIMsTab"
      component={ViewRegisteredSIMsScreen}
      options={{
        title: 'My SIMs',
        tabBarLabel: 'My SIMs',
        tabBarIcon: ({ color }) => <SIMIcon color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="TrackTab"
      component={TrackOrderScreen}
      options={{
        title: 'Track Order',
        tabBarLabel: 'Track',
        tabBarIcon: ({ color }) => <TrackIcon color={color} size={24} />,
      }}
    />
    <Tab.Screen
      name="SettingsTab"
      component={SettingsScreen}
      options={{
        title: 'Settings',
        tabBarLabel: 'Settings',
        tabBarIcon: ({ color }) => <SettingsIcon color={color} size={24} />,
      }}
    />
  </Tab.Navigator>
);

/**
 * Main App Component
 */
const App = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    bootstrapAsync();
  }, []);

  const bootstrapAsync = async () => {
    try {
      // Check if user is already authenticated
      const token = await SecureStore.getItem('accessToken');
      const mfaVerified = await AsyncStorage.getItem('mfaVerified');

      if (token && mfaVerified === 'true') {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('[App] Bootstrap error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // Show splash screen here if needed
  }

  return (
    <NavigationContainer>
      {isAuthenticated ? <AppStack /> : <AuthStack />}
      <Toast />
    </NavigationContainer>
  );
};

export default App;
