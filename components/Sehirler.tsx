import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';
import { GoogleGenAI, Type } from '@google/genai';
import {
  Search,
  X,
  Plus,
  Trash2,
  MapPin,
  Check,
  CheckCircle2,
  Globe,
  Edit2,
  ChevronRight,
} from 'lucide-react-native';
import { City } from '../types';
import { COLORS } from '../constants';

interface SehirlerProps {
  cities: City[];
  onUpdateCities: (newCities: City[]) => void;
  isDarkMode: boolean;
}

export const Sehirler: React.FC<SehirlerProps> = ({ cities, onUpdateCities, isDarkMode }) => {
  const theme = isDarkMode ? COLORS.dark : COLORS.light;
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<Partial<City>[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const getApiKey = () => {
    return process.env.EXPO_PUBLIC_GEMINI_API_KEY || process.env.GEMINI_API_KEY || process.env.API_KEY || '';
  };

  const handleSearch = async (query: string) => {
    if (query.trim().length < 3) {
      setSearchResults([]);
      return;
    }

    setLoading(true);
    try {
      const apiKey = getApiKey();
      if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
        // Fallback demo results if no API key is provided
        const mockResults: Partial<City>[] = [
          { name: `${query} Merkez`, district: query, city: query, country: 'Türkiye' },
          { name: `${query} / Çankaya`, district: 'Çankaya', city: 'Ankara', country: 'Türkiye' },
          { name: `${query} / Kadıköy`, district: 'Kadıköy', city: 'İstanbul', country: 'Türkiye' },
        ];
        setSearchResults(mockResults);
        setLoading(false);
        return;
      }

      const ai = new GoogleGenAI({ apiKey });
      const prompt = `Search for the city or district in Turkey matching: "${query}". 
      Return a list of up to 5 matching locations.
      Return ONLY a JSON array of objects matching this schema: 
      [{ "name": "District/City", "district": "District Name", "city": "City Name", "country": "Türkiye" }]`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                district: { type: Type.STRING },
                city: { type: Type.STRING },
                country: { type: Type.STRING },
              },
              required: ['name', 'district', 'city', 'country'],
            },
          },
        },
      });

      const data = JSON.parse(response.text || '[]');
      setSearchResults(data);
    } catch (error) {
      console.error('City search error:', error);
      // Fallback result for resilience
      setSearchResults([
        { name: `${query} (Türkiye)`, district: query, city: query, country: 'Türkiye' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim()) {
        handleSearch(searchQuery);
      } else {
        setSearchResults([]);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const selectCity = (selected: Partial<City>) => {
    const newCity: City = {
      id: Date.now().toString(),
      name: selected.name || `${selected.district} / ${selected.city}`,
      district: selected.district || '',
      city: selected.city || '',
      country: selected.country || 'Türkiye',
      isCurrent: true,
    };

    const exists = cities.find(c => c.name === newCity.name);
    let updatedCities: City[];

    if (exists) {
      updatedCities = cities.map(c => ({
        ...c,
        isCurrent: c.id === exists.id,
      }));
    } else {
      updatedCities = [newCity, ...cities.map(c => ({ ...c, isCurrent: false }))];
    }

    onUpdateCities(updatedCities);
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
    setIsEditing(false);
  };

  const removeCity = (id: string) => {
    if (cities.length <= 1) {
      Alert.alert('Uyarı', 'En az bir şehir listede kalmalıdır.');
      return;
    }
    const updatedCities = cities.filter(c => c.id !== id);
    if (cities.find(c => c.id === id)?.isCurrent && updatedCities.length > 0) {
      updatedCities[0].isCurrent = true;
    }
    onUpdateCities(updatedCities);
  };

  const handleGetLocation = async () => {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Mevcut konumunuzu alabilmek için konum izni vermeniz gerekmektedir.');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      const { latitude, longitude } = location.coords;
      const apiKey = getApiKey();

      if (apiKey && apiKey !== 'PLACEHOLDER_API_KEY') {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `I am at coordinates Latitude: ${latitude}, Longitude: ${longitude}. Identify the Turkish city/district. Return JSON { "name": "District/City", "district": "District", "city": "City", "country": "Türkiye" }`;
        const response = await ai.models.generateContent({
          model: 'gemini-2.5-flash',
          contents: prompt,
          config: { responseMimeType: 'application/json' },
        });
        const data = JSON.parse(response.text || '{}');
        selectCity(data);
      } else {
        // Reverse geocoding via Expo Location native reverse geocode
        const geocode = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (geocode.length > 0) {
          const item = geocode[0];
          const district = item.subregion || item.district || item.city || 'Merkez';
          const city = item.region || item.city || 'İstanbul';
          selectCity({
            name: `${district}/${city}`,
            district,
            city,
            country: item.country || 'Türkiye',
          });
        }
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Hata', 'Konum bilgisi alınamadı.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Header Banner */}
      <View style={[styles.headerBanner, { backgroundColor: theme.headerBg }]}>
        {!isSearching ? (
          <View style={styles.headerRow}>
            <View>
              <Text style={styles.headerTitle}>ŞEHİRLERİM</Text>
              <Text style={styles.headerSubtitle}>KONUM YÖNETİMİ</Text>
            </View>
            <View style={styles.headerActionBtns}>
              <TouchableOpacity
                onPress={() => setIsEditing(!isEditing)}
                style={[
                  styles.headerBtn,
                  isEditing ? styles.headerBtnActive : styles.headerBtnInactive,
                ]}
              >
                {isEditing ? (
                  <CheckCircle2 size={20} color={COLORS.primary} />
                ) : (
                  <Edit2 size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setIsSearching(true)}
                style={[styles.headerBtn, styles.headerBtnInactive]}
              >
                <Search size={20} color="#ffffff" />
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={styles.searchBarRow}>
            <View style={styles.searchInputContainer}>
              <Search size={18} color="rgba(255,255,255,0.6)" style={styles.searchIcon} />
              <TextInput
                autoFocus
                placeholder="Şehir veya ilçe adı..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                value={searchQuery}
                onChangeText={setSearchQuery}
                style={styles.searchInput}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearSearchBtn}>
                  <X size={16} color="rgba(255,255,255,0.6)" />
                </TouchableOpacity>
              )}
            </View>
            <TouchableOpacity
              onPress={() => {
                setIsSearching(false);
                setSearchQuery('');
                setSearchResults([]);
              }}
              style={styles.cancelSearchBtn}
            >
              <Text style={styles.cancelSearchText}>KAPAT</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>

      <FlatList
        data={cities}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <>
            {/* Search Results Dropdown */}
            {isSearching && searchQuery.trim().length >= 3 && (
              <View style={[styles.searchResultsCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
                {loading ? (
                  <View style={styles.searchLoadingBox}>
                    <ActivityIndicator size="small" color={COLORS.primary} />
                    <Text style={[styles.searchLoadingText, { color: theme.textMuted }]}>
                      Şehir aranıyor...
                    </Text>
                  </View>
                ) : searchResults.length > 0 ? (
                  searchResults.map((result, idx) => (
                    <TouchableOpacity
                      key={idx}
                      onPress={() => selectCity(result)}
                      style={[
                        styles.searchResultRow,
                        idx < searchResults.length - 1 && { borderBottomWidth: 1, borderBottomColor: theme.cardBorder },
                      ]}
                    >
                      <View>
                        <Text style={[styles.searchResultName, { color: theme.textPrimary }]}>
                          {result.name}
                        </Text>
                        <Text style={[styles.searchResultSub, { color: theme.textSecondary }]}>
                          {result.district}, {result.city}
                        </Text>
                      </View>
                      <Plus size={18} color={COLORS.primary} />
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={styles.noResultsBox}>
                    <Text style={[styles.noResultsText, { color: theme.textMuted }]}>
                      Sonuç bulunamadı
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Use Current GPS Location Button */}
            <TouchableOpacity
              onPress={handleGetLocation}
              disabled={loading}
              style={[
                styles.currentLocationButton,
                { backgroundColor: theme.card, borderColor: theme.cardBorder },
              ]}
            >
              {loading ? (
                <ActivityIndicator size="small" color={COLORS.primary} />
              ) : (
                <MapPin size={20} color={COLORS.primary} />
              )}
              <Text style={[styles.currentLocationText, { color: theme.textPrimary }]}>
                MEVCUT KONUMU KULLAN
              </Text>
            </TouchableOpacity>
          </>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => {
              if (!isEditing) {
                onUpdateCities(cities.map(c => ({ ...c, isCurrent: c.id === item.id })));
              }
            }}
            style={[
              styles.cityCard,
              {
                backgroundColor: theme.card,
                borderColor: item.isCurrent ? COLORS.primary : theme.cardBorder,
              },
              item.isCurrent && styles.activeCityCard,
            ]}
          >
            <View style={styles.cityCardLeft}>
              <View
                style={[
                  styles.cityIconBox,
                  item.isCurrent
                    ? { backgroundColor: COLORS.primary }
                    : { backgroundColor: isDarkMode ? '#1a1a1a' : '#f3f4f6' },
                ]}
              >
                {item.isCurrent ? (
                  <Check size={20} color="#ffffff" />
                ) : (
                  <Globe size={20} color={theme.textMuted} />
                )}
              </View>
              <View style={styles.cityTextCol}>
                <View style={styles.cityNameRow}>
                  <Text
                    style={[
                      styles.cityNameText,
                      { color: item.isCurrent ? (isDarkMode ? '#ffffff' : '#111827') : theme.textSecondary },
                    ]}
                  >
                    {item.name}
                  </Text>
                  {item.isCurrent && (
                    <View style={styles.activePill}>
                      <Text style={styles.activePillText}>AKTİF</Text>
                    </View>
                  )}
                </View>
                <Text style={[styles.cityRegionText, { color: theme.textMuted }]}>
                  {item.city}, {item.country}
                </Text>
              </View>
            </View>

            {isEditing ? (
              <TouchableOpacity
                onPress={() => removeCity(item.id)}
                style={styles.deleteBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color={COLORS.accentRed} />
              </TouchableOpacity>
            ) : (
              <ChevronRight
                size={20}
                color={item.isCurrent ? COLORS.primary : theme.textMuted}
              />
            )}
          </TouchableOpacity>
        )}
      />
    </View>
  );
};

export default Sehirler;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBanner: {
    paddingTop: 20,
    paddingBottom: 22,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  headerSubtitle: {
    fontSize: 10,
    fontWeight: '800',
    color: 'rgba(255,255,255,0.6)',
    letterSpacing: 2,
    marginTop: 2,
  },
  headerActionBtns: {
    flexDirection: 'row',
    gap: 10,
  },
  headerBtn: {
    width: 44,
    height: 44,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnActive: {
    backgroundColor: '#ffffff',
  },
  headerBtnInactive: {
    backgroundColor: 'rgba(255,255,255,0.18)',
  },
  searchBarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    paddingHorizontal: 14,
    height: 46,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  clearSearchBtn: {
    padding: 4,
  },
  cancelSearchBtn: {
    paddingVertical: 8,
  },
  cancelSearchText: {
    fontSize: 11,
    fontWeight: '900',
    color: '#ffffff',
    letterSpacing: 1.5,
  },
  listContent: {
    padding: 16,
    paddingBottom: 100,
    gap: 12,
  },
  searchResultsCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: 'hidden',
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
  },
  searchLoadingBox: {
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  searchLoadingText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1,
  },
  searchResultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  searchResultName: {
    fontSize: 15,
    fontWeight: '800',
  },
  searchResultSub: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  noResultsBox: {
    padding: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  currentLocationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    borderRadius: 22,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    marginBottom: 8,
    gap: 10,
  },
  currentLocationText: {
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  cityCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 22,
    borderWidth: 1.5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  activeCityCard: {
    borderWidth: 2,
  },
  cityCardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  cityIconBox: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  cityTextCol: {
    flex: 1,
  },
  cityNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  cityNameText: {
    fontSize: 15,
    fontWeight: '800',
  },
  activePill: {
    backgroundColor: 'rgba(160, 24, 38, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  activePillText: {
    fontSize: 8,
    fontWeight: '900',
    color: COLORS.primary,
    letterSpacing: 1,
  },
  cityRegionText: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  deleteBtn: {
    padding: 8,
    backgroundColor: 'rgba(255, 77, 94, 0.1)',
    borderRadius: 12,
  },
});
