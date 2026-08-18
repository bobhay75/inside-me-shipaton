import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Animated, Easing, Pressable, ScrollView, Share, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import type { Entry, GrowthMode, Mood, Revelation } from './src/types';
import { loadEntries, saveEntries } from './src/storage';
import { getRevelation, isCloudReflectionConfigured } from './src/services/reflection';

type Screen = 'home' | 'reveal' | 'patterns' | 'self';
const journeys: { id: GrowthMode; icon: string; label: string; sub: string; prompt: string }[] = [
  { id: 'now', icon: '⚡', label: 'Help me now', sub: 'Something happened', prompt: 'Tell me exactly what happened—the raw, unfair, confused version.' },
  { id: 'trigger', icon: '◎', label: 'Decode a trigger', sub: 'Why did that hit so hard?', prompt: 'What happened, and what part of it hit you harder than expected?' },
  { id: 'belief', icon: '◇', label: 'Excavate a belief', sub: 'Find the rule running you', prompt: 'What do you keep believing about yourself, other people, or life?' },
  { id: 'decision', icon: '↗', label: 'Decision compass', sub: 'Fear, truth, or pressure?', prompt: 'What decision are you facing, and what does each choice seem to cost?' },
  { id: 'identity', icon: '✦', label: 'Meet future me', sub: 'Become on purpose', prompt: 'Who are you becoming—and what keeps pulling you back into the old version?' },
];
const feelings = ['angry', 'hurt', 'afraid', 'ashamed', 'confused', 'numb', 'overloaded', 'betrayed'];

function Action({ title, onPress, disabled }: { title: string; onPress: () => void; disabled?: boolean }) {
  return <Pressable onPress={onPress} disabled={disabled} style={[s.action, disabled && s.disabled]}><Text style={s.actionText}>{title}</Text><Text style={s.actionArrow}>→</Text></Pressable>;
}
function Section({ tag, children, tone }: { tag: string; children: React.ReactNode; tone?: 'violet' | 'rose' | 'mint' }) {
  return <View style={[s.sectionCard, tone === 'rose' && s.rose, tone === 'mint' && s.mint]}><Text style={s.tag}>{tag}</Text><Text style={s.sectionText}>{children}</Text></View>;
}

export default function App() {
  const [screen, setScreen] = useState<Screen>('home');
  const [entries, setEntries] = useState<Entry[]>([]);
  const [mode, setMode] = useState<GrowthMode>('now');
  const [text, setText] = useState('');
  const [feeling, setFeeling] = useState('');
  const [result, setResult] = useState<Revelation | null>(null);
  const [busy, setBusy] = useState(false);
  const [cloud, setCloud] = useState(false);
  const glow = useRef(new Animated.Value(0)).current;

  useEffect(() => { loadEntries().then(setEntries); }, []);
  useEffect(() => {
    const a = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(glow, { toValue: 0, duration: 2400, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])); a.start(); return () => a.stop();
  }, [glow]);

  const current = journeys.find(j => j.id === mode) || journeys[0];
  const tagCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    entries.forEach(e => e.revelation?.tags.forEach(tag => { counts[tag] = (counts[tag] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [entries]);
  const returnQuestion = entries[0]?.revelation?.question || 'What are you carrying today that needs truth—not another distraction?';

  function start(next: GrowthMode) {
    setMode(next); setText(''); setFeeling(''); setResult(null); setScreen('reveal');
  }
  function toggleCloud() {
    if (cloud) return setCloud(false);
    if (!isCloudReflectionConfigured()) return Alert.alert('Private mirror active', 'Cloud intelligence is not configured in this build. The on-device Inner Mirror still works.');
    Alert.alert('Use deeper AI reflection?', 'Only what you submit is sent for analysis. Me+U treats every conclusion as a hypothesis, never a diagnosis.', [
      { text: 'Stay on device', style: 'cancel' }, { text: 'Use deeper mirror', onPress: () => setCloud(true) },
    ]);
  }
  async function reveal() {
    if (!text.trim() || busy) return;
    setBusy(true);
    try {
      const memory = entries.slice(0, 5).map(e => ({ pattern: e.revelation?.pattern, revelation: e.revelation }));
      setResult(await getRevelation({ text, mode, feeling, memory }, cloud));
    } finally { setBusy(false); }
  }
  async function save() {
    if (!result) return;
    const entry: Entry = {
      id: String(Date.now()), createdAt: new Date().toISOString(), mood: 3 as Mood, text: text.trim(),
      reflection: result.anchor, growthMode: mode, revelation: result,
    };
    const all = [entry, ...entries]; setEntries(all); await saveEntries(all); setScreen('home');
  }
  async function shareAnchor() {
    if (!result) return;
    await Share.share({ title: 'My Me+U anchor', message: 'My truth for today:\n\n“' + result.anchor + '”\n\nFound with Me+U. The private story stayed private. #InnerMirror' });
  }

  function Home() {
    return <ScrollView contentContainerStyle={s.content}>
      <View style={s.top}><View><Text style={s.brand}>me<Text style={s.x}>×</Text>u</Text><Text style={s.micro}>INNER MIRROR</Text></View><Pressable style={s.private} onPress={toggleCloud}><Text style={s.privateText}>{cloud ? '✦ DEEP AI' : '⌁ PRIVATE'}</Text></Pressable></View>
      <View style={s.hero}><Animated.View style={[s.heroGlow, { opacity: glow.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.48] }), transform: [{ scale: glow.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1.15] }) }] }]} /><Text style={s.heroTag}>WHEN YOUR MIND IS LOUD</Text><Text style={s.heroTitle}>Do not escape it.<Text style={s.x}> See through it.</Text></Text><Text style={s.heroBody}>Bring the real story. Me+U separates what happened from what your pain added—and shows what is yours to do next.</Text><Action title="Something happened" onPress={() => start('now')} /><Text style={s.promise}>No judgment · No diagnosis · No fake positivity</Text></View>
      <Text style={s.heading}>Go beneath the reaction</Text>
      {journeys.slice(1).map(j => <Pressable key={j.id} style={s.journey} onPress={() => start(j.id)}><View style={s.journeyIcon}><Text style={s.journeyGlyph}>{j.icon}</Text></View><View style={s.flex}><Text style={s.journeyTitle}>{j.label}</Text><Text style={s.journeySub}>{j.sub}</Text></View><Text style={s.chev}>›</Text></Pressable>)}
      <View style={s.question}><Text style={s.tag}>THE QUESTION WAITING FOR YOU</Text><Text style={s.questionText}>{returnQuestion}</Text><Pressable onPress={() => start('now')}><Text style={s.answer}>Answer honestly →</Text></Pressable></View>
      {!!entries.length && <View style={s.proof}><Text style={s.proofNumber}>{entries.length}</Text><Text style={s.proofText}>moments faced instead of avoided</Text></View>}
    </ScrollView>;
  }

  function Reveal() {
    if (result) return <ScrollView contentContainerStyle={s.content}>
      <View style={s.revealTop}><Pressable onPress={() => setResult(null)}><Text style={s.back}>←</Text></Pressable><Text style={s.micro}>YOUR INNER MIRROR</Text><View style={s.source}><Text style={s.sourceText}>{result.source === 'cloud' ? '✦ DEEP' : '⌁ LOCAL'}</Text></View></View>
      <Text style={s.revealTitle}>Here is what may be happening underneath.</Text><Text style={s.hypothesis}>This is a hypothesis to test against your truth—not a verdict about you.</Text>
      <Section tag="01 · WHAT IS OBSERVABLE">{result.facts}</Section>
      <Section tag="02 · THE STORY YOUR MIND ADDED" tone="rose">{result.story}</Section>
      <View style={s.split}><View style={s.splitCard}><Text style={s.tag}>FEELING</Text><Text style={s.splitText}>{result.feeling}</Text></View><View style={s.splitCard}><Text style={s.tag}>NEED</Text><Text style={s.splitText}>{result.need}</Text></View></View>
      <Section tag="03 · THE PATTERN TO TEST">{result.pattern}</Section>
      <View style={s.boundary}><View style={s.boundarySide}><Text style={s.meTag}>ME</Text><Text style={s.boundaryText}>{result.mine}</Text></View><View style={s.vertical} /><View style={s.boundarySide}><Text style={s.uTag}>U</Text><Text style={s.boundaryText}>{result.notMine}</Text></View></View>
      <Section tag="04 · THE CHOICE THAT RETURNS YOUR POWER" tone="mint">{result.choice}</Section>
      <View style={s.hardQuestion}><Text style={s.hardLabel}>DO NOT ANSWER TOO QUICKLY</Text><Text style={s.hardText}>{result.question}</Text></View>
      <View style={s.anchor}><Text style={s.anchorTag}>YOUR ANCHOR</Text><Text style={s.anchorText}>“{result.anchor}”</Text></View>
      <Action title="Keep this revelation" onPress={save} /><View style={s.twoActions}><Pressable style={s.ghost} onPress={shareAnchor}><Text style={s.ghostText}>Share anchor ↗</Text></Pressable><Pressable style={s.ghost} onPress={() => { setText(''); setFeeling(''); setResult(null); }}><Text style={s.ghostText}>Go deeper ↓</Text></Pressable></View>
    </ScrollView>;
    return <ScrollView contentContainerStyle={s.content} keyboardShouldPersistTaps="handled">
      <View style={s.revealTop}><Pressable onPress={() => setScreen('home')}><Text style={s.back}>←</Text></Pressable><Text style={s.micro}>{current.label.toUpperCase()}</Text><Text style={s.step}>01 / 01</Text></View>
      <Text style={s.prompt}>{current.prompt}</Text><Text style={s.permission}>Do not make it wise. Do not make it fair. Make it true.</Text>
      <TextInput autoFocus multiline value={text} onChangeText={setText} style={s.input} placeholder="Say the part you usually edit out…" placeholderTextColor="#676070" />
      <Text style={s.feelingLabel}>What is strongest in your body right now?</Text><View style={s.chips}>{feelings.map(f => <Pressable key={f} onPress={() => setFeeling(f)} style={[s.chip, feeling === f && s.chipOn]}><Text style={[s.chipText, feeling === f && s.chipTextOn]}>{f}</Text></Pressable>)}</View>
      <View style={s.privacyBox}><Text style={s.lock}>⌁</Text><Text style={s.privacyCopy}>{cloud ? 'Deeper AI is on. Your entry is analyzed, not publicly posted.' : 'On-device mode. Your entry does not leave this phone.'}</Text></View>
      <Action title={busy ? 'Looking beneath the story…' : 'Show me what I cannot see'} disabled={!text.trim() || busy} onPress={reveal} />
    </ScrollView>;
  }

  function Patterns() {
    return <ScrollView contentContainerStyle={s.content}><Text style={s.micro}>PATTERN CONSTELLATION</Text><Text style={s.title}>Not who you are.<Text style={s.x}> What you have practiced.</Text></Text>
      {!tagCounts.length ? <View style={s.empty}><Text style={s.emptyTitle}>No identity labels here.</Text><Text style={s.emptyBody}>After a few honest mirrors, recurring alarms and coping moves appear here as changeable patterns—not permanent traits.</Text></View> : <View style={s.constellation}>{tagCounts.map(([tag, count], i) => <View key={tag} style={[s.patternOrb, { width: 98 + Math.min(count, 4) * 13, height: 98 + Math.min(count, 4) * 13, borderRadius: 80, borderColor: i % 2 ? '#436D68' : '#614D90' }]}><Text style={s.patternName}>{tag}</Text><Text style={s.patternCount}>{count}×</Text></View>)}</View>}
      <View style={s.question}><Text style={s.tag}>GROWTH IS EVIDENCE</Text><Text style={s.questionText}>A pattern stops defining you the moment you can see it and choose differently.</Text></View>
    </ScrollView>;
  }

  function Self() {
    return <ScrollView contentContainerStyle={s.content}><Text style={s.micro}>THE SELF YOU ARE BUILDING</Text><Text style={s.title}>Proof over promises.</Text>
      <View style={s.selfHero}><Text style={s.selfNumber}>{entries.length}</Text><Text style={s.selfLabel}>TRUTHS FACED</Text></View>
      {entries.slice(0, 10).map(e => <View key={e.id} style={s.timeline}><View style={s.timelineDot} /><View style={s.flex}><Text style={s.timelineDate}>{new Date(e.createdAt).toLocaleDateString()} · {(e.growthMode || 'now').toUpperCase()}</Text><Text style={s.timelineAnchor}>{e.revelation?.anchor || e.reflection}</Text><Text style={s.timelineChoice}>{e.revelation?.choice}</Text></View></View>)}
      {!entries.length && <View style={s.empty}><Text style={s.emptyTitle}>You do not need a new identity.</Text><Text style={s.emptyBody}>You need evidence that you can face truth, regulate choice, and act like the person you say you want to become.</Text></View>}
    </ScrollView>;
  }

  const view = screen === 'home' ? <Home /> : screen === 'reveal' ? <Reveal /> : screen === 'patterns' ? <Patterns /> : <Self />;
  return <SafeAreaProvider><SafeAreaView style={s.safe}><StatusBar style="light" /><View style={s.app}>{view}<View style={s.nav}><Pressable style={s.navItem} onPress={() => setScreen('home')}><Text style={[s.navIcon, screen === 'home' && s.navOn]}>◉</Text><Text style={[s.navText, screen === 'home' && s.navOn]}>Now</Text></Pressable><Pressable style={s.navItem} onPress={() => setScreen('patterns')}><Text style={[s.navIcon, screen === 'patterns' && s.navOn]}>✣</Text><Text style={[s.navText, screen === 'patterns' && s.navOn]}>Patterns</Text></Pressable><Pressable style={s.navCore} onPress={() => start('now')}><Text style={s.coreIcon}>⌁</Text><Text style={s.coreText}>MIRROR</Text></Pressable><Pressable style={s.navItem} onPress={() => start('identity')}><Text style={s.navIcon}>◇</Text><Text style={s.navText}>Grow</Text></Pressable><Pressable style={s.navItem} onPress={() => setScreen('self')}><Text style={[s.navIcon, screen === 'self' && s.navOn]}>↗</Text><Text style={[s.navText, screen === 'self' && s.navOn]}>Self</Text></Pressable></View></View></SafeAreaView></SafeAreaProvider>;
}

const s = StyleSheet.create({
  safe:{flex:1,backgroundColor:'#07070D'},app:{flex:1,backgroundColor:'#07070D'},content:{padding:22,paddingBottom:118},flex:{flex:1},top:{flexDirection:'row',alignItems:'center',justifyContent:'space-between'},brand:{color:'#F8F6FC',fontSize:31,fontWeight:'900',letterSpacing:-2},x:{color:'#A88CFF'},micro:{color:'#777083',fontSize:10,fontWeight:'900',letterSpacing:1.6},private:{borderWidth:1,borderColor:'#292431',backgroundColor:'#111017',paddingHorizontal:12,paddingVertical:8,borderRadius:99},privateText:{color:'#9B93A8',fontSize:9,fontWeight:'900',letterSpacing:1},
  hero:{overflow:'hidden',backgroundColor:'#13101E',borderWidth:1,borderColor:'#342A4C',borderRadius:30,padding:23,marginTop:25,marginBottom:28},heroGlow:{position:'absolute',right:-55,top:-65,width:210,height:210,borderRadius:105,backgroundColor:'#693CD2'},heroTag:{color:'#B9A5FF',fontSize:10,fontWeight:'900',letterSpacing:1.4},heroTitle:{color:'#FAF7FF',fontSize:38,lineHeight:42,fontWeight:'900',letterSpacing:-1.6,marginTop:14},heroBody:{color:'#B6AFBF',fontSize:15,lineHeight:23,marginTop:15},promise:{color:'#746D7E',fontSize:10,textAlign:'center',marginTop:12},action:{minHeight:59,borderRadius:19,backgroundColor:'#7C5CFC',paddingHorizontal:18,flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginTop:19},actionText:{color:'#FFF',fontSize:16,fontWeight:'900'},actionArrow:{color:'#FFF',fontSize:22},disabled:{opacity:.35},
  heading:{color:'#EEEAF3',fontSize:18,fontWeight:'900',marginBottom:12},journey:{flexDirection:'row',alignItems:'center',backgroundColor:'#111017',borderWidth:1,borderColor:'#25212C',borderRadius:19,padding:14,marginBottom:9},journeyIcon:{width:43,height:43,borderRadius:14,backgroundColor:'#211A34',alignItems:'center',justifyContent:'center',marginRight:13},journeyGlyph:{color:'#B8A6F4',fontSize:18},journeyTitle:{color:'#F0ECF4',fontSize:15,fontWeight:'900'},journeySub:{color:'#827B8B',fontSize:11,marginTop:3},chev:{color:'#665F70',fontSize:27},
  question:{backgroundColor:'#10191A',borderWidth:1,borderColor:'#25403D',borderRadius:21,padding:19,marginTop:17},tag:{color:'#8E849C',fontSize:9,fontWeight:'900',letterSpacing:1.3},questionText:{color:'#D8F5ED',fontSize:19,lineHeight:27,fontWeight:'800',marginTop:10},answer:{color:'#67E8C4',fontSize:12,fontWeight:'900',marginTop:15},proof:{flexDirection:'row',alignItems:'baseline',gap:9,justifyContent:'center',marginTop:22},proofNumber:{color:'#B8A5FF',fontSize:28,fontWeight:'900'},proofText:{color:'#777080',fontSize:11},
  revealTop:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:28},back:{color:'#F5F1FA',fontSize:27,width:45},step:{color:'#777080',fontSize:10,fontWeight:'800'},source:{borderRadius:99,backgroundColor:'#171321',paddingHorizontal:10,paddingVertical:6},sourceText:{color:'#A895E6',fontSize:9,fontWeight:'900'},prompt:{color:'#F8F5FC',fontSize:33,lineHeight:39,fontWeight:'900',letterSpacing:-1},permission:{color:'#958E9E',fontSize:13,lineHeight:20,marginTop:10,marginBottom:19},input:{minHeight:230,borderRadius:23,borderWidth:1,borderColor:'#30283B',backgroundColor:'#100E15',color:'#F7F3FA',fontSize:17,lineHeight:25,padding:18,textAlignVertical:'top'},feelingLabel:{color:'#C1BAC8',fontSize:12,fontWeight:'800',marginTop:20,marginBottom:10},chips:{flexDirection:'row',flexWrap:'wrap',gap:8},chip:{borderWidth:1,borderColor:'#2B2632',backgroundColor:'#121017',borderRadius:99,paddingHorizontal:13,paddingVertical:9},chipOn:{borderColor:'#8265DE',backgroundColor:'#2B2047'},chipText:{color:'#857E8D',fontSize:11,fontWeight:'800'},chipTextOn:{color:'#D6C9FF'},privacyBox:{flexDirection:'row',alignItems:'center',gap:11,backgroundColor:'#0E1516',borderWidth:1,borderColor:'#203434',borderRadius:15,padding:13,marginTop:18},lock:{color:'#67E8C4',fontSize:17},privacyCopy:{color:'#7F9993',fontSize:11,lineHeight:17,flex:1},
  revealTitle:{color:'#F7F3FA',fontSize:30,lineHeight:36,fontWeight:'900',letterSpacing:-.8},hypothesis:{color:'#81798A',fontSize:12,lineHeight:18,marginTop:9,marginBottom:21},sectionCard:{backgroundColor:'#14111B',borderWidth:1,borderColor:'#30283A',borderRadius:20,padding:18,marginBottom:11},rose:{backgroundColor:'#1A1118',borderColor:'#4A273A'},mint:{backgroundColor:'#0F1A18',borderColor:'#25473F'},sectionText:{color:'#EEE9F2',fontSize:16,lineHeight:24,fontWeight:'600',marginTop:9},split:{flexDirection:'row',gap:10,marginBottom:11},splitCard:{flex:1,backgroundColor:'#121018',borderWidth:1,borderColor:'#292430',borderRadius:18,padding:15},splitText:{color:'#D8D1DE',fontSize:14,lineHeight:20,fontWeight:'700',marginTop:8},boundary:{flexDirection:'row',backgroundColor:'#101016',borderWidth:1,borderColor:'#2B2632',borderRadius:20,padding:17,marginBottom:11},boundarySide:{flex:1},vertical:{width:1,backgroundColor:'#302A36',marginHorizontal:15},meTag:{color:'#B9A5FF',fontSize:13,fontWeight:'900'},uTag:{color:'#67E8C4',fontSize:13,fontWeight:'900'},boundaryText:{color:'#AAA3B1',fontSize:13,lineHeight:20,marginTop:8},hardQuestion:{borderLeftWidth:3,borderLeftColor:'#FF719B',paddingLeft:17,paddingVertical:7,marginVertical:18},hardLabel:{color:'#FF86A8',fontSize:9,fontWeight:'900',letterSpacing:1.4},hardText:{color:'#F3EDF4',fontSize:21,lineHeight:29,fontWeight:'800',marginTop:9},anchor:{backgroundColor:'#21183A',borderWidth:1,borderColor:'#5B4591',borderRadius:23,padding:21},anchorTag:{color:'#A895E6',fontSize:9,fontWeight:'900',letterSpacing:1.4},anchorText:{color:'#F5F0FF',fontSize:22,lineHeight:30,fontWeight:'900',marginTop:9},twoActions:{flexDirection:'row',gap:10},ghost:{flex:1,minHeight:49,alignItems:'center',justifyContent:'center'},ghostText:{color:'#9C93AA',fontSize:11,fontWeight:'800'},
  title:{color:'#F7F3FA',fontSize:34,lineHeight:40,fontWeight:'900',letterSpacing:-1,marginTop:10,marginBottom:22},empty:{borderWidth:1,borderStyle:'dashed',borderColor:'#302A37',borderRadius:22,padding:21},emptyTitle:{color:'#F0EBF4',fontSize:18,fontWeight:'900'},emptyBody:{color:'#918A99',fontSize:14,lineHeight:22,marginTop:9},constellation:{flexDirection:'row',flexWrap:'wrap',gap:11,justifyContent:'center'},patternOrb:{alignItems:'center',justifyContent:'center',backgroundColor:'#121019',borderWidth:1},patternName:{color:'#D7CFDF',fontSize:11,fontWeight:'900',textAlign:'center',paddingHorizontal:8},patternCount:{color:'#81778D',fontSize:10,marginTop:4},selfHero:{height:180,borderRadius:26,backgroundColor:'#191329',borderWidth:1,borderColor:'#3A2E59',alignItems:'center',justifyContent:'center',marginBottom:23},selfNumber:{color:'#B8A5FF',fontSize:60,fontWeight:'900'},selfLabel:{color:'#84799B',fontSize:9,fontWeight:'900',letterSpacing:1.5},timeline:{flexDirection:'row',gap:14,paddingBottom:25},timelineDot:{width:11,height:11,borderRadius:6,backgroundColor:'#67E8C4',marginTop:4},timelineDate:{color:'#777080',fontSize:9,fontWeight:'900',letterSpacing:1},timelineAnchor:{color:'#F0EBF4',fontSize:17,lineHeight:24,fontWeight:'900',marginTop:7},timelineChoice:{color:'#948C9C',fontSize:12,lineHeight:18,marginTop:6},
  nav:{position:'absolute',left:12,right:12,bottom:10,height:76,borderRadius:25,borderWidth:1,borderColor:'#2A2531',backgroundColor:'#100F15F5',flexDirection:'row',alignItems:'center',justifyContent:'space-around'},navItem:{alignItems:'center',width:55},navIcon:{color:'#6F6877',fontSize:19},navText:{color:'#6F6877',fontSize:9,fontWeight:'800',marginTop:4},navOn:{color:'#C4B4F7'},navCore:{width:69,height:69,borderRadius:24,marginTop:-29,backgroundColor:'#7C5CFC',borderWidth:4,borderColor:'#07070D',alignItems:'center',justifyContent:'center'},coreIcon:{color:'#FFF',fontSize:22,fontWeight:'900'},coreText:{color:'#EEE8FF',fontSize:7,fontWeight:'900',marginTop:2},
});
