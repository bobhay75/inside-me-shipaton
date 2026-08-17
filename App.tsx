import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Entry, Mood, ResetMode, ResponseChoice } from './src/types';
import { loadEntries, saveEntries } from './src/storage';
import { deleteCloudMemory, getMirrorPreview, getReflection, isCloudReflectionConfigured, type MirrorResult } from './src/services/reflection';
import { configureRevenueCat, purchasePro, type PremiumState } from './src/services/revenuecat';

type Screen = 'today' | 'mirror' | 'journal' | 'signals' | 'plus';
const modes: { id: ResetMode; icon: string; label: string; prompt: string }[] = [
  { id: 'message', icon: '↗', label: 'Before I send', prompt: 'Paste the message you are about to send.' },
  { id: 'conflict', icon: '⚡', label: 'After conflict', prompt: 'Write the uncensored version of what happened.' },
  { id: 'decision', icon: '◇', label: 'Hard decision', prompt: 'What choice is pulling you in two directions?' },
  { id: 'spiral', icon: '◎', label: 'Stop a spiral', prompt: 'Get the repeating thought out of your head.' },
];
const choices: { id: ResponseChoice; label: string; note: string }[] = [
  { id: 'pause', label: 'Pause', note: 'Trade speed for accuracy' },
  { id: 'talk', label: 'Talk', note: 'Create understanding' },
  { id: 'boundary', label: 'Boundary', note: 'Protect your energy' },
  { id: 'let-go', label: 'Let go', note: 'Stop feeding it' },
];
const moods: Mood[] = [1, 2, 3, 4, 5];

function streakOf(entries: Entry[]) {
  const days = Array.from(new Set(entries.map(e => e.createdAt.slice(0, 10)))).sort().reverse();
  if (!days.length) return 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  if ((today.getTime() - new Date(days[0] + 'T00:00:00').getTime()) / 86400000 > 1) return 0;
  let value = 1;
  for (let i = 1; i < days.length; i += 1) {
    if ((new Date(days[i - 1]).getTime() - new Date(days[i]).getTime()) / 86400000 !== 1) break;
    value += 1;
  }
  return value;
}

function Button({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable disabled={disabled} onPress={onPress} style={[s.primary, disabled && s.disabled]}><Text style={s.primaryText}>{title}</Text><Text style={s.arrow}>→</Text></Pressable>;
}
function Header({ kicker, title }: { kicker: string; title: string }) {
  return <><Text style={s.kicker}>{kicker}</Text><Text style={s.title}>{title}</Text></>;
}
function Meter({ label, value, color }: { label: string; value: number; color: string }) {
  return <View style={s.meter}><View style={s.between}><Text style={s.meterLabel}>{label}</Text><Text style={[s.meterValue, { color }]}>{value}</Text></View><View style={s.track}><View style={[s.fill, { width: (String(value) + '%') as any, backgroundColor: color }]} /></View></View>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [premium, setPremium] = useState<PremiumState>({ configured: false, isPro: false });
  const [cloud, setCloud] = useState(false);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState(0);
  const [mode, setMode] = useState<ResetMode>('message');
  const [mood, setMood] = useState<Mood>(3);
  const [text, setText] = useState('');
  const [intent, setIntent] = useState('');
  const [mirror, setMirror] = useState<MirrorResult | null>(null);
  const [better, setBetter] = useState('');
  const [seconds, setSeconds] = useState(30);
  const [breathing, setBreathing] = useState(false);
  const [mine, setMine] = useState('');
  const [theirs, setTheirs] = useState('');
  const [good, setGood] = useState(['', '', '']);
  const [choice, setChoice] = useState<ResponseChoice>('pause');
  const [next, setNext] = useState('');
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadEntries().then(setEntries); }, []);
  useEffect(() => { if (screen === 'plus') configureRevenueCat().then(setPremium); }, [screen]);
  useEffect(() => {
    if (!breathing) return;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(pulse, { toValue: 1, duration: 4000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(pulse, { toValue: 0, duration: 5000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ]));
    animation.start();
    const timer = setInterval(() => setSeconds(v => { if (v <= 1) { setBreathing(false); return 0; } return v - 1; }), 1000);
    return () => { clearInterval(timer); animation.stop(); };
  }, [breathing, pulse]);

  const streak = useMemo(() => streakOf(entries), [entries]);
  const week = useMemo(() => entries.filter(e => Date.now() - new Date(e.createdAt).getTime() < 604800000), [entries]);
  const heat = useMemo(() => {
    const list = week.filter(e => e.impactScore);
    return list.length ? Math.round(list.reduce((a, e) => a + (e.impactScore || 0), 0) / list.length) : 0;
  }, [week]);

  function begin(value: ResetMode) {
    setMode(value); setStep(0); setMood(3); setText(''); setIntent(''); setMirror(null); setBetter('');
    setSeconds(30); setBreathing(false); setMine(''); setTheirs(''); setGood(['', '', '']); setChoice('pause'); setNext(''); setScreen('mirror');
  }
  function cloudToggle() {
    if (cloud) return setCloud(false);
    if (!isCloudReflectionConfigured()) return Alert.alert('Private mode is active', 'This build has no cloud mirror configured. Me×2 still works completely on device.');
    Alert.alert('Use the sharper AI mirror?', 'Only the draft and intent you submit are sent. Your journal stays on this device.', [{ text: 'Stay private', style: 'cancel' }, { text: 'Use AI', onPress: () => setCloud(true) }]);
  }
  async function reveal() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try { const result = await getMirrorPreview({ text, intent, mood, mode }, cloud); setMirror(result); setBetter(result.meBetter); setStep(1); } finally { setBusy(false); }
  }
  async function finish() {
    if (!mirror || busy) return;
    setBusy(true);
    try {
      const result = await getReflection({ text, mood, involvesPerson: true, myPart: mine, theirSide: theirs, gratitudes: good, nextMove: next, responseChoice: choice }, cloud);
      const entry: Entry = { id: String(Date.now()), createdAt: new Date().toISOString(), mode, mood, text: text.trim(), intent: intent.trim(), howItMayLand: mirror.meX2, betterDraft: better.trim(), impactScore: mirror.impactScore, clarityScore: mirror.clarityScore, agencyScore: mirror.agencyScore, reflection: result.reflection, reflectionSource: result.source, involvesPerson: true, myPart: mine.trim(), theirSide: theirs.trim(), gratitudes: good.filter(Boolean), nextMove: next.trim(), responseChoice: choice };
      const all = [entry, ...entries]; setEntries(all); await saveEntries(all); setStep(5);
    } finally { setBusy(false); }
  }
  async function shareWin(entry?: Entry) {
    await Share.share({ title: 'My Me+U reset', message: 'I interrupted the reaction, checked how it might land, and chose ' + (entry?.responseChoice || choice) + '. Private details stayed private. #MeX2' });
  }
  function clearAll() {
    Alert.alert('Delete every private reset?', 'This cannot be undone.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Delete', style: 'destructive', onPress: async () => { setEntries([]); await saveEntries([]); await deleteCloudMemory(); } }]);
  }

  function Today() {
    const latest = entries[0];
    return <ScrollView contentContainerStyle={s.content}>
      <View style={s.between}><View><Text style={s.brand}>me<Text style={s.brandX}>×</Text>u</Text><Text style={s.kicker}>EMOTIONAL INTELLIGENCE, IN THE MOMENT</Text></View><View style={s.streak}><Text style={s.green}>◆</Text><Text style={s.streakText}>{streak}</Text></View></View>
      <View style={s.hero}><View style={s.glow} /><Text style={s.heroKicker}>THE 60-SECOND RELATIONSHIP RESET</Text><Text style={s.heroTitle}>Before you send it,<Text style={s.purple}> see the other side.</Text></Text><Text style={s.body}>Me×2 reveals what you mean, one way it may land, and a version that keeps your truth without making it worse.</Text><Button title="Mirror my message" onPress={() => begin('message')} /><Pressable onPress={cloudToggle}><Text style={s.privacy}>{cloud ? '✦ AI mirror on · tap for private mode' : '⌁ Private on-device mirror · tap for sharper AI'}</Text></Pressable></View>
      <Text style={s.section}>What do you need right now?</Text><View style={s.grid}>{modes.map(item => <Pressable key={item.id} style={s.mode} onPress={() => begin(item.id)}><Text style={s.modeIcon}>{item.icon}</Text><Text style={s.modeText}>{item.label}</Text><Text style={s.modeArrow}>→</Text></Pressable>)}</View>
      <View style={s.stats}><View><Text style={s.kicker}>THIS WEEK</Text><Text style={s.stat}>{week.length} resets</Text></View><View style={s.divider} /><View><Text style={s.kicker}>AVG. HEAT</Text><Text style={[s.stat, { color: heat > 65 ? '#FF78A3' : '#67E8C4' }]}>{heat || '—'}</Text></View></View>
      {latest ? <Pressable style={s.card} onPress={() => setScreen('journal')}><Text style={s.kicker}>LAST WIN</Text><Text style={s.cardTitle}>You chose {latest.responseChoice || 'a reset'} instead of autopilot.</Text><Text style={s.cardBody} numberOfLines={2}>{latest.betterDraft || latest.reflection}</Text></Pressable> : <View style={s.card}><Text style={s.cardTitle}>Your patterns start with one honest mirror.</Text><Text style={s.cardBody}>No public feed. No performance. Just a better next move.</Text></View>}
    </ScrollView>;
  }

  function Mirror() {
    const selected = modes.find(item => item.id === mode) || modes[0];
    if (step === 5) return <ScrollView contentContainerStyle={s.content}><Text style={s.kicker}>RESET COMPLETE</Text><Text style={s.done}>✓</Text><Text style={s.centerTitle}>You changed the next moment.</Text><Text style={s.centerBody}>You did not erase the truth. You chose how to carry it.</Text><View style={s.win}><Text style={s.kicker}>THE MOVE</Text><Text style={s.winChoice}>{choice}</Text><Text style={s.cardBody}>{next || better}</Text></View><Button title="Share the win, not the details" onPress={() => shareWin()} /><Pressable style={s.secondary} onPress={() => setScreen('today')}><Text style={s.secondaryText}>Back to today</Text></Pressable></ScrollView>;
    return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.between}><Pressable onPress={() => step ? setStep(step - 1) : setScreen('today')}><Text style={s.back}>←</Text></Pressable><Text style={s.step}>{step + 1} / 5</Text><Text style={s.modeTiny}>{selected.label}</Text></View><View style={s.progress}><View style={[s.progressFill, { width: (String((step + 1) * 20) + '%') as any }]} /></View>
      {step === 0 && <><Header kicker="NO FILTER. PRIVATE BY DEFAULT." title={selected.prompt} /><TextInput autoFocus multiline style={[s.input, s.large]} value={text} onChangeText={setText} placeholder="Put the raw version here…" placeholderTextColor="#625D70" /><Text style={s.label}>What do you actually want them to understand?</Text><TextInput style={s.input} value={intent} onChangeText={setIntent} placeholder="Under the anger, I need…" placeholderTextColor="#625D70" /><Text style={s.label}>How activated are you?</Text><View style={s.chips}>{moods.map(value => <Pressable key={value} style={[s.chip, mood === value && s.chipOn]} onPress={() => setMood(value)}><Text style={[s.chipText, mood === value && s.chipTextOn]}>{value}</Text></Pressable>)}</View><View style={s.signal}><Text style={s.signalIcon}>{text.length > 100 || mood < 3 ? '⚡' : '◌'}</Text><View style={s.flex}><Text style={s.signalTitle}>{text ? (mood < 3 ? 'High emotion detected' : 'Your signal is readable') : 'Your live signal appears here'}</Text><Text style={s.signalBody}>{text ? 'Me×2 will separate the need from the heat.' : 'Write freely. Nothing is posted or shared.'}</Text></View></View><Button title={busy ? 'Reading the signal…' : 'Reveal my Me×2'} disabled={!text.trim() || busy} onPress={reveal} /></>}
      {step === 1 && mirror && <><Header kicker="YOUR EMOTIONAL MIRROR" title="Same moment. Three views." /><View style={[s.mirrorCard, s.me]}><Text style={s.mirrorTag}>ME · WHAT I MEAN</Text><Text style={s.mirrorText}>{mirror.me}</Text></View><View style={[s.mirrorCard, s.mx]}><Text style={s.mirrorTag}>ME×2 · ONE WAY IT MAY LAND</Text><Text style={s.mirrorText}>{mirror.meX2}</Text></View><View style={[s.mirrorCard, s.better]}><Text style={s.mirrorTag}>ME BETTER · SAME TRUTH, MORE CONTROL</Text><Text style={s.mirrorText}>{mirror.meBetter}</Text></View><View style={s.score}><Text style={s.kicker}>IMPACT DIAL</Text><Meter label="Emotional heat" value={mirror.impactScore} color="#FF78A3" /><Meter label="Clarity" value={mirror.clarityScore} color="#67E8C4" /><Meter label="Agency" value={mirror.agencyScore} color="#91A8FF" />{!!mirror.heatWords.length && <Text style={s.heat}>Heat words: {mirror.heatWords.join(' · ')}</Text>}<Text style={s.cue}>{mirror.controlCue}</Text></View><Button title="Lower the heat" onPress={() => setStep(2)} /></>}
      {step === 2 && <><Header kicker="NERVOUS SYSTEM RESET" title="Do not solve it while flooded." /><View style={s.breathStage}><Animated.View style={[s.orb, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.72, 1.18] }) }] }]}><Text style={s.orbTime}>{seconds}s</Text><Text style={s.orbLabel}>{breathing ? 'breathe with this' : 'choose a reset'}</Text></Animated.View></View><View style={s.chips}>{[30, 60, 120].map(value => <Pressable key={value} style={[s.chip, seconds === value && s.chipOn]} onPress={() => { setSeconds(value); setBreathing(true); }}><Text style={[s.chipText, seconds === value && s.chipTextOn]}>{value}s</Text></Pressable>)}</View><Text style={s.centerBody}>Longer exhale. Drop your shoulders. Let the first reaction pass without obeying it.</Text><Button title="I have enough space" onPress={() => { setBreathing(false); setStep(3); }} /></>}
      {step === 3 && <><Header kicker="ALIGNMENT" title="What is yours to carry?" /><View style={s.lane}><Text style={s.laneTag}>ME</Text><TextInput multiline style={s.laneInput} value={mine} onChangeText={setMine} placeholder="The part I can own or control…" placeholderTextColor="#625D70" /></View><View style={s.lane}><Text style={[s.laneTag, s.green]}>U</Text><TextInput multiline style={s.laneInput} value={theirs} onChangeText={setTheirs} placeholder="One possible truth from their side…" placeholderTextColor="#625D70" /></View><Text style={s.label}>Three things still worth protecting</Text>{good.map((value, index) => <TextInput key={index} style={s.input} value={value} onChangeText={v => setGood(all => all.map((old, i) => i === index ? v : old))} placeholder={(index + 1) + '. A person, value, or small good thing'} placeholderTextColor="#625D70" />)}<Button title="Choose my next move" onPress={() => setStep(4)} /></>}
      {step === 4 && mirror && <><Header kicker="RESPONSE SIMULATOR" title="Pick the future you can live with." />{choices.map(item => <Pressable key={item.id} style={[s.response, choice === item.id && s.responseOn]} onPress={() => setChoice(item.id)}><View><Text style={s.responseTitle}>{item.label}</Text><Text style={s.responseNote}>{item.note}</Text></View><Text style={s.radio}>{choice === item.id ? '●' : '○'}</Text></Pressable>)}<View style={s.forecast}><Text style={s.kicker}>LIKELY EFFECT</Text><Text style={s.cardBody}>{choice === 'pause' ? 'Heat falls. You trade speed for accuracy.' : choice === 'talk' ? 'The truth is voiced with a chance of being heard.' : choice === 'boundary' ? 'Your limit becomes clear without demanding agreement.' : 'Your attention returns to what you can control.'}</Text></View><Text style={s.label}>Your Me Better version</Text><TextInput multiline style={[s.input, s.large]} value={better} onChangeText={setBetter} /><Text style={s.label}>One next action</Text><TextInput style={s.input} value={next} onChangeText={setNext} placeholder="I will…" placeholderTextColor="#625D70" /><Button title={busy ? 'Saving your shift…' : 'Lock in this response'} disabled={busy} onPress={finish} /></>}
    </ScrollView>;
  }

  function Journal() {
    return <ScrollView contentContainerStyle={s.content}><Header kicker="PRIVATE MEMORY" title="Your resets, not your failures." />{!entries.length && <View style={s.card}><Text style={s.cardTitle}>No entries yet.</Text><Text style={s.cardBody}>Your first Me×2 will build this timeline.</Text></View>}{entries.map(entry => <View key={entry.id} style={s.journal}><View style={s.between}><Text style={s.kicker}>{(entry.mode || 'reset').toUpperCase()} · {new Date(entry.createdAt).toLocaleDateString()}</Text><Text style={s.heatPill}>{entry.impactScore || '—'} heat</Text></View><Text style={s.journalLabel}>THE RAW MOMENT</Text><Text style={s.cardBody}>{entry.text}</Text>{entry.howItMayLand && <><Text style={s.journalLabel}>ONE WAY IT MAY HAVE LANDED</Text><Text style={s.cardBody}>{entry.howItMayLand}</Text></>}{entry.betterDraft && <><Text style={s.journalLabel}>THE VERSION YOU CHOSE</Text><Text style={s.betterText}>{entry.betterDraft}</Text></>}<View style={s.between}><Text style={s.badge}>{entry.responseChoice || 'reset'}</Text><Pressable onPress={() => shareWin(entry)}><Text style={s.share}>Share win ↗</Text></Pressable></View></View>)}{!!entries.length && <Pressable style={s.secondary} onPress={clearAll}><Text style={s.danger}>Delete private history</Text></Pressable>}</ScrollView>;
  }
  function Signals() {
    return <ScrollView contentContainerStyle={s.content}><Header kicker="PATTERN INTELLIGENCE" title="See what changes when you pause." /><View style={s.signalHero}><View><Text style={s.signalNumber}>{streak}</Text><Text style={s.kicker}>DAY STREAK</Text></View><View><Text style={s.signalNumber}>{entries.length}</Text><Text style={s.kicker}>MOMENTS INTERRUPTED</Text></View></View><View style={s.score}><Text style={s.cardTitle}>Your response signature</Text>{choices.map(item => { const count = entries.filter(e => e.responseChoice === item.id).length; return <View key={item.id} style={s.pattern}><Text style={s.patternLabel}>{item.label}</Text><View style={s.patternTrack}><View style={[s.patternFill, { width: (String(entries.length ? Math.max(5, count / entries.length * 100) : 0) + '%') as any }]} /></View><Text style={s.patternCount}>{count}</Text></View>; })}</View><View style={s.card}><Text style={s.kicker}>NEXT-GEN, NOT MIND READING</Text><Text style={s.cardTitle}>Your mirror is a hypothesis.</Text><Text style={s.cardBody}>Me×2 offers one plausible reception and gives control back to you. It never claims to know another person's mind.</Text></View></ScrollView>;
  }
  function Plus() {
    const features = ['Deep pattern maps across people + triggers', 'Custom paths for partner, family, and work', 'Voice delivery mirror and rehearsal', 'Encrypted coaching or therapy exports', 'Weekly relationship intelligence brief'];
    return <ScrollView contentContainerStyle={s.content}><Text style={s.plus}>ME+U PLUS</Text><Header kicker="PERSONAL OPERATING SYSTEM" title="Turn moments into lasting change." /><Text style={s.body}>The complete reset stays useful for everyone. Plus unlocks depth, customization, and long-range intelligence.</Text>{features.map(item => <View key={item} style={s.feature}><Text style={s.green}>✦</Text><Text style={s.featureText}>{item}</Text></View>)}<Button title={premium.isPro ? 'Plus is active' : premium.configured ? 'Unlock Plus' : 'Preview Plus'} onPress={async () => setPremium(await purchasePro())} /><Text style={s.privacy}>No ads. No public emotional feed. Your private life is not the product.</Text></ScrollView>;
  }

  const view = screen === 'today' ? <Today /> : screen === 'mirror' ? <Mirror /> : screen === 'journal' ? <Journal /> : screen === 'signals' ? <Signals /> : <Plus />;
  return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="light" /><View style={s.app}>{view}<View style={s.nav}><Pressable style={s.navItem} onPress={() => setScreen('today')}><Text style={[s.navIcon, screen === 'today' && s.navOn]}>◉</Text><Text style={[s.navLabel, screen === 'today' && s.navOn]}>Today</Text></Pressable><Pressable style={s.navItem} onPress={() => setScreen('journal')}><Text style={[s.navIcon, screen === 'journal' && s.navOn]}>▤</Text><Text style={[s.navLabel, screen === 'journal' && s.navOn]}>Journal</Text></Pressable><Pressable style={s.navCenter} onPress={() => begin('message')}><Text style={s.navCenterTop}>×2</Text><Text style={s.navCenterLabel}>MIRROR</Text></Pressable><Pressable style={s.navItem} onPress={() => setScreen('signals')}><Text style={[s.navIcon, screen === 'signals' && s.navOn]}>◒</Text><Text style={[s.navLabel, screen === 'signals' && s.navOn]}>Signals</Text></Pressable><Pressable style={s.navItem} onPress={() => setScreen('plus')}><Text style={[s.navIcon, screen === 'plus' && s.navOn]}>✦</Text><Text style={[s.navLabel, screen === 'plus' && s.navOn]}>Plus</Text></Pressable></View></View></SafeAreaView></SafeAreaProvider>;
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#090812' }, app: { flex: 1, backgroundColor: '#090812' }, content: { padding: 22, paddingBottom: 120 }, flex: { flex: 1 },
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, brand: { color: '#F8F5FF', fontSize: 31, fontWeight: '900', letterSpacing: -2 }, brandX: { color: '#A78BFA' },
  kicker: { color: '#7F788F', fontSize: 10, fontWeight: '900', letterSpacing: 1.3 }, streak: { flexDirection: 'row', gap: 7, alignItems: 'center', backgroundColor: '#171420', borderWidth: 1, borderColor: '#2A2539', borderRadius: 99, paddingHorizontal: 13, paddingVertical: 8 }, streakText: { color: '#FFF', fontWeight: '900' }, green: { color: '#67E8C4' },
  hero: { overflow: 'hidden', backgroundColor: '#151126', borderWidth: 1, borderColor: '#332A57', borderRadius: 28, padding: 22, marginTop: 25, marginBottom: 26 }, glow: { position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: '#51249C', opacity: 0.28, right: -80, top: -100 },
  heroKicker: { color: '#BEABFF', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, heroTitle: { color: '#F8F5FF', fontSize: 36, lineHeight: 41, fontWeight: '900', letterSpacing: -1.5, marginTop: 14 }, purple: { color: '#B9A3FF' }, body: { color: '#B4AEC2', fontSize: 16, lineHeight: 24, marginTop: 15, marginBottom: 5 },
  primary: { minHeight: 58, borderRadius: 18, backgroundColor: '#7C5CFC', paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16 }, primaryText: { color: '#FFF', fontSize: 16, fontWeight: '900' }, arrow: { color: '#FFF', fontSize: 22 }, disabled: { opacity: 0.4 }, privacy: { color: '#817A91', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 13 },
  section: { color: '#F1EDF8', fontSize: 18, fontWeight: '800', marginBottom: 13 }, grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, mode: { width: '48%', minHeight: 110, borderRadius: 20, padding: 15, backgroundColor: '#13111C', borderWidth: 1, borderColor: '#282333' }, modeIcon: { color: '#A78BFA', fontSize: 22 }, modeText: { color: '#EDE9F7', fontSize: 15, fontWeight: '800', marginTop: 14 }, modeArrow: { position: 'absolute', right: 14, bottom: 12, color: '#6F687A' },
  stats: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around', backgroundColor: '#111019', borderRadius: 20, borderWidth: 1, borderColor: '#24202E', padding: 18, marginTop: 18 }, divider: { height: 40, width: 1, backgroundColor: '#2C2736' }, stat: { color: '#F6F2FF', fontSize: 20, fontWeight: '900', marginTop: 4 },
  card: { backgroundColor: '#13111C', borderRadius: 20, borderWidth: 1, borderColor: '#292438', padding: 18, marginTop: 18 }, cardTitle: { color: '#F3EFFA', fontSize: 18, lineHeight: 24, fontWeight: '800', marginTop: 8 }, cardBody: { color: '#AAA4B9', fontSize: 14, lineHeight: 21, marginTop: 8 },
  title: { color: '#F6F2FF', fontSize: 32, lineHeight: 37, fontWeight: '900', letterSpacing: -1, marginTop: 10, marginBottom: 20 }, back: { color: '#FFF', fontSize: 26, width: 50 }, step: { color: '#817A92', fontWeight: '800' }, modeTiny: { color: '#B9A3FF', fontSize: 11, fontWeight: '800', width: 90, textAlign: 'right' }, progress: { height: 3, backgroundColor: '#211D2B', marginTop: 15, marginBottom: 30 }, progressFill: { height: 3, backgroundColor: '#8B6DFF' },
  label: { color: '#C9C3D6', fontSize: 13, fontWeight: '800', marginTop: 18, marginBottom: 8 }, input: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: '#2B2637', backgroundColor: '#121019', color: '#F4F0FA', fontSize: 15, paddingHorizontal: 15, paddingVertical: 14, marginBottom: 9 }, large: { minHeight: 138, textAlignVertical: 'top' },
  chips: { flexDirection: 'row', gap: 8 }, chip: { flex: 1, minHeight: 42, borderRadius: 13, backgroundColor: '#15121E', borderWidth: 1, borderColor: '#2B2637', alignItems: 'center', justifyContent: 'center' }, chipOn: { backgroundColor: '#282044', borderColor: '#8B6DFF' }, chipText: { color: '#8D879C', fontSize: 12, fontWeight: '800' }, chipTextOn: { color: '#D9CCFF' },
  signal: { flexDirection: 'row', gap: 12, backgroundColor: '#10141A', borderColor: '#243B3A', borderWidth: 1, borderRadius: 17, padding: 15, marginTop: 17 }, signalIcon: { color: '#67E8C4', fontSize: 20 }, signalTitle: { color: '#DDFCF3', fontSize: 14, fontWeight: '800' }, signalBody: { color: '#82958F', fontSize: 12, lineHeight: 18, marginTop: 3 },
  mirrorCard: { borderRadius: 20, padding: 18, marginBottom: 11, borderWidth: 1 }, me: { backgroundColor: '#15121F', borderColor: '#302A3A' }, mx: { backgroundColor: '#1A1221', borderColor: '#54294B' }, better: { backgroundColor: '#101C1A', borderColor: '#285048' }, mirrorTag: { color: '#9E94B5', fontSize: 10, fontWeight: '900', letterSpacing: 1.1 }, mirrorText: { color: '#F0EBF7', fontSize: 16, lineHeight: 24, marginTop: 9, fontWeight: '600' },
  score: { backgroundColor: '#111019', borderWidth: 1, borderColor: '#292438', borderRadius: 20, padding: 18, marginTop: 8 }, meter: { marginTop: 14 }, meterLabel: { color: '#B1AABD', fontSize: 12, fontWeight: '700' }, meterValue: { fontWeight: '900' }, track: { height: 6, borderRadius: 5, backgroundColor: '#282331', marginTop: 8, overflow: 'hidden' }, fill: { height: 6, borderRadius: 5 }, heat: { color: '#FF91B2', fontSize: 12, marginTop: 16 }, cue: { color: '#CBC3D8', fontSize: 13, lineHeight: 20, marginTop: 10 },
  breathStage: { height: 300, alignItems: 'center', justifyContent: 'center' }, orb: { width: 185, height: 185, borderRadius: 93, backgroundColor: '#392B75', borderWidth: 2, borderColor: '#987CFF', alignItems: 'center', justifyContent: 'center', shadowColor: '#8B6DFF', shadowOpacity: 0.7, shadowRadius: 35 }, orbTime: { color: '#FFF', fontSize: 38, fontWeight: '900' }, orbLabel: { color: '#C9BAFF', fontSize: 11, fontWeight: '800' }, centerTitle: { color: '#F6F2FF', fontSize: 32, lineHeight: 38, fontWeight: '900', textAlign: 'center', marginTop: 12 }, centerBody: { color: '#A9A3B7', fontSize: 15, lineHeight: 23, textAlign: 'center', marginTop: 10, marginBottom: 12 },
  lane: { flexDirection: 'row', backgroundColor: '#121019', borderWidth: 1, borderColor: '#2A2535', borderRadius: 18, padding: 15, marginBottom: 11 }, laneTag: { color: '#B9A3FF', fontWeight: '900', width: 42, paddingTop: 3 }, laneInput: { color: '#F1EDF7', fontSize: 15, lineHeight: 22, minHeight: 70, flex: 1, textAlignVertical: 'top' },
  response: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', borderRadius: 17, borderWidth: 1, borderColor: '#2A2535', backgroundColor: '#121019', padding: 16, marginBottom: 9 }, responseOn: { borderColor: '#8B6DFF', backgroundColor: '#211A38' }, responseTitle: { color: '#F4F0FA', fontSize: 16, fontWeight: '900' }, responseNote: { color: '#857E94', fontSize: 12, marginTop: 4 }, radio: { color: '#A78BFA', fontSize: 20 }, forecast: { backgroundColor: '#111A1A', borderWidth: 1, borderColor: '#25413C', borderRadius: 17, padding: 16, marginTop: 8 },
  done: { color: '#67E8C4', fontSize: 66, fontWeight: '900', textAlign: 'center', marginTop: 42 }, win: { backgroundColor: '#151126', borderWidth: 1, borderColor: '#392D64', borderRadius: 22, padding: 20, marginTop: 24 }, winChoice: { color: '#B9A3FF', fontSize: 30, fontWeight: '900', textTransform: 'capitalize', marginTop: 5 }, secondary: { minHeight: 54, alignItems: 'center', justifyContent: 'center', marginTop: 8 }, secondaryText: { color: '#A49DAC', fontWeight: '800' }, danger: { color: '#C7607C', fontWeight: '700' },
  journal: { backgroundColor: '#121019', borderRadius: 21, borderWidth: 1, borderColor: '#292438', padding: 18, marginBottom: 14 }, heatPill: { color: '#FF91B2', fontSize: 11, fontWeight: '900', backgroundColor: '#2A1621', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 99 }, journalLabel: { color: '#706A80', fontSize: 9, fontWeight: '900', letterSpacing: 1.1, marginTop: 17 }, betterText: { color: '#CFFCEF', fontSize: 15, lineHeight: 22, marginTop: 7 }, badge: { color: '#C9BAFF', fontSize: 12, fontWeight: '900', textTransform: 'uppercase', marginTop: 18 }, share: { color: '#8FA8FF', fontSize: 12, fontWeight: '800', marginTop: 18 },
  signalHero: { flexDirection: 'row', justifyContent: 'space-around', backgroundColor: '#151126', borderRadius: 22, borderWidth: 1, borderColor: '#332A54', padding: 24 }, signalNumber: { color: '#C5B5FF', fontSize: 40, fontWeight: '900' }, pattern: { flexDirection: 'row', alignItems: 'center', marginTop: 18 }, patternLabel: { color: '#B9B2C5', width: 76, fontSize: 12, fontWeight: '800' }, patternTrack: { flex: 1, height: 7, backgroundColor: '#282331', borderRadius: 4, overflow: 'hidden' }, patternFill: { height: 7, backgroundColor: '#8B6DFF' }, patternCount: { color: '#F3EFFA', width: 30, textAlign: 'right', fontWeight: '900' },
  plus: { alignSelf: 'flex-start', color: '#DCCFFF', backgroundColor: '#2A2050', borderRadius: 99, paddingHorizontal: 12, paddingVertical: 7, fontSize: 10, fontWeight: '900', letterSpacing: 1.2, marginBottom: 15 }, feature: { flexDirection: 'row', gap: 14, alignItems: 'center', backgroundColor: '#121019', borderWidth: 1, borderColor: '#292438', borderRadius: 17, padding: 16, marginBottom: 9 }, featureText: { color: '#E8E3EF', fontSize: 14, fontWeight: '700', flex: 1 },
  nav: { position: 'absolute', left: 12, right: 12, bottom: 10, height: 76, borderRadius: 25, borderWidth: 1, borderColor: '#2B2637', backgroundColor: '#111019F5', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' }, navItem: { alignItems: 'center', width: 55 }, navIcon: { color: '#6F697D', fontSize: 19 }, navLabel: { color: '#6F697D', fontSize: 9, fontWeight: '800', marginTop: 4 }, navOn: { color: '#C5B5FF' }, navCenter: { width: 68, height: 68, borderRadius: 22, marginTop: -29, backgroundColor: '#7C5CFC', borderWidth: 4, borderColor: '#090812', alignItems: 'center', justifyContent: 'center' }, navCenterTop: { color: '#FFF', fontSize: 21, fontWeight: '900' }, navCenterLabel: { color: '#E9E1FF', fontSize: 7, fontWeight: '900' },
});
