import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Switch,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../../hooks/useTheme';
import { Card, Icon, Button } from '../../components/ui';
import { StreakCounter, LevelProgress } from '../../components/gamification';
import { useAuth } from '../../contexts/AuthContext';
import { useProgressData } from '../../hooks/useProgressData';

export const ProfileScreen: React.FC = () => {
  const { theme, themeMode, toggleTheme } = useTheme();
  const { user } = useAuth();
  const { progress, loading } = useProgressData();

  if (loading || !user || !progress) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={[styles.loadingText, { color: theme.colors.textSecondary }]}>
          Cargando perfil...
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      showsVerticalScrollIndicator={false}
    >
      {/* Header */}
      <Card style={styles.header}>
        <View style={styles.profileInfo}>
          <Image
            source={{ 
              uri: user.avatar_url || `https://ui-avatars.com/api/?name=${user.name}&background=4f46e5&color=fff&size=100`
            }}
            style={styles.avatar}
          />
          <View style={styles.userInfo}>
            <Text style={[styles.userName, { color: theme.colors.text }]}>
              {user.name}
            </Text>
            <Text style={[styles.userEmail, { color: theme.colors.textSecondary }]}>
              {user.email}
            </Text>
            <View style={styles.userStats}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {progress.points}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Puntos
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {progress.totalCompleted}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Tarjetas
                </Text>
              </View>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: theme.colors.primary }]}>
                  {progress.level}
                </Text>
                <Text style={[styles.statLabel, { color: theme.colors.textSecondary }]}>
                  Nivel
                </Text>
              </View>
            </View>
          </View>
        </View>
      </Card>

      {/* Progress Cards */}
      <View style={styles.section}>
        <StreakCounter
          currentStreak={progress.currentStreak}
          longestStreak={progress.bestStreak}
        />
      </View>

      <View style={styles.section}>
        <LevelProgress
          currentLevel={progress.level}
          currentPoints={progress.points}
        />
      </View>

      {/* Settings */}
      <Card style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
          Configuración
        </Text>
        
        <View style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="moon" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Modo oscuro
            </Text>
          </View>
          <Switch
            value={themeMode === 'dark'}
            onValueChange={toggleTheme}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="notifications" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Notificaciones
            </Text>
          </View>
          <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="language" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Idioma
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>
              Español
            </Text>
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>

        <TouchableOpacity style={styles.settingItem}>
          <View style={styles.settingInfo}>
            <Icon name="target" size={20} color={theme.colors.textSecondary} />
            <Text style={[styles.settingLabel, { color: theme.colors.text }]}>
              Meta diaria
            </Text>
          </View>
          <View style={styles.settingValue}>
            <Text style={[styles.settingValueText, { color: theme.colors.textSecondary }]}>
              3 tarjetas
            </Text>
            <Icon name="chevron-forward" size={20} color={theme.colors.textSecondary} />
          </View>
        </TouchableOpacity>
      </Card>

      {/* Actions */}
      <View style={styles.actions}>
        <Button
          title="Editar Perfil"
          onPress={() => {}}
          variant="outline"
          style={styles.actionButton}
        />
        
        <Button
          title="Cerrar Sesión"
          onPress={() => {}}
          variant="outline"
          style={styles.actionButton}
        />
      </View>

      <View style={styles.bottomSpacer} />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    marginBottom: 16,
    padding: 20,
  },
  profileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 14,
    marginBottom: 12,
  },
  userStats: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.1)',
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingLabel: {
    fontSize: 16,
  },
  settingValue: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValueText: {
    fontSize: 14,
  },
  actions: {
    gap: 12,
    marginTop: 8,
  },
  actionButton: {
    marginHorizontal: 0,
  },
  bottomSpacer: {
    height: 100,
  },
});