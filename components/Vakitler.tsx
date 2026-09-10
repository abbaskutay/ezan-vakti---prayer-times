import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Platform,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';
import {
  Sunrise,
  Sun,
  SunMedium,
  Sunset,
  MoonStar,
  Clock,
  Compass,
  AlertTriangle,
  Stars,
  CloudMoon,
  Bell,
  BellOff,
  X,
  Timer,
  Zap,
  Quote,
} from 'lucide-react-native';
import { MOCK_PRAYER_TIMES, GRID_PRAYER_TIMES, COLORS } from '../constants';
import { City, PrayerTime, DetailedPrayerTime, ReminderConfig } from '../types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface VakitlerProps {
  currentCity: City;
  isDarkMode: boolean;
}

export const Vakitler: React.FC<VakitlerProps> = ({ currentCity, isDarkMode }) => {
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const [reminders, setReminders] = useState<Record<string, ReminderConfig>>({});
  const [globalRemindersEnabled, setGlobalRemindersEnabled] = useState(true);
  const [activePage, setActivePage] = useState(0);
  const [now, setNow] = useState(new Date());
  const [showSettings, setShowSettings] = useState<string | null>(null);
  const scrollRef = useRef<ScrollView>(null);

  // Initialize reminder config from AsyncStorage
  useEffect(() => {
    const loadReminders = async () => {
      try {
        const saved = await AsyncStorage.getItem('prayer_reminders_v3');
        if (saved) {
          setReminders(JSON.parse(saved));
        } else {
          const config: Record<string, ReminderConfig> = {};
          MOCK_PRAYER_TIMES.forEach(p => {
            config[p.id] = { enabled: false, offset: 5 };
          });
          setReminders(config);
        }
        const globalSaved = await AsyncStorage.getItem('global_reminders_enabled');
        if (globalSaved !== null) {
          setGlobalRemindersEnabled(JSON.parse(globalSaved));
        }
      } catch (e) {
        console.error('Error loading reminders:', e);
      }
    };
    loadReminders();
  }, []);

  // Clock ticker every second
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Save reminders to AsyncStorage
  useEffect(() => {
    if (Object.keys(reminders).length > 0) {
      AsyncStorage.setItem('prayer_reminders_v3', JSON.stringify(reminders)).catch(console.error);
      AsyncStorage.setItem('global_reminders_enabled', JSON.stringify(globalRemindersEnabled)).catch(console.error);
    }
  }, [reminders, globalRemindersEnabled]);

  const timeToMinutes = (timeStr: string) => {
    const [h, m] = timeStr.split(':').map(Number);
    return h * 60 + m;
  };

  const flattenedGridTimes = useMemo(() => GRID_PRAYER_TIMES.flat(), []);

  const activePrayerId = useMemo(() => {
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    let active = MOCK_PRAYER_TIMES[MOCK_PRAYER_TIMES.length - 1].id;
    for (let i = 0; i < MOCK_PRAYER_TIMES.length; i++) {
      if (timeToMinutes(MOCK_PRAYER_TIMES[i].time) > currentMinutes) {
        active = i === 0 ? MOCK_PRAYER_TIMES[MOCK_PRAYER_TIMES.length - 1].id : MOCK_PRAYER_TIMES[i - 1].id;
        break;
      }
    }
    return active;
  }, [now]);

  const countdownInfo = useMemo(() => {
    const currentMinutesTotal = now.getHours() * 60 + now.getMinutes();
    const targetSet = activePage === 0 ? MOCK_PRAYER_TIMES : flattenedGridTimes;

    let nextTime = targetSet.find(p => timeToMinutes(p.time) > currentMinutesTotal);
    let targetDate = new Date(now);

    if (!nextTime) {
      nextTime = targetSet[0];
      targetDate.setDate(targetDate.getDate() + 1);
    }

    const [h, m] = nextTime.time.split(':').map(Number);
    targetDate.setHours(h, m, 0, 0);

    const diffMs = targetDate.getTime() - now.getTime();
    const diffSec = Math.max(0, Math.floor(diffMs / 1000));

    const pad = (n: number) => n.toString().padStart(2, '0');
    const totalDurationMs = 4 * 3600 * 1000;
    const progress = Math.max(0, Math.min(100, 100 - (diffMs / totalDurationMs) * 100));

    return {
      name: nextTime.name,
      id: nextTime.id,
      h: pad(Math.floor(diffSec / 3600)),
      m: pad(Math.floor((diffSec % 3600) / 60)),
      s: pad(diffSec % 60),
      progress,
    };
  }, [now, activePage, flattenedGridTimes]);

  const toggleReminder = async (id: string) => {
    try {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== 'granted') {
        alert('Bildirim gönderebilmek için bildirim izni gereklidir.');
      }
    } catch (e) {
      console.log('Notifications error', e);
    }
    setReminders(prev => ({
      ...prev,
      [id]: {
        enabled: !prev[id]?.enabled,
        offset: prev[id]?.offset ?? 5,
      },
    }));
  };

  const updateOffset = (id: string, offset: number) => {
    setReminders(prev => ({
      ...prev,
      [id]: {
        enabled: prev[id]?.enabled ?? true,
        offset,
      },
    }));
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const page = Math.round(offsetX / SCREEN_WIDTH);
    if (activePage !== page) {
      setActivePage(page);
    }
  };

  const scrollToPage = (pageIndex: number) => {
    scrollRef.current?.scrollTo({ x: pageIndex * SCREEN_WIDTH, animated: true });
    setActivePage(pageIndex);
  };

  const getPrayerIcon = (id: string, size = 20, color = '#a01826') => {
    switch (id) {
      case 'imsak':
      case 'sabah':
        return <Sunrise size={size} color={color} />;
      case 'gunes':
      case 'israk':
        return <Sun size={size} color={color} />;
      case 'dahve':
      case 'ogle':
      case 'asr_evvel':
        return <SunMedium size={size} color={color} />;
      case 'kerahet':
      case 'isfirar':
        return <AlertTriangle size={size} color={color} />;
      case 'ikindi':
      case 'asr_sani':
        return <Clock size={size} color={color} />;
      case 'aksam':
      case 'istibak':
        return <Sunset size={size} color={color} />;
      case 'yatsi':
      case 'isa_evvel':
      case 'isa_sani':
        return <MoonStar size={size} color={color} />;
      case 'gece_yarisi':
      case 'teheccud':
        return <Stars size={size} color={color} />;
      case 'seher':
        return <CloudMoon size={size} color={color} />;
      case 'kible_saati':
        return <Compass size={size} color={color} />;
      default:
        return <Clock size={size} color={color} />;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScroll}
        style={styles.pager}
      >
        {/* PAGE 1: MAIN LIST VIEW */}
        <ScrollView
          style={[styles.pageContent, { width: SCREEN_WIDTH }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={[styles.headerBanner, { backgroundColor: theme.headerBg }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.dateColLeft}>
                <Text style={styles.dateDayText}>06</Text>
                <Text style={styles.dateSubText}>OCAK 2026</Text>
              </View>

              <View style={styles.cityColCenter}>
                <Text style={styles.cityTitle}>{currentCity.city}</Text>
                <Text style={styles.districtSubText} numberOfLines={1}>
                  {currentCity.name}
                </Text>
              </View>

              <View style={styles.dateColRight}>
                <Text style={styles.dateDayText}>17</Text>
                <Text style={styles.dateSubText}>RECEB 1447</Text>
              </View>
            </View>

            <View style={styles.dayPill}>
              <Text style={styles.dayPillText}>SALI</Text>
            </View>
          </View>

          {/* Daily Quote Card */}
          <View style={[styles.quoteCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            <View style={styles.quoteHeader}>
              <View style={styles.quoteIconBox}>
                <Quote size={14} color={COLORS.primary} />
              </View>
              <Text style={styles.quoteBadgeText}>GÜNÜN SÖZÜ</Text>
            </View>
            <Text style={[styles.quoteText, { color: theme.textSecondary }]}>
              "İyi ameller güzel sûretlerle, kötü ameller de çirkin kıyâfetlerle gelecek, mizâna konacaktır."
            </Text>
            <Text style={[styles.quoteAuthor, { color: isDarkMode ? COLORS.accentRed : COLORS.primary }]}>
              — İbn-i Abbâs (r.a.)
            </Text>
          </View>

          {/* 6 Main Prayer Times List */}
          <View style={[styles.prayerListCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {MOCK_PRAYER_TIMES.map((prayer, index) => {
              const isActive = prayer.id === activePrayerId;
              const isUpcoming = prayer.id === countdownInfo.id && activePage === 0;
              const reminder = reminders[prayer.id];

              return (
                <View
                  key={prayer.id}
                  style={[
                    styles.prayerRow,
                    index < MOCK_PRAYER_TIMES.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                    isUpcoming
                      ? styles.upcomingPrayerRow
                      : isActive
                      ? { backgroundColor: isDarkMode ? 'rgba(160, 24, 38, 0.15)' : 'rgba(160, 24, 38, 0.05)' }
                      : null,
                  ]}
                >
                  <View style={styles.prayerRowLeft}>
                    <View
                      style={[
                        styles.prayerIconBox,
                        isUpcoming
                          ? styles.upcomingIconBox
                          : { backgroundColor: isDarkMode ? '#1a1a1a' : '#f3f4f6' },
                      ]}
                    >
                      {getPrayerIcon(
                        prayer.id,
                        18,
                        isUpcoming ? '#ffffff' : isDarkMode ? COLORS.accentRed : COLORS.primary
                      )}
                    </View>

                    <View style={styles.prayerInfoCol}>
                      <View style={styles.prayerTitleRow}>
                        <Text
                          style={[
                            styles.prayerName,
                            {
                              color: isUpcoming
                                ? '#ffffff'
                                : isActive
                                ? isDarkMode
                                  ? COLORS.accentRed
                                  : COLORS.primary
                                : theme.textPrimary,
                            },
                          ]}
                        >
                          {prayer.name}
                        </Text>
                        {isUpcoming && (
                          <View style={styles.upcomingBadge}>
                            <Text style={styles.upcomingBadgeText}>SIRADAKİ</Text>
                          </View>
                        )}
                      </View>
                      {reminder?.enabled && globalRemindersEnabled && (
                        <Text
                          style={[
                            styles.reminderOffsetSubText,
                            { color: isUpcoming ? 'rgba(255,255,255,0.7)' : theme.textMuted },
                          ]}
                        >
                          {reminder.offset === 0 ? 'Vaktinde' : `${reminder.offset} dk. önce`}
                        </Text>
                      )}
                    </View>
                  </View>

                  <View style={styles.prayerRowRight}>
                    <Text
                      style={[
                        styles.prayerTimeText,
                        {
                          color: isUpcoming
                            ? '#ffffff'
                            : isActive
                            ? isDarkMode
                              ? COLORS.accentRed
                              : COLORS.primary
                            : theme.textPrimary,
                        },
                      ]}
                    >
                      {prayer.time}
                    </Text>

                    <TouchableOpacity
                      onPress={() => setShowSettings(prayer.id)}
                      style={styles.bellButton}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      {reminder?.enabled && globalRemindersEnabled ? (
                        <Bell size={18} color={isUpcoming ? '#ffffff' : COLORS.primary} />
                      ) : (
                        <BellOff size={18} color={isUpcoming ? 'rgba(255,255,255,0.5)' : theme.textMuted} />
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              );
            })}
          </View>
        </ScrollView>

        {/* PAGE 2: DETAILED 18-PERIOD GRID VIEW */}
        <ScrollView
          style={[styles.pageContent, { width: SCREEN_WIDTH }]}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header Banner */}
          <View style={[styles.headerBanner, { backgroundColor: theme.headerBg }]}>
            <View style={styles.headerTopRow}>
              <View style={styles.dateColLeft}>
                <Text style={styles.dateDayText}>06</Text>
                <Text style={styles.dateSubText}>OCAK 2026</Text>
              </View>

              <View style={styles.cityColCenter}>
                <Text style={styles.cityTitle}>{currentCity.city}</Text>
                <Text style={styles.districtSubText}>DETAYLI VAKİTLER</Text>
              </View>

              <View style={styles.dateColRight}>
                <Text style={styles.dateDayText}>17</Text>
                <Text style={styles.dateSubText}>RECEB 1447</Text>
              </View>
            </View>

            <View style={styles.dayPill}>
              <Text style={styles.dayPillText}>SALI</Text>
            </View>
          </View>

          {/* 2-Column Grid */}
          <View style={[styles.gridContainer, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
            {GRID_PRAYER_TIMES.map((row, rowIndex) => (
              <View key={`row-${rowIndex}`} style={styles.gridRow}>
                {row.map((item, colIndex) => {
                  const isUpcoming = item.id === countdownInfo.id && activePage === 1;
                  const isActive = item.id === activePrayerId;

                  return (
                    <TouchableOpacity
                      key={item.id}
                      activeOpacity={0.8}
                      onPress={() => setShowSettings(item.id)}
                      style={[
                        styles.gridCell,
                        colIndex === 0 && { borderRightWidth: 1, borderRightColor: theme.cardBorder },
                        rowIndex < GRID_PRAYER_TIMES.length - 1 && {
                          borderBottomWidth: 1,
                          borderBottomColor: theme.cardBorder,
                        },
                        isUpcoming
                          ? styles.upcomingGridCell
                          : isActive
                          ? { backgroundColor: isDarkMode ? 'rgba(160, 24, 38, 0.15)' : 'rgba(160, 24, 38, 0.05)' }
                          : null,
                      ]}
                    >
                      <View style={styles.gridCellHeader}>
                        <View style={styles.gridCellTitleRow}>
                          {getPrayerIcon(
                            item.id,
                            14,
                            isUpcoming ? '#ffffff' : isDarkMode ? COLORS.accentRed : COLORS.primary
                          )}
                          <Text
                            style={[
                              styles.gridCellName,
                              {
                                color: isUpcoming
                                  ? 'rgba(255,255,255,0.85)'
                                  : isActive
                                  ? isDarkMode
                                    ? COLORS.accentRed
                                    : COLORS.primary
                                  : theme.textSecondary,
                              },
                            ]}
                            numberOfLines={1}
                          >
                            {item.name}
                          </Text>
                        </View>
                        {isUpcoming && <Zap size={12} color="#ffffff" />}
                      </View>

                      {item.sub ? (
                        <Text
                          style={[
                            styles.gridCellSub,
                            { color: isUpcoming ? 'rgba(255,255,255,0.6)' : theme.textMuted },
                          ]}
                          numberOfLines={1}
                        >
                          {item.sub}
                        </Text>
                      ) : null}

                      <Text
                        style={[
                          styles.gridCellTime,
                          {
                            color: isUpcoming ? '#ffffff' : theme.textPrimary,
                          },
                        ]}
                      >
                        {item.time}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </View>
        </ScrollView>
      </ScrollView>

      {/* Dynamic Floating Countdown Card */}
      <View style={styles.floatingCountdownContainer}>
        <View style={[styles.floatingCountdownBox, { backgroundColor: isDarkMode ? '#1a1a1a' : '#111827' }]}>
          <View style={styles.floatingCountdownContent}>
            <View style={styles.floatingCountdownLeft}>
              <View style={styles.floatingIconBadge}>
                {getPrayerIcon(countdownInfo.id, 16, '#ffffff')}
              </View>
              <View>
                <Text style={styles.floatingSubLabel}>
                  {activePage === 0 ? 'SIRADAKİ VAKİT' : 'SIRADAKİ DETAY'}
                </Text>
                <Text style={styles.floatingPrayerName}>{countdownInfo.name}</Text>
              </View>
            </View>

            <View style={styles.floatingTimerDigits}>
              <Text style={styles.floatingTimerText}>{countdownInfo.h}</Text>
              <Text style={styles.floatingTimerColon}>:</Text>
              <Text style={styles.floatingTimerText}>{countdownInfo.m}</Text>
              <Text style={styles.floatingTimerColon}>:</Text>
              <Text style={[styles.floatingTimerText, { color: COLORS.accentRed }]}>{countdownInfo.s}</Text>
            </View>
          </View>

          {/* Progress Bar */}
          <View style={styles.progressBarBackground}>
            <View style={[styles.progressBarFill, { width: `${countdownInfo.progress}%` }]} />
          </View>
        </View>
      </View>

      {/* Page Indicator Dots */}
      <View style={styles.pageDotsContainer}>
        <TouchableOpacity
          onPress={() => scrollToPage(0)}
          style={[styles.dot, activePage === 0 ? styles.activeDot : { backgroundColor: theme.cardBorder }]}
        />
        <TouchableOpacity
          onPress={() => scrollToPage(1)}
          style={[styles.dot, activePage === 1 ? styles.activeDot : { backgroundColor: theme.cardBorder }]}
        />
      </View>

      {/* Notification Settings Modal */}
      <Modal
        visible={!!showSettings}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSettings(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalSheet, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.textPrimary }]}>Bildirim Ayarları</Text>
              <TouchableOpacity
                onPress={() => setShowSettings(null)}
                style={[styles.modalCloseBtn, { backgroundColor: isDarkMode ? '#222' : '#f3f4f6' }]}
              >
                <X size={20} color={theme.textPrimary} />
              </TouchableOpacity>
            </View>

            {showSettings && (
              <View style={styles.modalBody}>
                {/* Toggle Switch */}
                <View style={[styles.modalOptionRow, { backgroundColor: isDarkMode ? '#1a1a1a' : '#f9fafb' }]}>
                  <Text style={[styles.modalOptionLabel, { color: theme.textPrimary }]}>Bildirim Durumu</Text>
                  <TouchableOpacity
                    onPress={() => toggleReminder(showSettings)}
                    style={[
                      styles.toggleTrack,
                      {
                        backgroundColor: reminders[showSettings]?.enabled ? COLORS.primary : '#d1d5db',
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.toggleThumb,
                        reminders[showSettings]?.enabled ? styles.toggleThumbActive : styles.toggleThumbInactive,
                      ]}
                    />
                  </TouchableOpacity>
                </View>

                {/* Offset Options */}
                <View style={styles.offsetSection}>
                  <Text style={[styles.offsetSectionTitle, { color: theme.textMuted }]}>SÜRE SEÇİMİ</Text>
                  <View style={styles.offsetGrid}>
                    {[0, 5, 10, 15, 30].map(off => {
                      const isSelected = reminders[showSettings]?.offset === off;
                      return (
                        <TouchableOpacity
                          key={off}
                          onPress={() => updateOffset(showSettings, off)}
                          style={[
                            styles.offsetButton,
                            isSelected
                              ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                              : { backgroundColor: theme.card, borderColor: theme.cardBorder },
                          ]}
                        >
                          <Text
                            style={[
                              styles.offsetButtonText,
                              { color: isSelected ? '#ffffff' : theme.textSecondary },
                            ]}
                          >
                            {off === 0 ? 'Vakit' : `${off}dk`}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <TouchableOpacity
                  onPress={() => setShowSettings(null)}
                  style={[styles.modalSaveButton, { backgroundColor: COLORS.primary }]}
                >
                  <Text style={styles.modalSaveButtonText}>KAYDET</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default Vakitler;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  pager: {
    flex: 1,
  },
  pageContent: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 150,
  },
  headerBanner: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  headerTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 14,
  },
  dateColLeft: {
    alignItems: 'flex-start',
  },
  dateColRight: {
    alignItems: 'flex-end',
  },
  dateDayText: {
    fontSize: 28,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1,
  },
  dateSubText: {
    fontSize: 9,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1.5,
  },
  cityColCenter: {
    alignItems: 'center',
    maxWidth: 160,
  },
  cityTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -0.5,
  },
  districtSubText: {
    fontSize: 10,
    fontWeight: '700',
    color: 'rgba(255,255,255,0.7)',
    letterSpacing: 1,
    marginTop: 2,
  },
  dayPill: {
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 20,
    paddingVertical: 5,
    borderRadius: 20,
  },
  dayPillText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 2,
  },
  quoteCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  quoteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  quoteIconBox: {
    padding: 5,
    backgroundColor: 'rgba(160, 24, 38, 0.08)',
    borderRadius: 8,
    marginRight: 8,
  },
  quoteBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    color: '#9ca3af',
    letterSpacing: 1.5,
  },
  quoteText: {
    fontSize: 12,
    fontStyle: 'italic',
    lineHeight: 18,
    fontWeight: '500',
  },
  quoteAuthor: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 6,
    letterSpacing: 1,
  },
  prayerListCard: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  prayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  upcomingPrayerRow: {
    backgroundColor: COLORS.primary,
  },
  prayerRowLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerIconBox: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  upcomingIconBox: {
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  prayerInfoCol: {
    justifyContent: 'center',
  },
  prayerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerName: {
    fontSize: 16,
    fontWeight: '800',
  },
  upcomingBadge: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginLeft: 8,
  },
  upcomingBadgeText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  reminderOffsetSubText: {
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  prayerRowRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  prayerTimeText: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.5,
    marginRight: 12,
    ...Platform.select({
      ios: { fontFamily: 'Menlo' },
      android: { fontFamily: 'monospace' },
    }),
  },
  bellButton: {
    padding: 6,
  },
  gridContainer: {
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  gridRow: {
    flexDirection: 'row',
  },
  gridCell: {
    flex: 1,
    paddingVertical: 14,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  upcomingGridCell: {
    backgroundColor: COLORS.primary,
  },
  gridCellHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  gridCellTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  gridCellName: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  gridCellSub: {
    fontSize: 9,
    fontWeight: '600',
    marginBottom: 4,
  },
  gridCellTime: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  floatingCountdownContainer: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    zIndex: 40,
  },
  floatingCountdownBox: {
    borderRadius: 20,
    padding: 14,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 10,
  },
  floatingCountdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  floatingCountdownLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingIconBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  floatingSubLabel: {
    fontSize: 8,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 1,
  },
  floatingPrayerName: {
    fontSize: 12,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  floatingTimerDigits: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  floatingTimerText: {
    fontSize: 20,
    fontWeight: '900',
    color: '#ffffff',
    ...Platform.select({
      ios: { fontFamily: 'Menlo' },
      android: { fontFamily: 'monospace' },
    }),
  },
  floatingTimerColon: {
    fontSize: 18,
    fontWeight: '900',
    color: 'rgba(255,255,255,0.3)',
    marginHorizontal: 2,
  },
  progressBarBackground: {
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.accentRed,
    borderRadius: 2,
  },
  pageDotsContainer: {
    position: 'absolute',
    bottom: 8,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    height: 4,
    width: 6,
    borderRadius: 2,
  },
  activeDot: {
    width: 20,
    backgroundColor: COLORS.primary,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'flex-end',
  },
  modalSheet: {
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    padding: 24,
    paddingBottom: 40,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
  },
  modalCloseBtn: {
    padding: 8,
    borderRadius: 20,
  },
  modalBody: {
    gap: 20,
  },
  modalOptionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
  },
  modalOptionLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  toggleTrack: {
    width: 50,
    height: 28,
    borderRadius: 14,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  toggleThumbInactive: {
    alignSelf: 'flex-start',
  },
  offsetSection: {
    gap: 8,
  },
  offsetSectionTitle: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  offsetGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  offsetButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  offsetButtonText: {
    fontSize: 11,
    fontWeight: '800',
  },
  modalSaveButton: {
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  modalSaveButtonText: {
    fontSize: 13,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1,
  },
});