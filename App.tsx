import React, { useEffect, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Entry, Mood } from './src/types';
import { loadEntries, saveEntries } from './src/storage';
import { getReflection } from './src/services/reflection';
import { configureRevenueCat, type PremiumState } from './src/services/revenuecat';

type Screen = 'today' | 'checkin' | 'journal' | 'plus';

export default function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mood, setMood] = useState<Mood>(3);
  const [text, setText] = useState('');
  const [reflection, setReflection] = useState('');
  const [premium, setPremium] = useState<PremiumState>({ configured: false, isPro: false });

  useEffect(() => { loadEntries().then(setEntries); }, []);
  useEffect(() => { if (screen === 'plus') configureRevenueCat().then(setPremium); }, [screen]);

  async function save() {
    const result = await getReflection(text, mood);
    const next: Entry[] = [{
      id: String(Date.now()),
      createdAt: new Date().toISOString(),
      mood,
      text: text.trim(),
      reflection: result.reflection,
    }, ...entries];
    setEntries(next);
    await saveEntries(next);
    setReflection(result.reflection);
    setText('');
  }

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View><Text style={s.brand}>Inside Me</Text><Text style={s.sub}>Notice patterns. Name what is real.</Text></View>
        <Text style={s.pill}>PRIVATE</Text>
      </View>
      <View style={s.nav}>
        {(['today', 'checkin', 'journal', 'plus'] as Screen[]).map(item => (
          <Pressable key={item} onPress={() => setScreen(item)}><Text style={screen === item ? s.active : s.link}>{item}</Text></Pressable>
        ))}
      </View>
      <ScrollView contentContainerStyle={s.content}>
        {screen === 'today' && <>
          <Text style={s.kicker}>TODAY</Text>
          <Text style={s.title}>Understand the moment before judging the story.</Text>
          <Text style={s.body}>A private check-in, journal, and pattern tool built for the RevenueCat Shipaton.</Text>
          <View style={s.card}><Text style={s.big}>{entries.length}</Text><Text>check-ins saved on this device</Text></View>
          <Pressable style={s.button} onPress={() => setScreen('checkin')}><Text style={s.buttonText}>Start a check-in</Text></Pressable>
        </>}

        {screen === 'checkin' && <>
          <Text style={s.kicker}>CHECK-IN</Text>
          <Text style={s.title}>How are you right now?</Text>
          <View style={s.moods}>{([1,2,3,4,5] as Mood[]).map(value => <Pressable key={value} onPress={() => setMood(value)} style={[s.mood, mood === value && s.selected]}><Text>{value}</Text></Pressable>)}</View>
          <TextInput style={s.input} multiline value={text} onChangeText={setText} placeholder="What happened or what keeps coming back to mind?" />
          <Pressable style={s.button} onPress={save}><Text style={s.buttonText}>Save and reflect</Text></Pressable>
          {!!reflection && <View style={s.card}><Text style={s.cardTitle}>Reflection</Text><Text style={s.body}>{reflection}</Text></View>}
        </>}

        {screen === 'journal' && <>
          <Text style={s.kicker}>JOURNAL</Text><Text style={s.title}>What you have noticed</Text>
          {!entries.length && <Text>No entries yet.</Text>}
          {entries.map(entry => <View key={entry.id} style={s.card}><Text style={s.cardTitle}>Mood {entry.mood}/5</Text><Text style={s.body}>{entry.text || 'No note added.'}</Text><Text>{entry.reflection}</Text></View>)}
        </>}

        {screen === 'plus' && <>
          <Text style={s.kicker}>INSIDE ME PLUS</Text><Text style={s.title}>RevenueCat-powered upgrades.</Text>
          <View style={s.card}><Text style={s.cardTitle}>Free</Text><Text>Check-ins, journal, basic reflections</Text></View>
          <View style={s.card}><Text style={s.cardTitle}>Plus</Text><Text>Longer history, exports, deeper pattern tools</Text><Text style={s.price}>{premium.isPro ? 'Plus active' : premium.priceText ?? 'Offering not connected yet'}</Text>{!!premium.message && <Text>{premium.message}</Text>}</View>
        </>}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0E8' },
  header: { padding: 20, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 26, fontWeight: '900', color: '#1D2B26' },
  sub: { color: '#675F56', fontSize: 12 },
  pill: { fontSize: 10, fontWeight: '900', borderWidth: 1, borderRadius: 20, padding: 7 },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingBottom: 10 },
  link: { color: '#675F56', textTransform: 'capitalize' },
  active: { color: '#1D2B26', fontWeight: '900', textTransform: 'capitalize' },
  content: { padding: 20, paddingBottom: 60 },
  kicker: { color: '#8C5D44', fontWeight: '900', letterSpacing: 2, fontSize: 11 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#1D2B26', marginVertical: 12 },
  body: { fontSize: 16, lineHeight: 23, color: '#3D403A' },
  card: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E3DCCF', borderRadius: 18, padding: 18, marginTop: 16 },
  cardTitle: { fontWeight: '900', color: '#1D2B26', marginBottom: 8 },
  big: { fontSize: 42, fontWeight: '900', color: '#1D2B26' },
  button: { backgroundColor: '#1D2B26', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 18 },
  buttonText: { color: 'white', fontWeight: '900' },
  moods: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  mood: { flex: 1, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#CFC6B8', borderRadius: 15, padding: 16, alignItems: 'center' },
  selected: { backgroundColor: '#D8C6B8' },
  input: { minHeight: 150, backgroundColor: '#FFFCF6', borderRadius: 18, borderWidth: 1, borderColor: '#D8D0C3', padding: 16, textAlignVertical: 'top' },
  price: { fontSize: 20, fontWeight: '900', color: '#8C5D44', marginTop: 12 },
});
