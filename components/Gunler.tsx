import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { GoogleGenAI } from '@google/genai';
import {
  ChevronLeft,
  ChevronRight,
  Repeat,
  MoonStar,
  Calendar as CalendarIcon,
} from 'lucide-react-native';
import { ImportantDay } from '../types';
import { COLORS, MOCK_IMPORTANT_DAYS } from '../constants';

type CalendarView = 'gregorian' | 'hijri';

interface GunlerProps {
  isDarkMode: boolean;
}

export const Gunler: React.FC<GunlerProps> = ({ isDarkMode }) => {
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const [viewType, setViewType] = useState<CalendarView>('gregorian');
  const [selectedYear, setSelectedYear] = useState(2026);
  const [importantDays, setImportantDays] = useState<ImportantDay[]>(MOCK_IMPORTANT_DAYS);
  const [loading, setLoading] = useState(false);

  const getApiKey = () => {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  };

  const fetchHolidays = async (year: number, type: CalendarView) => {
    setLoading(true);
    const apiKey = getApiKey();

    if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const calendarName = type === 'gregorian' ? 'Gregorian' : 'Hijri';

        const prompt = `List all major Turkish Islamic holidays and Kandil nights for the ${calendarName} year ${year}. 
        Include events like Kandils (Regaib, Mirac, Berat, Mevlid), Ramadan start, Kadir Gecesi, and Eids (Ramazan & Kurban Bayrami).
        Return strictly as a JSON array of objects with this schema: 
        [{ "id": "string", "name": "Turkish Holiday Name", "dateGregorian": "Day Month Year", "dateHijri": "Day Month HijriYear" }]`;

        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          },
        });

        const data = JSON.parse(response.text || '[]');
        if (Array.isArray(data) && data.length > 0) {
          setImportantDays(data);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.error('Holiday fetch error:', error);
      }
    }

    // Default static holidays if AI offline or fallback
    if (year === 2026 || year === 1447) {
      setImportantDays(MOCK_IMPORTANT_DAYS);
    } else {
      setImportantDays([
        { id: '1', name: 'Üç Ayların Başlangıcı', dateGregorian: `21 Aralık ${year - 1}`, dateHijri: '1 Receb' },
        { id: '2', name: "Mi'râc Kandili Gecesi", dateGregorian: `15 Ocak ${year}`, dateHijri: '26 Receb' },
        { id: '3', name: 'Berât Kandili Gecesi', dateGregorian: `2 Şubat ${year}`, dateHijri: "14 Şa'bân" },
        { id: '4', name: "Ramazân-ı Şerîf'in Başlangıcı", dateGregorian: `19 Şubat ${year}`, dateHijri: '1 Ramazan' },
        { id: '5', name: 'Kadir Gecesi', dateGregorian: `16 Mart ${year}`, dateHijri: '26 Ramazan' },
        { id: '6', name: 'Ramazan Bayramı (1. Gün)', dateGregorian: `20 Mart ${year}`, dateHijri: '1 Şevval' },
        { id: '7', name: 'Kurban Bayramı (1. Gün)', dateGregorian: `27 Mayıs ${year}`, dateHijri: '10 Zilhicce' },
        { id: '8', name: 'Hicri Yılbaşı', dateGregorian: `16 Haziran ${year}`, dateHijri: '1 Muharrem' },
        { id: '9', name: 'Aşûre Günü', dateGregorian: `25 Haziran ${year}`, dateHijri: '10 Muharrem' },
        { id: '10', name: 'Mevlid Kandili', dateGregorian: `24 Ağustos ${year}`, dateHijri: '11 Rebiülevvel' },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchHolidays(selectedYear, viewType);
  }, [selectedYear, viewType]);

  const toggleView = () => {
    const nextView = viewType === 'gregorian' ? 'hijri' : 'gregorian';
    setViewType(nextView);
    if (nextView === 'hijri') {
      setSelectedYear(1447);
    } else {
      setSelectedYear(2026);
    }
  };

  const years = Array.from({ length: 10 }, (_, i) => {
    const base = viewType === 'gregorian' ? 2024 : 1445;
    return base + i;
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: theme.headerBg }]}>
        <Text style={styles.headerTitle}>MÜBAREK GÜNLER</Text>
        <Text style={styles.headerSubtitle}>DİNİ TAKVİM {selectedYear}</Text>

        <View style={styles.yearNavigatorRow}>
          <TouchableOpacity
            onPress={() => setSelectedYear(p => p - 1)}
            style={styles.yearArrowBtn}
          >
            <ChevronLeft size={20} color="#ffffff" />
          </TouchableOpacity>

          <View style={styles.yearCenterCol}>
            <Text style={styles.yearBigText}>{selectedYear}</Text>
            <TouchableOpacity onPress={toggleView} style={styles.calendarToggleBtn}>
              <Repeat size={12} color="rgba(255,255,255,0.7)" />
              <Text style={styles.calendarToggleText}>
                {viewType === 'gregorian' ? 'MİLADİ' : 'HİCRİ'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            onPress={() => setSelectedYear(p => p + 1)}
            style={styles.yearArrowBtn}
          >
            <ChevronRight size={20} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Year Selection Horizontal Strip */}
      <View style={[styles.yearStripContainer, { backgroundColor: theme.card, borderBottomColor: theme.cardBorder }]}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.yearStripContent}
        >
          {years.map(y => (
            <TouchableOpacity
              key={y}
              onPress={() => setSelectedYear(y)}
              style={[
                styles.yearChip,
                selectedYear === y
                  ? { backgroundColor: COLORS.primary, borderColor: COLORS.primary }
                  : { backgroundColor: isDarkMode ? '#1a1a1a' : '#f3f4f6', borderColor: theme.cardBorder },
              ]}
            >
              <Text
                style={[
                  styles.yearChipText,
                  { color: selectedYear === y ? '#ffffff' : theme.textSecondary },
                ]}
              >
                {y}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Holiday Cards List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={COLORS.primary} />
          <Text style={[styles.loadingText, { color: theme.textMuted }]}>
            Takvim güncelleniyor...
          </Text>
        </View>
      ) : (
        <FlatList
          data={importantDays}
          keyExtractor={(item, index) => item.id || `day-${index}`}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <View style={[styles.holidayCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <View style={[styles.holidaySideBar, { backgroundColor: isDarkMode ? COLORS.accentRed : COLORS.primary }]} />

              <View style={styles.holidayCardBody}>
                <View style={styles.holidayBadgeRow}>
                  <MoonStar size={14} color={isDarkMode ? COLORS.accentRed : COLORS.primary} />
                  <Text style={[styles.holidayBadgeText, { color: theme.textMuted }]}>DİNİ GÜN</Text>
                </View>

                <Text style={[styles.holidayNameText, { color: theme.textPrimary }]}>
                  {item.name}
                </Text>

                <View style={[styles.datesFooterRow, { borderTopColor: theme.cardBorder }]}>
                  <View style={styles.dateCol}>
                    <Text
                      style={[
                        styles.dateMainValue,
                        { color: viewType === 'gregorian' ? theme.textPrimary : theme.textMuted },
                      ]}
                    >
                      {item.dateGregorian}
                    </Text>
                    <Text style={[styles.dateSubLabel, { color: theme.textMuted }]}>MİLADİ</Text>
                  </View>

                  <View style={[styles.dateDivider, { backgroundColor: theme.cardBorder }]} />

                  <View style={[styles.dateCol, { alignItems: 'flex-end' }]}>
                    <Text
                      style={[
                        styles.dateMainValue,
                        { color: viewType === 'hijri' ? theme.textPrimary : theme.textMuted },
                      ]}
                    >
                      {item.dateHijri}
                    </Text>
                    <Text style={[styles.dateSubLabel, { color: theme.textMuted }]}>HİCRİ</Text>
                  </View>
                </View>
              </View>
            </View>
          )}
        />
      )}
    </View>
  );
};

export default Gunler;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingTop: 20,
    paddingBottom: 24,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginTop: 2,
    marginBottom: 16,
  },
  yearNavigatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  yearArrowBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  yearCenterCol: {
    alignItems: 'center',
  },
  yearBigText: {
    fontSize: 44,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: -1.5,
  },
  calendarToggleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.18)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 6,
    gap: 6,
  },
  calendarToggleText: {
    fontSize: 9,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  yearStripContainer: {
    borderBottomWidth: 1,
    paddingVertical: 10,
  },
  yearStripContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  yearChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  yearChipText: {
    fontSize: 12,
    fontWeight: '800',
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  holidayCard: {
    borderRadius: 24,
    borderWidth: 1,
    overflow: 'hidden',
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  holidaySideBar: {
    width: 6,
  },
  holidayCardBody: {
    flex: 1,
    padding: 16,
  },
  holidayBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  holidayBadgeText: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  holidayNameText: {
    fontSize: 16,
    fontWeight: '900',
    marginBottom: 12,
    lineHeight: 22,
  },
  datesFooterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    paddingTop: 10,
  },
  dateCol: {
    flex: 1,
  },
  dateDivider: {
    width: 1,
    height: 24,
    marginHorizontal: 12,
  },
  dateMainValue: {
    fontSize: 12,
    fontWeight: '800',
  },
  dateSubLabel: {
    fontSize: 8,
    fontWeight: '800',
    letterSpacing: 1,
    marginTop: 2,
  },
});
