import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
  Modal,
  StyleSheet,
  Alert,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER, SWATCHES } from './theme';

const POINTS = { TASK: 5, HABIT: 3, GOAL_BONUS: 20, CARD_BONUS: 100 };
const DAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const ICON_CHOICES = ['💪','🧠','🎭','⏱️','🔥','💡','🎯','🍀','⭐','⚔️','🛡️','📚','🎨','🏃','💰','❤️','🎮','🎵','🧘','✨'];

function statAbbrev(name) {
  const clean = (name || '').trim();
  if (!clean) return '???';
  const words = clean.split(/\s+/);
  if (words.length > 1) {
    return words.map((w) => w.charAt(0)).join('').slice(0, 4).toUpperCase();
  }
  return clean.slice(0, 3).toUpperCase();
}

function statIcon(name) {
  const n = (name || '').toLowerCase();
  if (/str|power|might/.test(n)) return '💪';
  if (/mind|int|wis|knowledge/.test(n)) return '🧠';
  if (/cha|social/.test(n)) return '🎭';
  if (/end|stamina/.test(n)) return '⏱️';
  if (/vit|health|energy/.test(n)) return '🔥';
  if (/cre|art/.test(n)) return '💡';
  if (/disc|focus/.test(n)) return '🎯';
  if (/luck/.test(n)) return '🍀';
  return '⭐';
}

function statIconFor(stat) {
  return stat && stat.icon ? stat.icon : statIcon(stat ? stat.name : '');
}

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function xpForLevel(level) {
  return level * 100;
}

function todayDateKey() {
  return new Date().toISOString().split('T')[0];
}

function goalTaskProgress(goal) {
  const tasks = goal.tasks || [];
  const total = tasks.length;
  const done = tasks.filter((t) => t.done).length;
  const complete = total > 0 && done === total;
  return { total, done, complete };
}

function cardIsFullyComplete(card) {
  const goals = card.goals || [];
  if (!goals.length) return false;
  return goals.every((g) => goalTaskProgress(g).complete);
}

function cardProgress(card) {
  const goals = card.goals || [];
  const total = goals.length;
  let done = 0;
  goals.forEach((g) => {
    if (goalTaskProgress(g).complete) done++;
  });
  const pct = total ? Math.round((done / total) * 100) : 0;
  return { total, done, pct };
}

function habitDaysLabel(habit) {
  const days = (habit.days || []).slice().sort();
  if (!days.length || days.length === 7) return 'Daily';
  const set = days.join(',');
  if (set === '1,2,3,4,5') return 'Weekdays';
  if (set === '0,6') return 'Weekends';
  return days.map((d) => DAY_LETTERS[d]).join('');
}

function habitScheduledOn(habit, dow) {
  return !habit.days || !habit.days.length || habit.days.includes(dow);
}

function habitDoneOn(habit, dateKey) {
  return !!(habit.doneDates && habit.doneDates[dateKey]);
}

function habitStreak(habit) {
  let streak = 0;
  let cursor = new Date();
  let dow = cursor.getDay();
  let key = cursor.toISOString().split('T')[0];
  if (habitScheduledOn(habit, dow) && !habitDoneOn(habit, key)) {
    cursor.setDate(cursor.getDate() - 1);
  }
  for (let i = 0; i < 1000; i++) {
    dow = cursor.getDay();
    key = cursor.toISOString().split('T')[0];
    if (habitScheduledOn(habit, dow)) {
      if (habitDoneOn(habit, key)) {
        streak++;
        cursor.setDate(cursor.getDate() - 1);
      } else break;
    } else {
      cursor.setDate(cursor.getDate() - 1);
    }
  }
  return streak;
}

function habitTotalCompletions(habit) {
  return Object.keys(habit.doneDates || {}).length;
}

export default function RoadmapsScreen({
  cards,
  setCards,
  stats,
  setStats,
  level,
  setLevel,
  rewardPoints,
  setRewardPoints,
  rewardItems,
  setRewardItems,
  rewardHistory,
  setRewardHistory,
}) {
  const [view, setView] = useState('list'); // 'list' | 'card' | 'goal'
  const [currentCardId, setCurrentCardId] = useState(null);
  const [currentGoalId, setCurrentGoalId] = useState(null);
  const [goalPane, setGoalPane] = useState('tasks'); // 'tasks' | 'habits'

  const [cardModalOpen, setCardModalOpen] = useState(false);
  const [editingCardId, setEditingCardId] = useState(null);
  const [cardDraft, setCardDraft] = useState(emptyCardDraft());

  const [goalAddOpen, setGoalAddOpen] = useState(false);
  const [goalAddText, setGoalAddText] = useState('');

  const [goalSettingsOpen, setGoalSettingsOpen] = useState(false);
  const [goalSettingsDraft, setGoalSettingsDraft] = useState({ text: '', image: null });

  const [taskAddOpen, setTaskAddOpen] = useState(false);
  const [taskAddText, setTaskAddText] = useState('');

  const [habitAddOpen, setHabitAddOpen] = useState(false);
  const [habitAddText, setHabitAddText] = useState('');
  const [habitAddTime, setHabitAddTime] = useState('');
  const [habitAddDays, setHabitAddDays] = useState([]);

  const [statusOpen, setStatusOpen] = useState(false);
  const [statModalOpen, setStatModalOpen] = useState(false);
  const [editingStatId, setEditingStatId] = useState(null);
  const [statDraft, setStatDraft] = useState({ name: '', color: SWATCHES[0], icon: '' });

  const [rewardsOpen, setRewardsOpen] = useState(false);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [editingRewardId, setEditingRewardId] = useState(null);
  const [rewardDraft, setRewardDraft] = useState({ title: '', cost: '', color: SWATCHES[0] });

  function emptyCardDraft() {
    return {
      title: '',
      notes: '',
      color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)],
      statIds: [],
      image: null,
    };
  }

  const currentCard = cards.find((c) => c.id === currentCardId);
  const currentGoal = currentCard?.goals?.find((g) => g.id === currentGoalId);

  function updateCard(cardId, updater) {
    setCards((prev) =>
      prev.map((c) => (c.id === cardId ? { ...updater(c), updatedAt: Date.now() } : c))
    );
  }

  // --- Global XP / points awarding (Rewards economy comes in next pass) ---
  function applyGlobalXP(delta) {
    setLevel((prev) => {
      let lvl = prev.level;
      let xp = prev.xp + delta;
      while (xp >= xpForLevel(lvl)) {
        xp -= xpForLevel(lvl);
        lvl += 1;
        setRewardPoints((p) => Math.max(0, p + lvl * 20));
      }
      while (xp < 0 && lvl > 1) {
        lvl -= 1;
        xp += xpForLevel(lvl);
      }
      if (xp < 0) xp = 0;
      return { level: lvl, xp };
    });
  }

  function applyStatXP(statIds, delta) {
    if (!statIds || !statIds.length) return;
    setStats((prev) =>
      prev.map((s) => {
        if (!statIds.includes(s.id)) return s;
        let lvl = s.level;
        let xp = s.xp + delta;
        while (xp >= xpForLevel(lvl)) {
          xp -= xpForLevel(lvl);
          lvl += 1;
        }
        while (xp < 0 && lvl > 1) {
          lvl -= 1;
          xp += xpForLevel(lvl);
        }
        if (xp < 0) xp = 0;
        return { ...s, level: lvl, xp };
      })
    );
  }

  function statIdsForCard(card) {
    return card.statIds || (card.statId ? [card.statId] : []);
  }

  // --- Card CRUD ---
  function openCardAdd() {
    setEditingCardId(null);
    setCardDraft(emptyCardDraft());
    setCardModalOpen(true);
  }

  function openCardEdit(card) {
    setEditingCardId(card.id);
    setCardDraft({
      title: card.title,
      notes: card.notes || '',
      color: card.color || SWATCHES[0],
      statIds: statIdsForCard(card),
      image: card.image || null,
    });
    setCardModalOpen(true);
  }

  async function pickCardImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setCardDraft((d) => ({
        ...d,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  }

  function saveCard() {
    if (!cardDraft.title.trim()) {
      Alert.alert('Title required', 'Give this card a title first.');
      return;
    }
    if (editingCardId) {
      setCards((prev) =>
        prev.map((c) =>
          c.id === editingCardId
            ? {
                ...c,
                title: cardDraft.title.trim(),
                notes: cardDraft.notes.trim(),
                color: cardDraft.color,
                statIds: cardDraft.statIds,
                image: cardDraft.image,
                updatedAt: Date.now(),
              }
            : c
        )
      );
    } else {
      setCards((prev) => [
        ...prev,
        {
          id: makeId('c'),
          title: cardDraft.title.trim(),
          date: '',
          notes: cardDraft.notes.trim(),
          color: cardDraft.color,
          statIds: cardDraft.statIds,
          image: cardDraft.image,
          goals: [],
          updatedAt: Date.now(),
        },
      ]);
    }
    setCardModalOpen(false);
  }

  function deleteCard() {
    Alert.alert('Delete card?', 'This removes all its goals, tasks, and habits.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setCards((prev) => prev.filter((c) => c.id !== editingCardId));
          setCardModalOpen(false);
          if (currentCardId === editingCardId) {
            setView('list');
            setCurrentCardId(null);
          }
        },
      },
    ]);
  }

  function toggleCardStat(id) {
    setCardDraft((d) => {
      const has = d.statIds.includes(id);
      return {
        ...d,
        statIds: has ? d.statIds.filter((s) => s !== id) : [...d.statIds, id],
      };
    });
  }

  // --- Goal CRUD ---
  function saveNewGoal() {
    const text = goalAddText.trim();
    if (!text || !currentCardId) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: [...(c.goals || []), { id: makeId('g'), text, tasks: [], habits: [], image: null }],
    }));
    setGoalAddText('');
    setGoalAddOpen(false);
  }

  function openGoalSettings(goal) {
    setGoalSettingsDraft({ text: goal.text, image: goal.image || null });
    setGoalSettingsOpen(true);
  }

  async function pickGoalImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setGoalSettingsDraft((d) => ({
        ...d,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  }

  function saveGoalSettings() {
    const text = goalSettingsDraft.text.trim();
    if (!text) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId ? { ...g, text, image: goalSettingsDraft.image } : g
      ),
    }));
    setGoalSettingsOpen(false);
  }

  function deleteGoal() {
    Alert.alert('Delete goal?', 'This removes its tasks and habits.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          updateCard(currentCardId, (c) => ({
            ...c,
            goals: (c.goals || []).filter((g) => g.id !== currentGoalId),
          }));
          setGoalSettingsOpen(false);
          setView('card');
          setCurrentGoalId(null);
        },
      },
    ]);
  }

  // --- Task CRUD + points ---
  function saveNewTask() {
    const text = taskAddText.trim();
    if (!text || !currentCardId || !currentGoalId) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? { ...g, tasks: [...(g.tasks || []), { id: makeId('t'), text, done: false }] }
          : g
      ),
    }));
    setTaskAddText('');
    setTaskAddOpen(false);
  }

  function toggleTask(task) {
    const card = currentCard;
    const goal = currentGoal;
    if (!card || !goal) return;
    const wasGoalComplete = goalTaskProgress(goal).complete;
    const wasCardComplete = cardIsFullyComplete(card);
    const newDone = !task.done;

    let delta = newDone ? POINTS.TASK : -POINTS.TASK;

    const updatedGoal = {
      ...goal,
      tasks: goal.tasks.map((t) => (t.id === task.id ? { ...t, done: newDone } : t)),
    };
    const isGoalComplete = goalTaskProgress(updatedGoal).complete;
    if (!wasGoalComplete && isGoalComplete) delta += POINTS.GOAL_BONUS;
    if (wasGoalComplete && !isGoalComplete) delta -= POINTS.GOAL_BONUS;

    const updatedCard = {
      ...card,
      goals: card.goals.map((g) => (g.id === goal.id ? updatedGoal : g)),
    };
    const isCardComplete = cardIsFullyComplete(updatedCard);
    if (!wasCardComplete && isCardComplete) delta += POINTS.CARD_BONUS;
    if (wasCardComplete && !isCardComplete) delta -= POINTS.CARD_BONUS;

    setCards((prev) => prev.map((c) => (c.id === card.id ? { ...updatedCard, updatedAt: Date.now() } : c)));
    setRewardPoints((p) => Math.max(0, p + delta));
    applyGlobalXP(delta);
    applyStatXP(statIdsForCard(card), delta);
  }

  function deleteTask(taskId) {
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? { ...g, tasks: (g.tasks || []).filter((t) => t.id !== taskId) }
          : g
      ),
    }));
  }

  // --- Habit CRUD + points ---
  function toggleHabitDay(d) {
    setHabitAddDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort()
    );
  }

  function saveNewHabit() {
    const text = habitAddText.trim();
    if (!text || !currentCardId || !currentGoalId) return;
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? {
              ...g,
              habits: [
                ...(g.habits || []),
                {
                  id: makeId('h'),
                  text,
                  days: habitAddDays.slice(),
                  time: habitAddTime,
                  doneDates: {},
                },
              ],
            }
          : g
      ),
    }));
    setHabitAddText('');
    setHabitAddTime('');
    setHabitAddDays([]);
    setHabitAddOpen(false);
  }

  function toggleHabitToday(habit) {
    const card = currentCard;
    if (!card) return;
    const todayKey = todayDateKey();
    const newDone = !habitDoneOn(habit, todayKey);
    const delta = newDone ? POINTS.HABIT : -POINTS.HABIT;

    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? {
              ...g,
              habits: (g.habits || []).map((h) => {
                if (h.id !== habit.id) return h;
                const doneDates = { ...(h.doneDates || {}) };
                if (newDone) doneDates[todayKey] = true;
                else delete doneDates[todayKey];
                return { ...h, doneDates };
              }),
            }
          : g
      ),
    }));
    setRewardPoints((p) => Math.max(0, p + delta));
    applyGlobalXP(delta);
    applyStatXP(statIdsForCard(card), delta);
  }

  function deleteHabit(habitId) {
    updateCard(currentCardId, (c) => ({
      ...c,
      goals: (c.goals || []).map((g) =>
        g.id === currentGoalId
          ? { ...g, habits: (g.habits || []).filter((h) => h.id !== habitId) }
          : g
      ),
    }));
  }

  // --- Stat CRUD ---
  function openStatAdd() {
    setEditingStatId(null);
    setStatDraft({ name: '', color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)], icon: '' });
    setStatModalOpen(true);
  }

  function openStatEdit(stat) {
    setEditingStatId(stat.id);
    setStatDraft({ name: stat.name, color: stat.color, icon: stat.icon || '' });
    setStatModalOpen(true);
  }

  function saveStat() {
    const name = statDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this stat a name.');
      return;
    }
    if (editingStatId) {
      setStats((prev) =>
        prev.map((s) =>
          s.id === editingStatId
            ? { ...s, name, color: statDraft.color, icon: statDraft.icon }
            : s
        )
      );
    } else {
      setStats((prev) => [
        ...prev,
        { id: makeId('st'), name, color: statDraft.color, icon: statDraft.icon, level: 1, xp: 0 },
      ]);
    }
    setStatModalOpen(false);
  }

  function deleteStat() {
    const inUse = cards.some((c) => statIdsForCard(c).includes(editingStatId));
    const doDelete = () => {
      setStats((prev) => prev.filter((s) => s.id !== editingStatId));
      if (inUse) {
        setCards((prev) =>
          prev.map((c) => ({
            ...c,
            statIds: statIdsForCard(c).filter((id) => id !== editingStatId),
          }))
        );
      }
      setStatModalOpen(false);
    };
    if (inUse) {
      Alert.alert(
        'Stat is in use',
        'Some cards use this stat. Remove it anyway? They will be left unassigned.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doDelete },
        ]
      );
    } else {
      doDelete();
    }
  }

  // --- Reward CRUD ---
  function openRewardAdd() {
    setEditingRewardId(null);
    setRewardDraft({ title: '', cost: '', color: SWATCHES[Math.floor(Math.random() * SWATCHES.length)] });
    setRewardModalOpen(true);
  }

  function openRewardEdit(item) {
    setEditingRewardId(item.id);
    setRewardDraft({ title: item.title, cost: String(item.cost), color: item.color });
    setRewardModalOpen(true);
  }

  function saveReward() {
    const title = rewardDraft.title.trim();
    const cost = Math.max(0, Number(rewardDraft.cost) || 0);
    if (!title) {
      Alert.alert('Title required', 'Give this reward a title.');
      return;
    }
    if (editingRewardId) {
      setRewardItems((prev) =>
        prev.map((r) =>
          r.id === editingRewardId ? { ...r, title, cost, color: rewardDraft.color } : r
        )
      );
    } else {
      setRewardItems((prev) => [...prev, { id: makeId('rw'), title, cost, color: rewardDraft.color }]);
    }
    setRewardModalOpen(false);
  }

  function deleteReward() {
    setRewardItems((prev) => prev.filter((r) => r.id !== editingRewardId));
    setRewardModalOpen(false);
  }

  function redeemReward(item) {
    if (rewardPoints < item.cost) return;
    Alert.alert('Redeem reward?', `Redeem "${item.title}" for ${item.cost} points?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Redeem',
        onPress: () => {
          setRewardPoints((p) => p - item.cost);
          setRewardHistory((prev) => [
            { id: makeId('rh'), title: item.title, cost: item.cost, redeemedAt: Date.now() },
            ...prev,
          ]);
        },
      },
    ]);
  }

  const levelPct = Math.min(100, Math.round((level.xp / xpForLevel(level.level)) * 100));

  // ===================== LIST VIEW =====================
  if (view === 'list') {
    return (
      <View style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={shared.container}>
          <Text style={shared.h1}>Roadmaps</Text>
          <Text style={shared.tagline}>Quests you're working toward</Text>

          <TouchableOpacity style={styles.plaque} onPress={() => setStatusOpen(true)}>
            <View style={styles.plaqueTop}>
              <View style={styles.plaqueBadge}>
                <Text style={styles.plaqueBadgeText}>{level.level}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.plaqueTitle}>Level {level.level}</Text>
                <Text style={styles.plaqueSub}>Tap to view your status</Text>
              </View>
            </View>
            <View style={styles.plaqueBar}>
              <View style={[styles.plaqueFill, { width: `${levelPct}%` }]} />
            </View>
            <View style={styles.plaqueLabelRow}>
              <Text style={styles.plaqueLabel}>{level.xp} XP</Text>
              <Text style={styles.plaqueLabel}>
                {xpForLevel(level.level)} XP to next level
              </Text>
            </View>
          </TouchableOpacity>

          {cards.length === 0 ? (
            <View style={shared.block}>
              <Text style={shared.tagline}>
                No roadmap cards yet. Tap + to start one.
              </Text>
            </View>
          ) : (
            cards.map((card) => {
              const prog = cardProgress(card);
              return (
                <TouchableOpacity
                  key={card.id}
                  style={[styles.cardRow, { borderLeftColor: card.color || GOLD }]}
                  onPress={() => {
                    setCurrentCardId(card.id);
                    setView('card');
                  }}
                  onLongPress={() => openCardEdit(card)}
                  delayLongPress={400}
                >
                  {card.image ? (
                    <Image source={{ uri: card.image }} style={styles.cardImg} />
                  ) : (
                    <View
                      style={[styles.cardImg, styles.cardImgPlaceholder, { backgroundColor: card.color || GOLD }]}
                    >
                      <Text style={styles.cardImgLetter}>
                        {(card.title || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.cardTitle}>{card.title}</Text>
                    <View style={styles.barTrack}>
                      <View
                        style={[
                          styles.barFill,
                          { width: `${prog.pct}%`, backgroundColor: card.color || GOLD },
                        ]}
                      />
                    </View>
                    <Text style={styles.cardMeta}>
                      {prog.pct}% complete • {prog.done}/{prog.total} goals
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity style={styles.fab} onPress={openCardAdd}>
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderCardModal()}
        {renderStatusModal()}
        {renderStatModal()}
        {renderRewardsModal()}
        {renderRewardModal()}
      </View>
    );
  }

  // ===================== CARD DETAIL VIEW =====================
  if (view === 'card' && currentCard) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => { setView('list'); setCurrentCardId(null); }}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openCardEdit(currentCard)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <ScrollView contentContainerStyle={shared.container}>
          <Text style={shared.h1}>{currentCard.title}</Text>
          {currentCard.notes ? (
            <Text style={shared.tagline}>{currentCard.notes}</Text>
          ) : null}

          {(currentCard.goals || []).length === 0 ? (
            <View style={shared.block}>
              <Text style={shared.tagline}>No goals yet — tap + to add one.</Text>
            </View>
          ) : (
            (currentCard.goals || []).map((goal) => {
              const gp = goalTaskProgress(goal);
              return (
                <TouchableOpacity
                  key={goal.id}
                  style={shared.row}
                  onPress={() => {
                    setCurrentGoalId(goal.id);
                    setGoalPane('tasks');
                    setView('goal');
                  }}
                >
                  {goal.image ? (
                    <Image source={{ uri: goal.image }} style={shared.thumb44} />
                  ) : null}
                  <Text style={shared.rowName}>
                    {gp.complete ? '✅ ' : ''}
                    {goal.text}
                  </Text>
                  <Text style={shared.rowRight}>
                    {gp.done}/{gp.total}
                  </Text>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            setGoalAddText('');
            setGoalAddOpen(true);
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderGoalAddModal()}
        {renderCardModal()}
      </View>
    );
  }

  // ===================== GOAL DETAIL VIEW =====================
  if (view === 'goal' && currentCard && currentGoal) {
    return (
      <View style={{ flex: 1 }}>
        <View style={styles.subHeader}>
          <TouchableOpacity onPress={() => { setView('card'); setCurrentGoalId(null); }}>
            <Text style={styles.backLink}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => openGoalSettings(currentGoal)}>
            <Text style={styles.editLink}>Edit</Text>
          </TouchableOpacity>
        </View>
        <View style={{ paddingHorizontal: 16, paddingTop: 12 }}>
          <Text style={shared.h1}>{currentGoal.text}</Text>
        </View>

        <View style={styles.paneTabRow}>
          <TouchableOpacity
            style={[styles.paneTab, goalPane === 'tasks' && styles.paneTabSel]}
            onPress={() => setGoalPane('tasks')}
          >
            <Text style={[styles.paneTabText, goalPane === 'tasks' && styles.paneTabTextSel]}>
              Tasks
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.paneTab, goalPane === 'habits' && styles.paneTabSel]}
            onPress={() => setGoalPane('habits')}
          >
            <Text style={[styles.paneTabText, goalPane === 'habits' && styles.paneTabTextSel]}>
              Habits
            </Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={shared.container}>
          {goalPane === 'tasks' ? (
            (currentGoal.tasks || []).length === 0 ? (
              <Text style={shared.tagline}>No tasks yet — tap the + button to add one.</Text>
            ) : (
              (currentGoal.tasks || []).map((task) => (
                <View key={task.id} style={styles.editRow}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                    onPress={() => toggleTask(task)}
                  >
                    <View style={[styles.checkbox, task.done && styles.checkboxDone]}>
                      {task.done ? <Text style={styles.checkMark}>✓</Text> : null}
                    </View>
                    <Text
                      style={[styles.editRowText, task.done && styles.editRowTextDone]}
                    >
                      {task.text}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteTask(task.id)}>
                    <Text style={styles.delX}>×</Text>
                  </TouchableOpacity>
                </View>
              ))
            )
          ) : (currentGoal.habits || []).length === 0 ? (
            <Text style={shared.tagline}>No habits yet — tap the + button to add one.</Text>
          ) : (
            (currentGoal.habits || []).map((habit) => {
              const streak = habitStreak(habit);
              const total = habitTotalCompletions(habit);
              const streakBit =
                streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}` : `${total} logged`;
              const doneToday = habitDoneOn(habit, todayDateKey());
              const scheduledToday = habitScheduledOn(habit, new Date().getDay());
              return (
                <View key={habit.id} style={styles.editRow}>
                  {scheduledToday ? (
                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                      onPress={() => toggleHabitToday(habit)}
                    >
                      <View style={[styles.checkbox, doneToday && styles.checkboxDone]}>
                        {doneToday ? <Text style={styles.checkMark}>✓</Text> : null}
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.editRowText}>{habit.text}</Text>
                        <Text style={styles.habitMeta}>
                          {habitDaysLabel(habit)}
                          {habit.time ? ` • ${habit.time}` : ''} • {streakBit}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : (
                    <View style={{ flex: 1 }}>
                      <Text style={styles.editRowText}>{habit.text}</Text>
                      <Text style={styles.habitMeta}>
                        {habitDaysLabel(habit)}
                        {habit.time ? ` • ${habit.time}` : ''} • {streakBit}
                      </Text>
                    </View>
                  )}
                  <TouchableOpacity onPress={() => deleteHabit(habit.id)}>
                    <Text style={styles.delX}>×</Text>
                  </TouchableOpacity>
                </View>
              );
            })
          )}
        </ScrollView>

        <TouchableOpacity
          style={styles.fab}
          onPress={() => {
            if (goalPane === 'tasks') {
              setTaskAddText('');
              setTaskAddOpen(true);
            } else {
              setHabitAddText('');
              setHabitAddTime('');
              setHabitAddDays([]);
              setHabitAddOpen(true);
            }
          }}
        >
          <Text style={styles.fabText}>+</Text>
        </TouchableOpacity>

        {renderTaskAddModal()}
        {renderHabitAddModal()}
        {renderGoalSettingsModal()}
      </View>
    );
  }

  return null;

  // ===================== MODALS =====================
  function renderCardModal() {
    return (
      <Modal
        visible={cardModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingCardId ? 'Edit Card' : 'Add Card'}
              </Text>

              {cardDraft.image ? (
                <Image source={{ uri: cardDraft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickCardImage}>
                <Text style={styles.imgBtnText}>
                  {cardDraft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={cardDraft.title}
                onChangeText={(v) => setCardDraft((d) => ({ ...d, title: v }))}
                placeholder="e.g. Robotics"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={styles.input}
                value={cardDraft.notes}
                onChangeText={(v) => setCardDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {SWATCHES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      cardDraft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setCardDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>

              <Text style={styles.label}>Linked Stats (XP goes here when you complete things)</Text>
              <View style={styles.catRow}>
                {stats.map((s) => (
                  <TouchableOpacity
                    key={s.id}
                    style={[
                      styles.catChip,
                      cardDraft.statIds.includes(s.id) && { backgroundColor: s.color },
                    ]}
                    onPress={() => toggleCardStat(s.id)}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        cardDraft.statIds.includes(s.id) && styles.catChipTextSel,
                      ]}
                    >
                      {s.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveCard}>
                <Text style={styles.saveBtnText}>
                  {editingCardId ? 'Save Changes' : 'Add Card'}
                </Text>
              </TouchableOpacity>
              {editingCardId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteCard}>
                  <Text style={styles.deleteBtnText}>Delete Card</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCardModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderGoalAddModal() {
    return (
      <Modal
        visible={goalAddOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Goal</Text>
            <TextInput
              style={styles.input}
              value={goalAddText}
              onChangeText={setGoalAddText}
              placeholder="Goal name"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewGoal}>
              <Text style={styles.saveBtnText}>Add Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderGoalSettingsModal() {
    return (
      <Modal
        visible={goalSettingsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setGoalSettingsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Edit Goal</Text>
            {goalSettingsDraft.image ? (
              <Image source={{ uri: goalSettingsDraft.image }} style={styles.imgPreview} />
            ) : null}
            <TouchableOpacity style={styles.imgBtn} onPress={pickGoalImage}>
              <Text style={styles.imgBtnText}>
                {goalSettingsDraft.image ? 'Change Photo' : 'Add Photo'}
              </Text>
            </TouchableOpacity>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={goalSettingsDraft.text}
              onChangeText={(v) => setGoalSettingsDraft((d) => ({ ...d, text: v }))}
              placeholder="Goal name"
              placeholderTextColor="#9aa5b1"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveGoalSettings}>
              <Text style={styles.saveBtnText}>Save Changes</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.deleteBtn} onPress={deleteGoal}>
              <Text style={styles.deleteBtnText}>Delete Goal</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setGoalSettingsOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderTaskAddModal() {
    return (
      <Modal
        visible={taskAddOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setTaskAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Task</Text>
            <TextInput
              style={styles.input}
              value={taskAddText}
              onChangeText={setTaskAddText}
              placeholder="Task"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewTask}>
              <Text style={styles.saveBtnText}>Add Task</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setTaskAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderHabitAddModal() {
    return (
      <Modal
        visible={habitAddOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setHabitAddOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Habit</Text>
            <TextInput
              style={styles.input}
              value={habitAddText}
              onChangeText={setHabitAddText}
              placeholder="Habit"
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            <Text style={styles.label}>Days (leave empty for daily)</Text>
            <View style={styles.dayRow}>
              {DAY_LETTERS.map((letter, i) => (
                <TouchableOpacity
                  key={i}
                  style={[styles.dayChip, habitAddDays.includes(i) && styles.dayChipSel]}
                  onPress={() => toggleHabitDay(i)}
                >
                  <Text
                    style={[
                      styles.dayChipText,
                      habitAddDays.includes(i) && styles.dayChipTextSel,
                    ]}
                  >
                    {letter}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <Text style={styles.label}>Time (optional)</Text>
            <TextInput
              style={styles.input}
              value={habitAddTime}
              onChangeText={setHabitAddTime}
              placeholder="e.g. 07:00"
              placeholderTextColor="#9aa5b1"
            />
            <TouchableOpacity style={styles.saveBtn} onPress={saveNewHabit}>
              <Text style={styles.saveBtnText}>Add Habit</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setHabitAddOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }

  function renderStatusModal() {
    return (
      <Modal
        visible={statusOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStatusOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <View style={styles.plaqueTop}>
                <View style={styles.plaqueBadgeLight}>
                  <Text style={styles.plaqueBadgeTextLight}>{level.level}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.sheetTitle}>Level {level.level}</Text>
                  <Text style={{ color: DIM, fontSize: 12, marginTop: -8 }}>
                    Overall progress
                  </Text>
                </View>
              </View>
              <View style={styles.barTrack}>
                <View style={[styles.barFill, { width: `${levelPct}%`, backgroundColor: GOLD }]} />
              </View>
              <View style={styles.plaqueLabelRow}>
                <Text style={{ color: DIM, fontSize: 11 }}>{level.xp} XP</Text>
                <Text style={{ color: DIM, fontSize: 11 }}>
                  {xpForLevel(level.level)} XP to next level
                </Text>
              </View>

              <View style={{ marginTop: 20 }}>
                {stats.length === 0 ? (
                  <Text style={shared.tagline}>No stats yet. Tap Settings to add one.</Text>
                ) : (
                  stats.map((s) => {
                    const sNeeded = xpForLevel(s.level);
                    const sPct = Math.min(100, Math.round((s.xp / sNeeded) * 100));
                    return (
                      <TouchableOpacity
                        key={s.id}
                        style={styles.attrRow}
                        onPress={() => openStatEdit(s)}
                      >
                        <View style={styles.attrTopRow}>
                          <Text style={styles.attrIcon}>{statIconFor(s)}</Text>
                          <Text style={styles.attrName}>{statAbbrev(s.name)}</Text>
                          <Text style={styles.attrLv}>LV{s.level}</Text>
                        </View>
                        <View style={styles.attrMidRow}>
                          <Text style={[styles.attrPct, { color: s.color }]}>{sPct}%</Text>
                          <View style={styles.barTrack}>
                            <View
                              style={[
                                styles.barFill,
                                { width: `${sPct}%`, backgroundColor: s.color },
                              ]}
                            />
                          </View>
                        </View>
                        <View style={styles.plaqueLabelRow}>
                          <Text style={{ color: DIM, fontSize: 11 }}>UP {sNeeded}</Text>
                          <Text style={{ color: DIM, fontSize: 11 }}>
                            {s.xp}/{sNeeded}
                          </Text>
                        </View>
                      </TouchableOpacity>
                    );
                  })
                )}
              </View>

              <TouchableOpacity
                style={styles.saveBtn}
                onPress={() => {
                  setStatusOpen(false);
                  setRewardsOpen(true);
                }}
              >
                <Text style={styles.saveBtnText}>Level Rewards ({rewardPoints} pts)</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveBtnAlt]}
                onPress={openStatAdd}
              >
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>
                  + Add / Manage Stats
                </Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setStatusOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderStatModal() {
    return (
      <Modal
        visible={statModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setStatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingStatId ? 'Edit Stat' : 'Add Stat'}
              </Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={statDraft.name}
                onChangeText={(v) => setStatDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Mind"
                placeholderTextColor="#9aa5b1"
              />
              <Text style={styles.label}>Icon</Text>
              <View style={styles.catRow}>
                {ICON_CHOICES.map((ic) => (
                  <TouchableOpacity
                    key={ic}
                    style={[
                      styles.iconBtn,
                      (statDraft.icon || statIcon(statDraft.name)) === ic && styles.iconBtnSel,
                    ]}
                    onPress={() => setStatDraft((d) => ({ ...d, icon: ic }))}
                  >
                    <Text style={{ fontSize: 18 }}>{ic}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {SWATCHES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      statDraft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setStatDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={saveStat}>
                <Text style={styles.saveBtnText}>
                  {editingStatId ? 'Save Changes' : 'Add Stat'}
                </Text>
              </TouchableOpacity>
              {editingStatId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteStat}>
                  <Text style={styles.deleteBtnText}>Remove Stat</Text>
                </TouchableOpacity>
              ) : null}

              {stats.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>All Stats</Text>
                  {stats.map((s) => (
                    <TouchableOpacity
                      key={s.id}
                      style={styles.manageRow}
                      onPress={() => openStatEdit(s)}
                    >
                      <View style={[styles.manageDot, { backgroundColor: s.color }]} />
                      <Text style={styles.manageText}>
                        {s.name} <Text style={{ color: DIM }}>Lv{s.level}</Text>
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setStatModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRewardsModal() {
    const sorted = [...rewardItems].sort((a, b) => a.cost - b.cost);
    return (
      <Modal
        visible={rewardsOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRewardsOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView>
              <Text style={styles.sheetTitle}>Rewards</Text>
              <Text style={[shared.tagline, { marginTop: -8, marginBottom: 12 }]}>
                {rewardPoints} points available
              </Text>

              {sorted.length === 0 ? (
                <Text style={shared.tagline}>
                  No rewards yet. Tap + to set up something you can redeem points for.
                </Text>
              ) : (
                sorted.map((r) => (
                  <TouchableOpacity
                    key={r.id}
                    style={[styles.rewardRow, { borderLeftColor: r.color }]}
                    onPress={() => openRewardEdit(r)}
                  >
                    <Text style={styles.rewardTitle}>{r.title}</Text>
                    <Text style={styles.rewardCost}>{r.cost} pts</Text>
                    <TouchableOpacity
                      style={[
                        styles.redeemBtn,
                        rewardPoints < r.cost && styles.redeemBtnDisabled,
                      ]}
                      disabled={rewardPoints < r.cost}
                      onPress={(e) => {
                        e.stopPropagation();
                        redeemReward(r);
                      }}
                    >
                      <Text style={styles.redeemBtnText}>Redeem</Text>
                    </TouchableOpacity>
                  </TouchableOpacity>
                ))
              )}

              <TouchableOpacity style={[styles.saveBtn, styles.saveBtnAlt]} onPress={openRewardAdd}>
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>+ Add Reward</Text>
              </TouchableOpacity>

              {rewardHistory.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>Redeemed</Text>
                  {rewardHistory.slice(0, 15).map((h) => (
                    <View key={h.id} style={styles.historyRow}>
                      <Text style={styles.manageText}>{h.title}</Text>
                      <Text style={{ color: ROSE, fontSize: 12, fontWeight: '700' }}>
                        -{h.cost} pts
                      </Text>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity style={styles.cancelBtn} onPress={() => setRewardsOpen(false)}>
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    );
  }

  function renderRewardModal() {
    return (
      <Modal
        visible={rewardModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setRewardModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>
              {editingRewardId ? 'Edit Reward' : 'Add Reward'}
            </Text>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={rewardDraft.title}
              onChangeText={(v) => setRewardDraft((d) => ({ ...d, title: v }))}
              placeholder="e.g. New game"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Cost (points)</Text>
            <TextInput
              style={styles.input}
              value={rewardDraft.cost}
              onChangeText={(v) => setRewardDraft((d) => ({ ...d, cost: v }))}
              placeholder="e.g. 200"
              placeholderTextColor="#9aa5b1"
              keyboardType="numeric"
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {SWATCHES.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    rewardDraft.color === c && styles.colorDotSel,
                  ]}
                  onPress={() => setRewardDraft((d) => ({ ...d, color: c }))}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveReward}>
              <Text style={styles.saveBtnText}>
                {editingRewardId ? 'Save Changes' : 'Add Reward'}
              </Text>
            </TouchableOpacity>
            {editingRewardId ? (
              <TouchableOpacity style={styles.deleteBtn} onPress={deleteReward}>
                <Text style={styles.deleteBtnText}>Delete Reward</Text>
              </TouchableOpacity>
            ) : null}
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setRewardModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    );
  }
}

const styles = StyleSheet.create({
  plaque: {
    backgroundColor: '#1c2b3a',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  plaqueTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  plaqueBadge: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plaqueBadgeText: { color: '#1c2b3a', fontSize: 20, fontWeight: '800' },
  plaqueTitle: { color: '#fff', fontSize: 17, fontWeight: '700' },
  plaqueSub: { color: '#a9b6c4', fontSize: 12, marginTop: 2 },
  plaqueBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#33475a',
    overflow: 'hidden',
  },
  plaqueFill: { height: 8, borderRadius: 4, backgroundColor: GOLD },
  plaqueLabelRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  plaqueLabel: { color: '#a9b6c4', fontSize: 11 },
  cardRow: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  cardImg: { width: 56, height: 56, borderRadius: 12 },
  cardImgPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  cardImgLetter: { color: '#fff', fontSize: 22, fontWeight: '700' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: INK, marginBottom: 6 },
  cardMeta: { fontSize: 11, color: DIM, marginTop: 4 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e9edf2', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  fabText: { color: '#fff', fontSize: 30, fontWeight: '400', marginTop: -2 },
  subHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 14,
  },
  backLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  editLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  paneTabRow: { flexDirection: 'row', paddingHorizontal: 16, marginTop: 14, marginBottom: 4 },
  paneTab: {
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 18,
    backgroundColor: '#fff',
    marginRight: 10,
    borderWidth: 1,
    borderColor: BORDER,
  },
  paneTabSel: { backgroundColor: GOLD, borderColor: GOLD },
  paneTabText: { fontSize: 13, fontWeight: '600', color: DIM },
  paneTabTextSel: { color: '#fff' },
  editRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: CARD,
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: GOLD,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: { backgroundColor: GOLD },
  checkMark: { color: '#fff', fontSize: 13, fontWeight: '700' },
  editRowText: { fontSize: 14, color: INK, flex: 1 },
  editRowTextDone: { color: DIM, textDecorationLine: 'line-through' },
  habitMeta: { fontSize: 11, color: DIM, marginTop: 2 },
  delX: { fontSize: 22, color: DIM, paddingHorizontal: 6 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: CARD,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '90%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f2f5f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  imgPreview: { width: '100%', height: 160, borderRadius: 12, marginBottom: 10 },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  colorRow: { flexDirection: 'row', flexWrap: 'wrap' },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10 },
  colorDotSel: { borderWidth: 3, borderColor: INK },
  catRow: { flexDirection: 'row', flexWrap: 'wrap' },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f2f5f8',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
  dayRow: { flexDirection: 'row', justifyContent: 'space-between' },
  dayChip: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f2f5f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayChipSel: { backgroundColor: GOLD },
  dayChipText: { fontSize: 13, fontWeight: '700', color: INK },
  dayChipTextSel: { color: '#fff' },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
  plaqueBadgeLight: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GOLD,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  plaqueBadgeTextLight: { color: '#fff', fontSize: 20, fontWeight: '800' },
  attrRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  attrTopRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  attrIcon: { fontSize: 16, marginRight: 8 },
  attrName: { flex: 1, fontSize: 13, fontWeight: '700', color: INK },
  attrLv: { fontSize: 12, color: DIM, fontWeight: '600' },
  attrMidRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  attrPct: { fontSize: 12, fontWeight: '700', width: 40 },
  saveBtnAlt: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: GOLD,
  },
  saveBtnTextAlt: { color: GOLD },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: '#f2f5f8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    marginBottom: 8,
  },
  iconBtnSel: { backgroundColor: '#fdf3e0', borderWidth: 2, borderColor: GOLD },
  manageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  manageDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  manageText: { fontSize: 14, color: INK },
  rewardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderLeftWidth: 4,
  },
  rewardTitle: { flex: 1, fontSize: 14, fontWeight: '600', color: INK },
  rewardCost: { fontSize: 12, color: DIM, marginRight: 10 },
  redeemBtn: {
    backgroundColor: GOLD,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  redeemBtnDisabled: { backgroundColor: '#ccc' },
  redeemBtnText: { color: '#fff', fontSize: 12, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
});

