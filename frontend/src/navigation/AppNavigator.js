import React, { useState, useEffect } from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View, Animated, Easing, StyleSheet, Dimensions } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');

const TransparentTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: 'transparent',
  },
};

import { getUser } from '../utils/auth';
import { COLORS } from '../styles/theme';

// Auth Screens
import SplashScreen from '../screens/auth/SplashScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';

// Teacher Screens
import TeacherDashboard from '../screens/teacher/TeacherDashboard';
import CreateClassroomScreen from '../screens/teacher/CreateClassroomScreen';
import ClassroomDetailScreen from '../screens/teacher/ClassroomDetailScreen';
import AddNotesScreen from '../screens/teacher/AddNotesScreen';
import GenerateTestsScreen from '../screens/teacher/GenerateTestsScreen';
import TeacherHistoryScreen from '../screens/teacher/TeacherHistoryScreen';
import TeacherClassroomHistoryScreen from '../screens/teacher/TeacherClassroomHistoryScreen';

// Student Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import JoinClassroomScreen from '../screens/student/JoinClassroomScreen';
import TakeTestScreen from '../screens/student/TakeTestScreen';
import TestResultScreen from '../screens/student/TestResultScreen';
import StudentHistoryScreen from '../screens/student/StudentHistoryScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: 'fade',
  contentStyle: { backgroundColor: 'transparent' },
};

const NAVIGATION_STATE_KEY = 'TESTIFY_NAVIGATION_STATE';

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [initialState, setInitialState] = useState();
  const [isReady, setIsReady] = useState(false);

  const translateX = React.useRef(new Animated.Value(0)).current;
  const translateY = React.useRef(new Animated.Value(0)).current;

  const triggerTransitionAnimation = () => {
    const nextX = -Math.random() * (width * 0.5);
    const nextY = -Math.random() * (height * 0.5);

    Animated.parallel([
      Animated.timing(translateX, {
        toValue: nextX,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
      Animated.timing(translateY, {
        toValue: nextY,
        duration: 700,
        useNativeDriver: true,
        easing: Easing.out(Easing.cubic),
      }),
    ]).start();
  };

  useEffect(() => {
    const restoreState = async () => {
      try {
        const savedStateString = await AsyncStorage.getItem(NAVIGATION_STATE_KEY);
        const state = savedStateString ? JSON.parse(savedStateString) : undefined;
        if (state !== undefined) {
          setInitialState(state);
        }
      } catch (e) {
        // Ignore error
      } finally {
        setIsReady(true);
      }
    };

    const loadUser = async () => {
      const savedUser = await getUser();
      setUser(savedUser);
      setLoading(false);
      restoreState();
    };
    loadUser();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem(NAVIGATION_STATE_KEY);
    setUser(null);
  };

  if (loading || !isReady) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: '#0F0F1A', overflow: 'hidden' }}>
      <Animated.View style={{
         position: 'absolute',
         width: width * 1.5,
         height: height * 1.5,
         transform: [{ translateX }, { translateY }]
      }}>
        <LinearGradient
          colors={['#4f009e', '#03002e', '#000000']}
          start={{ x: 0.1, y: 0.1 }}
          end={{ x: 0.9, y: 0.9 }}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
      <NavigationContainer
        theme={TransparentTheme}
        initialState={initialState}
        onStateChange={(state) => {
          AsyncStorage.setItem(NAVIGATION_STATE_KEY, JSON.stringify(state));
          triggerTransitionAnimation();
        }}
      >
      <Stack.Navigator screenOptions={screenOptions}>
        {!user ? (
          // Auth Stack
          <>
            <Stack.Screen name="Splash" component={SplashScreen} />
            <Stack.Screen name="Login">
              {props => <LoginScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
            <Stack.Screen name="Register">
              {props => <RegisterScreen {...props} onLogin={handleLogin} />}
            </Stack.Screen>
          </>
        ) : user.role === 'teacher' ? (
          // Teacher Stack
          <>
            <Stack.Screen name="TeacherDashboard">
              {props => <TeacherDashboard {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="CreateClassroom" component={CreateClassroomScreen} />
            <Stack.Screen name="ClassroomDetail" component={ClassroomDetailScreen} />
            <Stack.Screen name="AddNotes" component={AddNotesScreen} />
            <Stack.Screen name="GenerateTests" component={GenerateTestsScreen} />
            <Stack.Screen name="TeacherHistory" component={TeacherHistoryScreen} />
            <Stack.Screen name="TeacherClassroomHistory" component={TeacherClassroomHistoryScreen} />
            <Stack.Screen name="TestResult" component={TestResultScreen} />
          </>
        ) : (
          // Student Stack
          <>
            <Stack.Screen name="StudentDashboard">
              {props => <StudentDashboard {...props} user={user} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="JoinClassroom" component={JoinClassroomScreen} />
            <Stack.Screen name="TakeTest" component={TakeTestScreen} />
            <Stack.Screen name="TestResult" component={TestResultScreen} />
            <Stack.Screen name="StudentHistory" component={StudentHistoryScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
    </View>
  );
}
