import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { ActivityIndicator, View } from 'react-native';

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

// Student Screens
import StudentDashboard from '../screens/student/StudentDashboard';
import JoinClassroomScreen from '../screens/student/JoinClassroomScreen';
import TakeTestScreen from '../screens/student/TakeTestScreen';
import TestResultScreen from '../screens/student/TestResultScreen';

const Stack = createNativeStackNavigator();

const screenOptions = {
  headerShown: false,
  animation: 'slide_from_right',
  contentStyle: { backgroundColor: COLORS.bg },
};

export default function AppNavigator() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadUser = async () => {
      const savedUser = await getUser();
      setUser(savedUser);
      setLoading(false);
    };
    loadUser();
  }, []);

  const handleLogin = (userData) => {
    setUser(userData);
  };

  const handleLogout = () => {
    setUser(null);
  };

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: COLORS.bg, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <NavigationContainer>
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
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
