import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { ContentCategory } from '../types';

const CATEGORIES: { id: ContentCategory; label: string; emoji: string }[] = [
  { id: 'history', label: 'Historia', emoji: '🏛️' },
  { id: 'art', label: 'Arte', emoji: '🎨' },
  { id: 'music', label: 'Música', emoji: '🎵' },
  { id: 'literature', label: 'Literatura', emoji: '📚' },
  { id: 'architecture', label: 'Arquitectura', emoji: '🏗️' },
  { id: 'culture', label: 'Cultura Popular', emoji: '🎭' },
];

export const AuthScreen: React.FC = () => {
  const { login, register } = useAuth();
  const { theme } = useTheme();
  const colors = theme.colors;
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);

  // Form fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<ContentCategory[]>([]);

  const handleSubmit = async () => {
    if (!email || !password || (!isLogin && !name)) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);

    try {
      let result;
      if (isLogin) {
        result = await login(email, password);
      } else {
        result = await register({
          name,
          email,
          password,
          preferredCategories: selectedCategories,
        });
      }

      if (!result.success) {
        Alert.alert('Error', result.error || 'Ha ocurrido un error');
      }
    } catch (error) {
      Alert.alert('Error', 'Error de conexión');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (categoryId: ContentCategory) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContainer: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    title: {
      fontSize: 32,
      fontWeight: 'bold',
      color: colors.text,
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 40,
    },
    inputContainer: {
      marginBottom: 16,
    },
    label: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
    },
    input: {
      borderWidth: 1,
      borderColor: colors.border,
      borderRadius: 12,
      padding: 16,
      fontSize: 16,
      color: colors.text,
      backgroundColor: colors.cardBackground,
    },
    button: {
      backgroundColor: colors.primary,
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 8,
    },
    buttonDisabled: {
      backgroundColor: colors.textSecondary,
    },
    buttonText: {
      color: 'white',
      fontSize: 16,
      fontWeight: '600',
    },
    switchContainer: {
      flexDirection: 'row',
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 24,
    },
    switchText: {
      color: colors.textSecondary,
      fontSize: 16,
    },
    switchButton: {
      color: colors.primary,
      fontSize: 16,
      fontWeight: '600',
      marginLeft: 4,
    },
    categoriesContainer: {
      marginVertical: 24,
    },
    categoriesTitle: {
      fontSize: 18,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 16,
      textAlign: 'center',
    },
    categoriesGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'center',
      gap: 12,
    },
    categoryItem: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.cardBackground,
      borderWidth: 2,
      borderColor: colors.border,
      borderRadius: 20,
      paddingHorizontal: 16,
      paddingVertical: 8,
      margin: 4,
    },
    categoryItemSelected: {
      borderColor: colors.primary,
      backgroundColor: colors.primary + '20',
    },
    categoryEmoji: {
      fontSize: 16,
      marginRight: 8,
    },
    categoryText: {
      fontSize: 14,
      color: colors.text,
      fontWeight: '500',
    },
    demoContainer: {
      marginTop: 24,
      padding: 16,
      backgroundColor: colors.cardBackground,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: colors.border,
    },
    demoTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    demoText: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
      lineHeight: 20,
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.container}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>CulturaFlow</Text>
          <Text style={styles.subtitle}>
            Aprende cultura mientras navegas
          </Text>

          {!isLogin && (
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Nombre</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Tu nombre completo"
                placeholderTextColor={colors.textSecondary}
                autoCapitalize="words"
              />
            </View>
          )}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="tu@email.com"
              placeholderTextColor={colors.textSecondary}
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Contraseña</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="••••••••"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
            />
          </View>

          {!isLogin && (
            <View style={styles.categoriesContainer}>
              <Text style={styles.categoriesTitle}>
                ¿Qué temas te interesan más?
              </Text>
              <View style={styles.categoriesGrid}>
                {CATEGORIES.map(category => (
                  <TouchableOpacity
                    key={category.id}
                    style={[
                      styles.categoryItem,
                      selectedCategories.includes(category.id) &&
                        styles.categoryItemSelected,
                    ]}
                    onPress={() => toggleCategory(category.id)}
                  >
                    <Text style={styles.categoryEmoji}>{category.emoji}</Text>
                    <Text style={styles.categoryText}>{category.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={styles.buttonText}>
                {isLogin ? 'Iniciar Sesión' : 'Crear Cuenta'}
              </Text>
            )}
          </TouchableOpacity>

          <View style={styles.switchContainer}>
            <Text style={styles.switchText}>
              {isLogin ? '¿No tienes cuenta?' : '¿Ya tienes cuenta?'}
            </Text>
            <TouchableOpacity onPress={() => setIsLogin(!isLogin)}>
              <Text style={styles.switchButton}>
                {isLogin ? 'Regístrate' : 'Inicia sesión'}
              </Text>
            </TouchableOpacity>
          </View>

          {isLogin && (
            <View style={styles.demoContainer}>
              <Text style={styles.demoTitle}>Cuenta de prueba</Text>
              <Text style={styles.demoText}>
                Email: demo@culturaflow.com{'\n'}
                Contraseña: password123
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};