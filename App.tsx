import React, { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Entry, Mood, ResponseChoice } from './src/types';
import { loadEntries, saveEntries } from './src/storage';
import {
  deleteCloudMemory,
  getReflection,
  isCloudReflectionConfigured,
} from './src/services/reflection';
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

const navItems: { id: Screen; label: string; icon: string }[] = [
  { id: 'today', label: 'Today', icon: '◉' },
  { id: 'reset', label: 'Reset', icon: '✦' },
  { id: 'journal', label: 'Journal', icon: '▤' },
  { id: 'insights', label: 'Insights', icon: '◒' },
  { id: 'plus', label: 'Plus', icon: '+' },
];

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
  const [lastReflectionSource, setLastReflectionSource] = useState<'local' | 'cloud'>('local');
  const [cloudEnabled, setCloudEnabled] = useState(false);
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
    loadEntries().then(savedEntries => {
      setEntries(savedEntries);
      const latest = savedEntries[0];
      if (latest?.reflection) {
        setLastReflection(latest.reflection);
        setLastReflectionSource(latest.reflectionSource ?? 'local');
      }
    });
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

  function enableCloudAI() {
    if (!isCloudReflectionConfigured()) {
      Alert.alert(
        'Cloud AI is unavailable in this build',
        'This build has no Me+U reflection service configured. Local-only reflection is still fully available.',
      );
      return;
    }

    Alert.alert(
      'Use Cloud AI for completed resets?',
      'Me+U will send the completed reset and a random device ID to its Google Cloud service. Your full journal stays on this device; only a short derived pattern may be remembered in Firestore when cloud memory is available.',
      [
        { text: 'Keep local only', style: 'cancel' },
        { text: 'Use Cloud AI', onPress: () => setCloudEnabled(true) },
      ],
    );
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
      }, cloudEnabled);

      const nextEntry: Entry = {
        id: String(Date.now()),
        createdAt: new Date().toISOString(),
        mood,
        text: text.trim(),
        reflection: result.reflection,
        reflectionSource: result.source,
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
      setLastReflectionSource(result.source);
      resetForm();
      setScreen('today');
    } finally {
      setBusy(false);
    }
  }

  function clearJournal() {
    Alert.alert(
      'Delete all local journal data?',
      'This permanently removes every saved reset from this device and requests deletion of pseudonymous cloud pattern memory.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setEntries([]);
            setLastReflection('');
            await saveEntries([]);
            const cloudDeleted = await deleteCloudMemory();
            if (!cloudDeleted) {
              Alert.alert(
                'Local journal deleted',
                'Me+U removed the journal from this device, but could not confirm cloud-memory deletion. Try again when the cloud service is available.',
              );
            }
          },
        },
      ],
    );
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
    <SafeAreaProvider>
      <SafeAreaView style={s.safe} edges={['top', 'left', 'right']}>
      <StatusBar style="light" />
      <View pointerEvents="none" style={s.ambient}>
        <View style={s.glowViolet} />
        <View style={s.glowCyan} />
      </View>
      <View style={s.header}>
        <View>
          <Text style={s.brand}>Me<Text style={s.brandPlus}>+</Text>U</Text>
          <Text style={s.sub}>REFLECTION INTELLIGENCE · BUILD 05</Text>
        </View>
        <Text style={s.pill}>{cloudEnabled ? 'CLOUD AI' : 'LOCAL ONLY'}</Text>
      </View>


      <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
        {screen === 'today' && (
          <>
            <View style={s.signalRow}>
              <View style={s.liveDot} />
              <Text style={s.kicker}>YOUR PRIVATE REFLECTION SPACE</Text>
            </View>
            <Text style={s.title}>Make space between the feeling and the move.</Text>
            <Text style={s.body}>
              Slow the reaction. Separate what is yours from what belongs to someone else. Choose what happens next with clarity.
            </Text>

            <View style={s.aiStage}>
              <View style={s.orbitOuter}>
                <View style={s.orbitMid}>
                  <View style={s.aiCore}>
                    <Text style={s.aiCoreMark}>M+U</Text>
                  </View>
                </View>
              </View>
              <Text style={s.aiStatus}>CALM · CLARITY · CHOICE</Text>
              <Text style={s.aiCaption}>{cloudEnabled ? 'GEMINI REFLECTION READY' : 'ON-DEVICE REFLECTION READY'}</Text>
            </View>

            <View style={s.modeCard}>
              <View style={s.modeHeader}>
                <View style={s.modeCopy}>
                  <Text style={s.cardTitle}>Reflection mode</Text>
                  <Text style={s.small}>
                    {cloudEnabled
                      ? 'Cloud AI sends each completed reset to ME+U’s Google Cloud service for a Gemini reflection.'
                      : 'Local-only keeps reflection processing and your journal on this device.'}
                  </Text>
                </View>
                <Text style={s.modeStatus}>{cloudEnabled ? 'ONLINE' : 'ON DEVICE'}</Text>
              </View>
              <View style={s.modeButtons}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: !cloudEnabled }}
                  style={[s.modeButton, !cloudEnabled && s.modeButtonSelected]}
                  onPress={() => setCloudEnabled(false)}
                >
                  <Text style={[s.modeButtonText, !cloudEnabled && s.modeButtonTextSelected]}>Local only</Text>
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityState={{ selected: cloudEnabled }}
                  style={[s.modeButton, cloudEnabled && s.modeButtonSelected]}
                  onPress={enableCloudAI}
                >
                  <Text style={[s.modeButtonText, cloudEnabled && s.modeButtonTextSelected]}>Cloud AI</Text>
                </Pressable>
              </View>
            </View>

            <View style={s.heroCard}>
              <Text style={s.quote}>“I can work on me. You can work on you.”</Text>
              <Text style={s.cardBody}>The goal is not to suppress emotion. It is to keep emotion from driving the car.</Text>
            </View>

            <Pressable style={s.button} onPress={beginReset}>
              <Text style={s.buttonText}>Start a Me+U reset</Text>
            </Pressable>

            {!!lastReflection && (
              <View style={s.card}>
                <View style={s.entryHeader}>
                  <Text style={s.cardTitle}>Your last reflection</Text>
                  <Text style={s.sourceTag}>{lastReflectionSource === 'cloud' ? 'CLOUD' : 'LOCAL'}</Text>
                </View>
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
                    <Text style={[s.choiceText, involvesPerson && s.choiceTextSelected]}>Yes</Text>
                  </Pressable>
                  <Pressable style={[s.smallChoice, !involvesPerson && s.selected]} onPress={() => setInvolvesPerson(false)}>
                    <Text style={[s.choiceText, !involvesPerson && s.choiceTextSelected]}>No</Text>
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
            {!!entries.length && (
              <Pressable style={s.dangerButton} onPress={clearJournal}>
                <Text style={s.dangerText}>Delete all local journal data</Text>
              </Pressable>
            )}
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
            <Text style={s.title}>Your private intelligence layer.</Text>
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
              <Text style={s.price}>{premium.isPro ? 'Plus active' : premium.priceText ?? 'ME+U Plus — coming soon'}</Text>
              {premium.configured && !!premium.message && <Text style={s.small}>{premium.message}</Text>}
              {!premium.configured && <Text style={s.small}>Advanced pattern intelligence, custom reset paths, and personal exports are being prepared.</Text>}
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

      <View style={s.nav}>
        {navItems.map(item => {
          const selected = screen === item.id;
          const isReset = item.id === 'reset';
          return (
            <Pressable
              key={item.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              style={[s.navItem, isReset && s.navReset, selected && s.navItemActive]}
              onPress={() => (isReset ? beginReset() : setScreen(item.id))}
            >
              <Text style={[s.navIcon, isReset && s.navResetIcon, selected && s.navIconActive]}>{item.icon}</Text>
              <Text style={[s.link, selected && s.active]}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#050611' },
  ambient: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, overflow: 'hidden' },
  glowViolet: {
    position: 'absolute',
    width: 330,
    height: 330,
    borderRadius: 165,
    backgroundColor: '#4D22B8',
    opacity: 0.18,
    top: -190,
    right: -150,
  },
  glowCyan: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#00CBE6',
    opacity: 0.09,
    bottom: 80,
    left: -170,
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 13,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#171B35',
    backgroundColor: 'rgba(5,6,17,0.96)',
  },
  brand: { fontSize: 34, lineHeight: 38, fontWeight: '900', letterSpacing: -1.8, color: '#F8F9FF' },
  brandPlus: { color: '#8B7CFF' },
  sub: { color: '#687399', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 2 },
  pill: {
    fontSize: 9,
    fontWeight: '900',
    letterSpacing: 1.2,
    borderWidth: 1,
    borderColor: '#20DDF5',
    borderRadius: 18,
    paddingHorizontal: 11,
    paddingVertical: 7,
    color: '#70EDFF',
    backgroundColor: '#071C29',
    overflow: 'hidden',
  },
  nav: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-around',
    paddingHorizontal: 7,
    paddingTop: 8,
    paddingBottom: 9,
    borderTopWidth: 1,
    borderTopColor: '#202544',
    backgroundColor: '#090B18',
  },
  navItem: { minWidth: 58, paddingVertical: 5, alignItems: 'center', borderRadius: 16 },
  navReset: {
    minWidth: 64,
    marginTop: -24,
    paddingTop: 10,
    paddingBottom: 7,
    borderWidth: 1,
    borderColor: '#786DFF',
    backgroundColor: '#5B4CF0',
    shadowColor: '#7568FF',
    shadowOpacity: 0.7,
    shadowRadius: 15,
    elevation: 12,
  },
  navItemActive: { backgroundColor: '#151936' },
  navIcon: { color: '#657094', fontSize: 17, fontWeight: '900', marginBottom: 3 },
  navResetIcon: { color: '#FFFFFF', fontSize: 22 },
  navIconActive: { color: '#75EFFF' },
  link: { color: '#687399', fontSize: 9, fontWeight: '800', letterSpacing: 0.3 },
  active: { color: '#F5F6FF' },
  content: { padding: 20, paddingTop: 24, paddingBottom: 118 },
  signalRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  liveDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: '#22E2F7',
    shadowColor: '#22E2F7',
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 6,
  },
  kicker: { color: '#59E9FA', fontWeight: '900', letterSpacing: 1.8, fontSize: 9, lineHeight: 16 },
  title: {
    fontSize: 36,
    lineHeight: 41,
    fontWeight: '900',
    letterSpacing: -1.3,
    color: '#F8F9FF',
    marginTop: 14,
    marginBottom: 13,
  },
  body: { fontSize: 15, lineHeight: 23, color: '#ABB5D4' },
  cardBody: { fontSize: 14, lineHeight: 22, color: '#AAB4D3', marginTop: 9 },
  aiStage: {
    alignItems: 'center',
    backgroundColor: '#090C20',
    borderRadius: 28,
    borderWidth: 1,
    borderColor: '#282E59',
    paddingVertical: 25,
    marginTop: 24,
    overflow: 'hidden',
    shadowColor: '#6F5EFF',
    shadowOpacity: 0.34,
    shadowRadius: 28,
    elevation: 10,
  },
  orbitOuter: {
    width: 154,
    height: 154,
    borderRadius: 77,
    borderWidth: 1,
    borderColor: '#2BDBF0',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#081424',
    shadowColor: '#22E2F7',
    shadowOpacity: 0.72,
    shadowRadius: 24,
    elevation: 12,
  },
  orbitMid: {
    width: 124,
    height: 124,
    borderRadius: 62,
    borderWidth: 7,
    borderColor: '#262150',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#11102E',
  },
  aiCore: {
    width: 92,
    height: 92,
    borderRadius: 46,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#6758F5',
    borderWidth: 1,
    borderColor: '#A8A1FF',
    shadowColor: '#7F73FF',
    shadowOpacity: 0.95,
    shadowRadius: 22,
    elevation: 14,
  },
  aiCoreMark: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', letterSpacing: -1 },
  aiStatus: { color: '#F5F6FF', fontSize: 10, fontWeight: '900', letterSpacing: 2, marginTop: 18 },
  aiCaption: { color: '#69759C', fontSize: 8, fontWeight: '900', letterSpacing: 1.4, marginTop: 7 },
  heroCard: {
    backgroundColor: '#11152E',
    borderRadius: 23,
    padding: 20,
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#343B70',
    shadowColor: '#5E50E8',
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 8,
  },
  quote: { fontSize: 20, lineHeight: 27, fontWeight: '900', color: '#EDEFFF' },
  card: {
    backgroundColor: '#0D1024',
    borderWidth: 1,
    borderColor: '#242A4D',
    borderRadius: 21,
    padding: 18,
    marginTop: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.42,
    shadowRadius: 16,
    elevation: 5,
  },
  cardTitle: { fontWeight: '900', color: '#F1F3FF', marginBottom: 7, fontSize: 15 },
  modeCard: {
    backgroundColor: '#0A1023',
    borderWidth: 1,
    borderColor: '#26375D',
    borderRadius: 21,
    padding: 16,
    marginTop: 18,
  },
  modeHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  modeCopy: { flex: 1 },
  modeStatus: { color: '#36E4F7', fontSize: 8, fontWeight: '900', letterSpacing: 1.2 },
  modeButtons: { flexDirection: 'row', gap: 9, marginTop: 14 },
  modeButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#2C355C',
    borderRadius: 14,
    paddingVertical: 11,
    alignItems: 'center',
    backgroundColor: '#0D1328',
  },
  modeButtonSelected: { backgroundColor: '#272154', borderColor: '#857AFF' },
  modeButtonText: { color: '#7580A4', fontWeight: '800' },
  modeButtonTextSelected: { color: '#FFFFFF' },
  sourceTag: { color: '#50E8FA', fontSize: 8, fontWeight: '900', letterSpacing: 1.1 },
  big: { fontSize: 38, fontWeight: '900', color: '#8B7CFF' },
  small: { color: '#7E89AE', fontSize: 12, lineHeight: 18 },
  safety: { color: '#5E688C', fontSize: 10, lineHeight: 16, marginTop: 24 },
  button: {
    backgroundColor: '#6254F3',
    borderRadius: 18,
    padding: 17,
    alignItems: 'center',
    marginTop: 18,
    borderWidth: 1,
    borderColor: '#9B93FF',
    shadowColor: '#6F61FF',
    shadowOpacity: 0.65,
    shadowRadius: 18,
    elevation: 10,
  },
  buttonText: { color: '#FFFFFF', fontWeight: '900', letterSpacing: 0.3 },
  secondaryButton: {
    borderWidth: 1,
    borderColor: '#25DDF3',
    backgroundColor: '#071B29',
    borderRadius: 15,
    padding: 14,
    alignItems: 'center',
    marginTop: 17,
  },
  secondaryButtonText: { color: '#55E9FA', fontWeight: '900' },
  disabled: { opacity: 0.34 },
  backButton: { alignItems: 'center', padding: 15, marginTop: 7 },
  backText: { color: '#7C88AD', fontWeight: '800' },
  stepHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progress: {
    color: '#B0A9FF',
    fontWeight: '900',
    fontSize: 10,
    letterSpacing: 0.6,
    borderWidth: 1,
    borderColor: '#423A78',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#171434',
    overflow: 'hidden',
  },
  label: { fontSize: 12, fontWeight: '900', color: '#E8EBFF', marginTop: 23, marginBottom: 10, letterSpacing: 0.2 },
  labelInline: { flex: 1, fontSize: 12, fontWeight: '900', color: '#E8EBFF' },
  moods: { flexDirection: 'row', gap: 7, marginBottom: 17 },
  mood: {
    flex: 1,
    backgroundColor: '#0D1126',
    borderWidth: 1,
    borderColor: '#293354',
    borderRadius: 15,
    paddingVertical: 13,
    alignItems: 'center',
  },
  selected: { backgroundColor: '#292259', borderColor: '#8B7CFF' },
  moodNumber: { fontWeight: '900', color: '#F1F3FF', fontSize: 16 },
  moodLabel: { fontSize: 9, color: '#7D88AD', marginTop: 4 },
  input: {
    minHeight: 150,
    backgroundColor: '#080B19',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#293357',
    padding: 17,
    textAlignVertical: 'top',
    fontSize: 16,
    color: '#F1F3FF',
  },
  inputShort: {
    minHeight: 108,
    backgroundColor: '#080B19',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: '#293357',
    padding: 17,
    textAlignVertical: 'top',
    fontSize: 15,
    color: '#F1F3FF',
  },
  lineInput: {
    backgroundColor: '#080B19',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#293357',
    padding: 16,
    fontSize: 15,
    color: '#F1F3FF',
    marginTop: 12,
  },
  toggleRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginTop: 17 },
  choiceText: { color: '#7E89AE', fontWeight: '900' },
  choiceTextSelected: { color: '#FFFFFF' },
  smallChoice: {
    borderWidth: 1,
    borderColor: '#2C385F',
    borderRadius: 13,
    paddingHorizontal: 14,
    paddingVertical: 10,
    backgroundColor: '#0D1126',
  },
  breatheCard: {
    backgroundColor: '#081827',
    borderRadius: 28,
    padding: 26,
    marginTop: 23,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#237189',
    shadowColor: '#2CE7F8',
    shadowOpacity: 0.42,
    shadowRadius: 25,
    elevation: 10,
  },
  breatheWord: { fontWeight: '900', letterSpacing: 4, color: '#4AE8FA' },
  timer: { fontSize: 60, fontWeight: '900', color: '#F7F8FF', marginVertical: 13, letterSpacing: -2.5 },
  humor: { fontSize: 12, lineHeight: 18, color: '#7D88AD', fontStyle: 'italic', marginTop: 15 },
  choiceCard: {
    backgroundColor: '#0D1024',
    borderWidth: 1,
    borderColor: '#242A4D',
    borderRadius: 18,
    padding: 16,
    marginTop: 11,
  },
  choiceSelected: { borderColor: '#8B7CFF', backgroundColor: '#282255' },
  reflectionBox: { borderTopWidth: 1, borderTopColor: '#242A4D', marginTop: 15, paddingTop: 15 },
  detail: { fontSize: 14, lineHeight: 21, color: '#ADB6D3', marginTop: 7 },
  bold: { fontWeight: '900', color: '#F1F3FF' },
  entryHeader: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  statsRow: { flexDirection: 'row', gap: 13, marginTop: 17 },
  statCard: {
    flex: 1,
    backgroundColor: '#0D1024',
    borderWidth: 1,
    borderColor: '#242A4D',
    borderRadius: 21,
    padding: 17,
  },
  dangerButton: {
    borderWidth: 1,
    borderColor: '#74364B',
    backgroundColor: '#26101A',
    borderRadius: 16,
    padding: 15,
    alignItems: 'center',
    marginTop: 18,
  },
  dangerText: { color: '#FF91AD', fontWeight: '900' },
  price: { fontSize: 20, fontWeight: '900', color: '#58E9FA', marginTop: 14 },
});
