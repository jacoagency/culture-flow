import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { useAuth } from '../../contexts/AuthContext';
import { Button, Card } from '../ui';
import { supabase } from '../../config/supabase';

interface SurveyData {
  age_range: string;
  location: string;
  occupation: string;
  theme_ratings: Record<number, number>;
  priority_themes: number[];
  learning_style: string;
  daily_commitment_minutes: number;
}

const THEMES = [
  { id: 1, name: 'Familia y vínculos cercanos' },
  { id: 2, name: 'Amistades y vida social' },
  { id: 3, name: 'Espiritualidad o sentido trascendente' },
  { id: 4, name: 'Trabajo y vocación' },
  { id: 5, name: 'Conocimiento e intelecto' },
  { id: 6, name: 'Salud física' },
  { id: 7, name: 'Salud mental y emocional' },
  { id: 8, name: 'Amor y sexualidad' },
  { id: 9, name: 'Ocio y disfrute' },
  { id: 10, name: 'Entorno y pertenencia' },
];

const AGE_RANGES = ['18-25', '26-35', '36-45', '46-55', '56-65', '65+'];
const LEARNING_STYLES = ['reading', 'interactive', 'video'];
const COMMITMENT_OPTIONS = [15, 30, 45, 60, 90];

interface OnboardingSurveyProps {
  onComplete: () => void;
}

export const OnboardingSurvey: React.FC<OnboardingSurveyProps> = ({ onComplete }) => {
  const { theme } = useTheme();
  const { user } = useAuth();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [surveyData, setSurveyData] = useState<SurveyData>({
    age_range: '',
    location: '',
    occupation: '',
    theme_ratings: {},
    priority_themes: [],
    learning_style: '',
    daily_commitment_minutes: 30,
  });

  const updateSurveyData = (key: keyof SurveyData, value: any) => {
    setSurveyData(prev => ({ ...prev, [key]: value }));
  };

  const togglePriorityTheme = (themeId: number) => {
    const current = surveyData.priority_themes;
    if (current.includes(themeId)) {
      updateSurveyData('priority_themes', current.filter(id => id !== themeId));
    } else if (current.length < 3) {
      updateSurveyData('priority_themes', [...current, themeId]);
    }
  };

  const updateThemeRating = (themeId: number, rating: number) => {
    updateSurveyData('theme_ratings', {
      ...surveyData.theme_ratings,
      [themeId]: rating,
    });
  };

  const submitSurvey = async () => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('user_survey_responses')
        .upsert({
          user_id: user.id,
          ...surveyData,
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;

      // Update user profile to mark survey as completed
      await supabase
        .from('user_profiles')
        .update({
          survey_completed: true,
          onboarding_completed_at: new Date().toISOString(),
        })
        .eq('id', user.id);

      // Initialize theme progress for the user
      await supabase.rpc('initialize_user_theme_progress', {
        user_uuid: user.id,
      });

      onComplete();
    } catch (error) {
      console.error('Error submitting survey:', error);
      Alert.alert('Error', 'No se pudo guardar la encuesta. Intenta de nuevo.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const canContinue = () => {
    switch (step) {
      case 1:
        return surveyData.age_range && surveyData.location && surveyData.occupation;
      case 2:
        return Object.keys(surveyData.theme_ratings).length === THEMES.length;
      case 3:
        return surveyData.priority_themes.length === 3;
      case 4:
        return surveyData.learning_style && surveyData.daily_commitment_minutes > 0;
      default:
        return false;
    }
  };

  const renderStep1 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Cuéntanos sobre ti
      </Text>
      
      <Card style={styles.inputCard}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Rango de edad
        </Text>
        <View style={styles.optionsGrid}>
          {AGE_RANGES.map(range => (
            <TouchableOpacity
              key={range}
              style={[
                styles.option,
                { borderColor: theme.colors.border },
                surveyData.age_range === range && {
                  backgroundColor: theme.colors.primary,
                }
              ]}
              onPress={() => updateSurveyData('age_range', range)}
            >
              <Text style={[
                styles.optionText,
                { color: surveyData.age_range === range ? '#fff' : theme.colors.text }
              ]}>
                {range}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>

      <Card style={styles.inputCard}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Ubicación
        </Text>
        <TextInput
          style={[styles.textInput, {
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          value={surveyData.location}
          onChangeText={(text) => updateSurveyData('location', text)}
          placeholder="Ciudad, País"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </Card>

      <Card style={styles.inputCard}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          Ocupación
        </Text>
        <TextInput
          style={[styles.textInput, {
            borderColor: theme.colors.border,
            color: theme.colors.text,
          }]}
          value={surveyData.occupation}
          onChangeText={(text) => updateSurveyData('occupation', text)}
          placeholder="Tu ocupación actual"
          placeholderTextColor={theme.colors.textSecondary}
        />
      </Card>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        ¿Qué tan satisfecho te sientes en cada área?
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Califica del 1 al 10 tu nivel actual de satisfacción
      </Text>

      {THEMES.map(theme_item => (
        <Card key={theme_item.id} style={styles.ratingCard}>
          <Text style={[styles.themeLabel, { color: theme.colors.text }]}>
            {theme_item.name}
          </Text>
          <View style={styles.ratingButtons}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(rating => (
              <TouchableOpacity
                key={rating}
                style={[
                  styles.ratingButton,
                  { borderColor: theme.colors.border },
                  surveyData.theme_ratings[theme_item.id] === rating && {
                    backgroundColor: theme.colors.primary,
                  }
                ]}
                onPress={() => updateThemeRating(theme_item.id, rating)}
              >
                <Text style={[
                  styles.ratingText,
                  {
                    color: surveyData.theme_ratings[theme_item.id] === rating
                      ? '#fff' : theme.colors.text
                  }
                ]}>
                  {rating}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>
      ))}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Elige tus 3 prioridades principales
      </Text>
      <Text style={[styles.stepSubtitle, { color: theme.colors.textSecondary }]}>
        Selecciona las áreas en las que más quieres enfocarte
      </Text>

      {THEMES.map(theme_item => (
        <TouchableOpacity
          key={theme_item.id}
          style={[
            styles.priorityOption,
            { borderColor: theme.colors.border },
            surveyData.priority_themes.includes(theme_item.id) && {
              backgroundColor: theme.colors.primary + '20',
              borderColor: theme.colors.primary,
            }
          ]}
          onPress={() => togglePriorityTheme(theme_item.id)}
          disabled={
            !surveyData.priority_themes.includes(theme_item.id) &&
            surveyData.priority_themes.length >= 3
          }
        >
          <Text style={[
            styles.priorityText,
            {
              color: surveyData.priority_themes.includes(theme_item.id)
                ? theme.colors.primary : theme.colors.text
            }
          ]}>
            {theme_item.name}
          </Text>
        </TouchableOpacity>
      ))}

      <Text style={[styles.selectedCount, { color: theme.colors.textSecondary }]}>
        {surveyData.priority_themes.length} de 3 seleccionadas
      </Text>
    </View>
  );

  const renderStep4 = () => (
    <View style={styles.stepContainer}>
      <Text style={[styles.stepTitle, { color: theme.colors.text }]}>
        Preferencias de aprendizaje
      </Text>

      <Card style={styles.inputCard}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          ¿Cómo prefieres aprender?
        </Text>
        <View style={styles.optionsGrid}>
          {LEARNING_STYLES.map(style => {
            const styleLabels = {
              reading: 'Lectura',
              interactive: 'Interactivo',
              video: 'Videos'
            };
            return (
              <TouchableOpacity
                key={style}
                style={[
                  styles.option,
                  { borderColor: theme.colors.border },
                  surveyData.learning_style === style && {
                    backgroundColor: theme.colors.primary,
                  }
                ]}
                onPress={() => updateSurveyData('learning_style', style)}
              >
                <Text style={[
                  styles.optionText,
                  { color: surveyData.learning_style === style ? '#fff' : theme.colors.text }
                ]}>
                  {styleLabels[style as keyof typeof styleLabels]}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </Card>

      <Card style={styles.inputCard}>
        <Text style={[styles.inputLabel, { color: theme.colors.text }]}>
          ¿Cuánto tiempo quieres dedicar diariamente?
        </Text>
        <View style={styles.optionsGrid}>
          {COMMITMENT_OPTIONS.map(minutes => (
            <TouchableOpacity
              key={minutes}
              style={[
                styles.option,
                { borderColor: theme.colors.border },
                surveyData.daily_commitment_minutes === minutes && {
                  backgroundColor: theme.colors.primary,
                }
              ]}
              onPress={() => updateSurveyData('daily_commitment_minutes', minutes)}
            >
              <Text style={[
                styles.optionText,
                { color: surveyData.daily_commitment_minutes === minutes ? '#fff' : theme.colors.text }
              ]}>
                {minutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </Card>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: theme.colors.text }]}>
            Bienvenido a tu viaje de desarrollo personal
          </Text>
          <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
            Paso {step} de 4
          </Text>
        </View>

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <View style={styles.buttonContainer}>
          {step > 1 && (
            <Button
              variant="outline"
              onPress={() => setStep(step - 1)}
              style={styles.backButton}
            >
              Anterior
            </Button>
          )}
          
          {step < 4 ? (
            <Button
              onPress={() => setStep(step + 1)}
              disabled={!canContinue()}
              style={styles.continueButton}
            >
              Continuar
            </Button>
          ) : (
            <Button
              onPress={submitSurvey}
              loading={isSubmitting}
              disabled={!canContinue()}
              style={styles.continueButton}
            >
              Finalizar
            </Button>
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
  },
  stepContainer: {
    padding: 20,
  },
  stepTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  inputCard: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  optionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  option: {
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    minWidth: 80,
    alignItems: 'center',
  },
  optionText: {
    fontSize: 14,
    fontWeight: '500',
  },
  ratingCard: {
    marginBottom: 12,
  },
  themeLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  ratingButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
  },
  ratingButton: {
    borderWidth: 1,
    borderRadius: 6,
    width: 32,
    height: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '500',
  },
  priorityOption: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  priorityText: {
    fontSize: 16,
    fontWeight: '500',
  },
  selectedCount: {
    textAlign: 'center',
    fontSize: 14,
    marginTop: 16,
  },
  buttonContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  backButton: {
    flex: 1,
  },
  continueButton: {
    flex: 2,
  },
});