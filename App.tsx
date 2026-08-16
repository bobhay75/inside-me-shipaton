import React, { useEffect, useMemo, useState } from 'react';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import type { Entry, Mood, ResponseChoice } from './src/types';
import { loadEntries, saveEntries } from './src/storage';
import { getReflection } from './src/services/reflection';
import { configureRevenueCat, purchasePro, type PremiumState } from './src/services/revenuecat';

type Screen = 'today' | 'reset' | 'journal' | 'insights' | 'plus';
type ResetStep = 0 | 1 | 2 | 3 | 4;

const responseChoices: { id: ResponseChoice; label: string; help: string }[] = [
  { id: 'pause', label: 'Pause', help: 'Give it time before acting.' },
  { id: 'talk', label: 'Talk', help: 'Say what matters without attacking.' },
  { id: 'boundary', label: 'Boundary', help: 'Be clear about what you will do.' },
  { id: 'let-go', label: 'Let go', help: 'Stop feeding what you cannot control.' },
];

const moodLabels: Record<Mood, string> = {
  1: 'rough',
  2: 'low',
  3: 'mixed',
  4: 'okay',
  5: 'steady',
};

function formatClock(total: number) {
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

function formatDate(value: string) {
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('today');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [premium, setPremium] = useState<PremiumState>({ configured: false, isPro: false });
  const [lastReflection, setLastReflection] = useState('');
  const [busy, setBusy] = useState(false);

  const [step, setStep] = useState<ResetStep>(0);
  const [mood, setMood] = useState<Mood>(3);
  const [text, setText] = useState('');
  const [involvesPerson, setInvolvesPerson] = useState(true);
  const [myPart, setMyPart] = useState('');
  const [theirSide, setTheirSide] = useState('');
  const [gratitudes, setGratitudes] = useState(['', '', '']);
  const [nextMove, setNextMove] = useState('');
  const [responseChoice, setResponseChoice] = useState<ResponseChoice>('pause');
  const [breathing, setBreathing] = useState(false);
  const [breathSeconds, setBreathSeconds] = useState(300);

  useEffect(() => {
    loadEntries().then(setEntries);
  }, []);

  useEffect(() => {
    if (screen === 'plus') configureRevenueCat().then(setPremium);
  }, [screen]);

  useEffect(() => {
    if (!breathing) return;
    const timer = setInterval(() => {
      setBreathSeconds(value => {
        if (value <= 1) {
          setBreathing(false);
          return 0;
        }
        return value - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [breathing]);

  const averageMood = useMemo(() => {
    if (!entries.length) return null;
    return entries.reduce((sum, item) => sum + item.mood, 0) / entries.length;
  }, [entries]);

  const responseCounts = useMemo(() => {
    return responseChoices.map(choice => ({
      ...choice,
      count: entries.filter(entry => entry.responseChoice === choice.id).length,
    }));
  }, [entries]);

  function resetForm() {
    setStep(0);
    setMood(3);
    setText('');
    setInvolvesPerson(true);
    setMyPart('');
    setTheirSide('');
    setGratitudes(['', '', '']);
    setNextMove('');
    setResponseChoice('pause');
    setBreathing(false);
    setBreathSeconds(300);
  }

  function beginReset() {
    resetForm();
    setScreen('reset');
  }

  function updateGratitude(index: number, value: string) {
    setGratitudes(current => current.map((item, itemIndex) => (itemIndex === index ? value : item)));
  }

  async function saveReset() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const result = await getReflection({
        text,
        mood,
        involvesPerson,
        myPart,
        theirSide,
        gratitudes,
        nextMove,
        responseChoice,
      });

      const nextEntry: Entry = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        mood,
        text: text.trim(),
        reflection: result.reflection,
        involvesPerson,
        myPart: myPart.trim(),
        theirSide: theirSide.trim(),
        gratitudes: gratitudes.map(item => item.trim()).filter(Boolean),
        nextMove: nextMove.trim(),
        responseChoice,
      };

      const next = [nextEntry, ...entries];
      setEntries(next);
      await saveEntries(next);
      setLastReflection(result.reflection);
      resetForm();
      setScreen('today');
    } finally {
      setBusy(false);
    }
  }

  async function activatePlus() {
    const nextState = await purchasePro();
    setPremium(nextState);
  }

  async function exportJournal() {
    const message = entries.length
      ? entries
          .map(entry => {
            const lines = [
              `ME+U — ${formatDate(entry.createdAt)}`,
              `Mood: ${entry.mood}/5 (${moodLabels[entry.mood]})`,
              `What happened: ${entry.text || 'No note added.'}`,
              entry.myPart ? `What was mine: ${entry.myPart}` : '',
              entry.theirSide ? `Other perspective: ${entry.theirSide}` : '',
              entry.gratitudes?.length ? `Good / grateful: ${entry.gratitudes.join(' | ')}` : '',
              entry.responseChoice ? `Chosen response: ${entry.responseChoice}` : '',
              entry.nextMove ? `Next move: ${entry.nextMove}` : '',
              `Reflection: ${entry.reflection}`,
            ];
            return lines.filter(Boolean).join('\n');
          })
          .join('\n\n----------------\n\n')
      : 'No Me+U entries yet.';

    await Share.share({ title: 'Me+U journal export', message });
  }

  const progress = `${step + 1}/5`;

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar style="dark" />
      <View style={s.header}>
        <View>
          <Text style={s.brand}>Me+U</Text>
          <Text style={s.sub}>You for you. Me for me.</Text>
        </View>
        <Text style={s.pill}>PRIVATE</Text>
      </View>

      <View style={s.nav}>
        {(['today', 'reset', 'journal', 'insights', 'plus'] as Screen[]).map(item => (
          <Pressable key={item} onPress={() => (item === 'reset' ? beginReset() : setScreen(item))}>
            <Text style={screen === item ? s.active : s.link}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {screen === 'today' && (
          <>
            <Text style={s.kicker}>CHECK YOURSELF BEFORE THE MOMENT CHOOSES FOR YOU</Text>
            <Text style={s.title}>Feel it. Sort it. Choose what happens next.</Text>
            <Text style={s.body}>
              Me+U gives you a private place to vent first, slow the reaction down, separate what is yours from what belongs to someone else, and choose a healthier next move.
            </Text>

            <View style={s.heroCard}>
              <Text style={s.quote}>“I can work on me. You can work on you.”</Text>
              <Text style={s.cardBody}>The goal is not to suppress emotion. It is to keep emotion from driving the car.</Text>
            </View>

            <Pressable style={s.button} onPress={beginReset}>
              <Text style={s.buttonText}>Start a Me+U reset</Text>
            </Pressable>

            {!!lastReflection && (
              <View style={s.card}>
                <Text style={s.cardTitle}>Your last reflection</Text>
                <Text style={s.body}>{lastReflection}</Text>
              </View>
            )}

            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.big}>{entries.length}</Text>
                <Text style={s.small}>resets saved</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.big}>{averageMood === null ? '—' : averageMood.toFixed(1)}</Text>
                <Text style={s.small}>average mood</Text>
              </View>
            </View>

            <Text style={s.safety}>
              Me+U is a reflection and communication tool, not medical or emergency care. If there is an immediate risk of harm, get local emergency help or bring a trusted person physically near you.
            </Text>
          </>
        )}

        {screen === 'reset' && (
          <>
            <View style={s.stepHeader}>
              <Text style={s.kicker}>ME+U RESET</Text>
              <Text style={s.progress}>{progress}</Text>
            </View>

            {step === 0 && (
              <>
                <Text style={s.title}>First, put down what happened.</Text>
                <Text style={s.body}>No polishing. No courtroom argument. Just name the moment as you experienced it.</Text>
                <Text style={s.label}>How are you right now?</Text>
                <View style={s.moods}>
                  {([1, 2, 3, 4, 5] as Mood[]).map(value => (
                    <Pressable
                      key={value}
                      onPress={() => setMood(value)}
                      style={[s.mood, mood === value && s.selected]}
                    >
                      <Text style={s.moodNumber}>{value}</Text>
                      <Text style={s.moodLabel}>{moodLabels[value]}</Text>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  style={s.input}
                  multiline
                  value={text}
                  onChangeText={setText}
                  placeholder="What happened? What are you angry, hurt, afraid, embarrassed, or stuck on?"
                  placeholderTextColor="#8A8378"
                />
                <View style={s.toggleRow}>
                  <Text style={s.labelInline}>Does this involve another person?</Text>
                  <Pressable style={[s.smallChoice, involvesPerson && s.selected]} onPress={() => setInvolvesPerson(true)}>
                    <Text>Yes</Text>
                  </Pressable>
                  <Pressable style={[s.smallChoice, !involvesPerson && s.selected]} onPress={() => setInvolvesPerson(false)}>
                    <Text>No</Text>
                  </Pressable>
                </View>
                <Pressable
                  disabled={!text.trim()}
                  style={[s.button, !text.trim() && s.disabled]}
                  onPress={() => setStep(1)}
                >
                  <Text style={s.buttonText}>I got it out</Text>
                </Pressable>
              </>
            )}

            {step === 1 && (
              <>
                <Text style={s.title}>Now interrupt the reaction.</Text>
                <Text style={s.body}>
                  Five minutes is long enough for the body to stop treating every thought like an emergency. Breathe slowly. You can continue sooner if you are already steady.
                </Text>
                <View style={s.breatheCard}>
                  <Text style={s.breatheWord}>{breathing ? 'BREATHE' : breathSeconds === 0 ? 'RESET' : 'PAUSE'}</Text>
                  <Text style={s.timer}>{formatClock(breathSeconds)}</Text>
                  <Text style={s.small}>Inhale gently. Exhale longer than you inhale.</Text>
                  <Pressable
                    style={s.secondaryButton}
                    onPress={() => {
                      if (breathSeconds === 0) setBreathSeconds(300);
                      setBreathing(value => !value);
                    }}
                  >
                    <Text style={s.secondaryButtonText}>{breathing ? 'Pause timer' : breathSeconds === 0 ? 'Reset timer' : 'Start 5-minute reset'}</Text>
                  </Pressable>
                </View>
                <Pressable style={s.button} onPress={() => setStep(2)}>
                  <Text style={s.buttonText}>I’m ready to sort it</Text>
                </Pressable>
              </>
            )}

            {step === 2 && (
              <>
                <Text style={s.title}>Me for me. U for you.</Text>
                <Text style={s.body}>
                  You can own your choices, words, expectations, and boundaries. You cannot control another person into becoming who you need them to be.
                </Text>
                <Text style={s.label}>What part is actually yours to own or change?</Text>
                <TextInput
                  style={s.inputShort}
                  multiline
                  value={myPart}
                  onChangeText={setMyPart}
                  placeholder="My reaction, my tone, what I assumed, what I need to say, what boundary I can set..."
                  placeholderTextColor="#8A8378"
                />
                {involvesPerson && (
                  <>
                    <Text style={s.label}>What might be true from their side, even if you disagree?</Text>
                    <TextInput
                      style={s.inputShort}
                      multiline
                      value={theirSide}
                      onChangeText={setTheirSide}
                      placeholder="They may be scared, stressed, protecting themselves, missing information, or seeing this differently..."
                      placeholderTextColor="#8A8378"
                    />
                  </>
                )}
                <Pressable style={s.button} onPress={() => setStep(3)}>
                  <Text style={s.buttonText}>Continue</Text>
                </Pressable>
              </>
            )}

            {step === 3 && (
              <>
                <Text style={s.title}>{involvesPerson ? 'Find three good things before you judge the whole person.' : 'Find three things that are still good.'}</Text>
                <Text style={s.body}>
                  This does not excuse bad behavior. It keeps one painful moment from becoming the only thing your mind can see.
                </Text>
                {gratitudes.map((item, index) => (
                  <TextInput
                    key={index}
                    style={s.lineInput}
                    value={item}
                    onChangeText={value => updateGratitude(index, value)}
                    placeholder={involvesPerson ? `Good thing ${index + 1} about them` : `Gratitude ${index + 1}`}
                    placeholderTextColor="#8A8378"
                  />
                ))}
                <Text style={s.humor}>If you are completely stuck, start tiny. “They’re a good swimmer” still breaks the all-bad story.</Text>
                <Pressable style={s.button} onPress={() => setStep(4)}>
                  <Text style={s.buttonText}>Choose my next move</Text>
                </Pressable>
              </>
            )}

            {step === 4 && (
              <>
                <Text style={s.title}>What response would future-you respect?</Text>
                <Text style={s.body}>Choose a direction, then write one concrete next move. Keep it about what you will do.</Text>
                {responseChoices.map(choice => (
                  <Pressable
                    key={choice.id}
                    style={[s.choiceCard, responseChoice === choice.id && s.choiceSelected]}
                    onPress={() => setResponseChoice(choice.id)}
                  >
                    <Text style={s.cardTitle}>{choice.label}</Text>
                    <Text style={s.small}>{choice.help}</Text>
                  </Pressable>
                ))}
                <Text style={s.label}>My next healthy move</Text>
                <TextInput
                  style={s.inputShort}
                  multiline
                  value={nextMove}
                  onChangeText={setNextMove}
                  placeholder="Example: I’ll wait until this evening, then say what bothered me without accusing them."
                  placeholderTextColor="#8A8378"
                />
                <Pressable style={[s.button, busy && s.disabled]} disabled={busy} onPress={saveReset}>
                  <Text style={s.buttonText}>{busy ? 'Reflecting…' : 'Save and reflect'}</Text>
                </Pressable>
              </>
            )}

            {step > 0 && (
              <Pressable style={s.backButton} onPress={() => setStep((step - 1) as ResetStep)}>
                <Text style={s.backText}>Back</Text>
              </Pressable>
            )}
          </>
        )}

        {screen === 'journal' && (
          <>
            <Text style={s.kicker}>JOURNAL</Text>
            <Text style={s.title}>What you noticed before you reacted.</Text>
            {!entries.length && <Text style={s.body}>No resets saved yet.</Text>}
            {entries.map(entry => (
              <View key={entry.id} style={s.card}>
                <View style={s.entryHeader}>
                  <Text style={s.cardTitle}>Mood {entry.mood}/5</Text>
                  <Text style={s.small}>{formatDate(entry.createdAt)}</Text>
                </View>
                <Text style={s.body}>{entry.text || 'No note added.'}</Text>
                {!!entry.myPart && <Text style={s.detail}><Text style={s.bold}>Mine: </Text>{entry.myPart}</Text>}
                {!!entry.theirSide && <Text style={s.detail}><Text style={s.bold}>Their possible side: </Text>{entry.theirSide}</Text>}
                {!!entry.gratitudes?.length && <Text style={s.detail}><Text style={s.bold}>Good / grateful: </Text>{entry.gratitudes.join(' · ')}</Text>}
                {!!entry.nextMove && <Text style={s.detail}><Text style={s.bold}>Next move: </Text>{entry.nextMove}</Text>}
                <View style={s.reflectionBox}>
                  <Text style={s.cardTitle}>Me+U reflection</Text>
                  <Text style={s.body}>{entry.reflection}</Text>
                </View>
              </View>
            ))}
          </>
        )}

        {screen === 'insights' && (
          <>
            <Text style={s.kicker}>INSIGHTS</Text>
            <Text style={s.title}>Patterns are clues, not verdicts.</Text>
            <Text style={s.body}>Use the numbers to notice habits. Use the journal to understand the context.</Text>
            <View style={s.statsRow}>
              <View style={s.statCard}>
                <Text style={s.big}>{entries.length}</Text>
                <Text style={s.small}>total resets</Text>
              </View>
              <View style={s.statCard}>
                <Text style={s.big}>{averageMood === null ? '—' : averageMood.toFixed(1)}</Text>
                <Text style={s.small}>average mood</Text>
              </View>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Chosen responses</Text>
              {responseCounts.map(choice => (
                <Text key={choice.id} style={s.detail}>{choice.label}: {choice.count}</Text>
              ))}
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Mood distribution</Text>
              {([1, 2, 3, 4, 5] as Mood[]).map(value => {
                const count = entries.filter(entry => entry.mood === value).length;
                return <Text key={value} style={s.detail}>{value}/5 {moodLabels[value]}: {count}</Text>;
              })}
            </View>
          </>
        )}

        {screen === 'plus' && (
          <>
            <Text style={s.kicker}>ME+U PLUS</Text>
            <Text style={s.title}>Keep the core useful. Charge for depth.</Text>
            <View style={s.card}>
              <Text style={s.cardTitle}>Free</Text>
              <Text style={s.detail}>Guided resets</Text>
              <Text style={s.detail}>Private on-device journal</Text>
              <Text style={s.detail}>Basic reflections and pattern counts</Text>
            </View>
            <View style={s.card}>
              <Text style={s.cardTitle}>Plus</Text>
              <Text style={s.detail}>Personal journal export</Text>
              <Text style={s.detail}>Future deeper pattern summaries</Text>
              <Text style={s.detail}>Future custom reflection paths</Text>
              <Text style={s.price}>{premium.isPro ? 'Plus active' : premium.priceText ?? 'Offering not connected yet'}</Text>
              {!!premium.message && <Text style={s.small}>{premium.message}</Text>}
              {!premium.isPro && premium.configured && (
                <Pressable style={s.button} onPress={activatePlus}>
                  <Text style={s.buttonText}>Unlock Plus</Text>
                </Pressable>
              )}
              {premium.isPro && (
                <Pressable style={s.button} onPress={exportJournal}>
                  <Text style={s.buttonText}>Export my journal</Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#F4F0E8' },
  header: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  brand: { fontSize: 30, fontWeight: '900', color: '#1D2B26' },
  sub: { color: '#675F56', fontSize: 12, fontWeight: '600' },
  pill: { fontSize: 10, fontWeight: '900', borderWidth: 1, borderColor: '#1D2B26', borderRadius: 20, paddingHorizontal: 9, paddingVertical: 7, color: '#1D2B26' },
  nav: { flexDirection: 'row', justifyContent: 'space-around', paddingHorizontal: 8, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: '#E1D8CA' },
  link: { color: '#675F56', textTransform: 'capitalize', fontSize: 12 },
  active: { color: '#1D2B26', fontWeight: '900', textTransform: 'capitalize', fontSize: 12 },
  content: { padding: 20, paddingBottom: 80 },
  kicker: { color: '#8C5D44', fontWeight: '900', letterSpacing: 1.5, fontSize: 11, lineHeight: 16 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '900', color: '#1D2B26', marginVertical: 12 },
  body: { fontSize: 16, lineHeight: 23, color: '#3D403A' },
  cardBody: { fontSize: 15, lineHeight: 22, color: '#3D403A', marginTop: 8 },
  heroCard: { backgroundColor: '#DDE8E0', borderRadius: 22, padding: 20, marginTop: 22 },
  quote: { fontSize: 20, lineHeight: 27, fontWeight: '900', color: '#1D2B26' },
  card: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E3DCCF', borderRadius: 18, padding: 18, marginTop: 16 },
  cardTitle: { fontWeight: '900', color: '#1D2B26', marginBottom: 6, fontSize: 16 },
  big: { fontSize: 38, fontWeight: '900', color: '#1D2B26' },
  small: { color: '#675F56', fontSize: 12, lineHeight: 18 },
  safety: { color: '#675F56', fontSize: 11, lineHeight: 17, marginTop: 24 },
  button: { backgroundColor: '#1D2B26', borderRadius: 16, padding: 16, alignItems: 'center', marginTop: 18 },
  buttonText: { color: 'white', fontWeight: '900' },
  secondaryButton: { borderWidth: 1, borderColor: '#1D2B26', borderRadius: 14, padding: 13, alignItems: 'center', marginTop: 16 },
  secondaryButtonText: { color: '#1D2B26', fontWeight: '900' },
  disabled: { opacity: 0.4 },
  backButton: { alignItems: 'center', padding: 14, marginTop: 6 },
  backText: { color: '#675F56', fontWeight: '800' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: { color: '#675F56', fontWeight: '900' },
  label: { fontSize: 13, fontWeight: '900', color: '#1D2B26', marginTop: 22, marginBottom: 9 },
  labelInline: { flex: 1, fontSize: 13, fontWeight: '900', color: '#1D2B26' },
  moods: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  mood: { flex: 1, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#CFC6B8', borderRadius: 14, paddingVertical: 12, alignItems: 'center' },
  selected: { backgroundColor: '#D8C6B8', borderColor: '#8C5D44' },
  moodNumber: { fontWeight: '900', color: '#1D2B26' },
  moodLabel: { fontSize: 9, color: '#675F56', marginTop: 3 },
  input: { minHeight: 150, backgroundColor: '#FFFCF6', borderRadius: 18, borderWidth: 1, borderColor: '#D8D0C3', padding: 16, textAlignVertical: 'top', fontSize: 16, color: '#1D2B26' },
  inputShort: { minHeight: 105, backgroundColor: '#FFFCF6', borderRadius: 18, borderWidth: 1, borderColor: '#D8D0C3', padding: 16, textAlignVertical: 'top', fontSize: 15, color: '#1D2B26' },
  lineInput: { backgroundColor: '#FFFCF6', borderRadius: 14, borderWidth: 1, borderColor: '#D8D0C3', padding: 15, fontSize: 15, color: '#1D2B26', marginTop: 12 },
  toggleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 16 },
  smallChoice: { borderWidth: 1, borderColor: '#CFC6B8', borderRadius: 12, paddingHorizontal: 13, paddingVertical: 9, backgroundColor: '#FFFCF6' },
  breatheCard: { backgroundColor: '#DDE8E0', borderRadius: 24, padding: 24, marginTop: 22, alignItems: 'center' },
  breatheWord: { fontWeight: '900', letterSpacing: 3, color: '#1D2B26' },
  timer: { fontSize: 54, fontWeight: '900', color: '#1D2B26', marginVertical: 12 },
  humor: { fontSize: 12, lineHeight: 18, color: '#675F56', fontStyle: 'italic', marginTop: 14 },
  choiceCard: { backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E3DCCF', borderRadius: 16, padding: 15, marginTop: 10 },
  choiceSelected: { borderColor: '#8C5D44', backgroundColor: '#EADDD3' },
  reflectionBox: { borderTopWidth: 1, borderTopColor: '#E3DCCF', marginTop: 14, paddingTop: 14 },
  detail: { fontSize: 14, lineHeight: 21, color: '#3D403A', marginTop: 6 },
  bold: { fontWeight: '900', color: '#1D2B26' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statsRow: { flexDirection: 'row', gap: 12, marginTop: 16 },
  statCard: { flex: 1, backgroundColor: '#FFFCF6', borderWidth: 1, borderColor: '#E3DCCF', borderRadius: 18, padding: 16 },
  price: { fontSize: 20, fontWeight: '900', color: '#8C5D44', marginTop: 12 },
});
