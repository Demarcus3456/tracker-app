import React, { useState } from 'react';
import {
  ScrollView,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Image,
} from 'react-native';
import { shared, GOLD, ROSE } from './theme';

function todayDateKey(now) {
  return now.toISOString().split('T')[0];
}

export default function CalendarScreen({ data }) {
  const [search, setSearch] = useState('');
  const [habitDoneState, setHabitDoneState] = useState({});

  const recipeInventory = data.inventory || [];
  const cards = data.cards || [];
  const datingPlaces = data.datingPlaces || [];

  const now = new Date();
  const todayKey = todayDateKey(now);
  const dow = now.getDay();

  const dateLabel = now.toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  });

  const todayMidnight = new Date(todayKey + 'T00:00:00');
  const expiring = recipeInventory
    .filter((it) => it.expDate)
    .map((it) => {
      const daysLeft = Math.round(
        (new Date(it.expDate + 'T00:00:00') - todayMidnight) / 86400000
      );
      return { it, daysLeft };
    })
    .filter((e) => e.daysLeft <= 3)
    .sort((a, b) => a.daysLeft - b.daysLeft);

  const dayLetters = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
  function habitScheduledOn(habit, dow) {
    if (!habit.days || !habit.days.length) return true;
    return habit.days.includes(dow) || habit.days.includes(dayLetters[dow]);
  }
  function habitDoneOn(habit, dateKey, localKey) {
    if (habitDoneState[localKey]) return true;
    return !!(habit.doneDates && habit.doneDates[dateKey]);
  }

  const habitEntries = [];
  cards.forEach((card) => {
    (card.goals || []).forEach((goal) => {
      (goal.habits || []).forEach((habit) => {
        if (habitScheduledOn(habit, dow)) {
          const key = `${card.title}-${goal.text}-${habit.text}`;
          const done = habitDoneOn(habit, todayKey, key);
          habitEntries.push({ card, goal, habit, key, done });
        }
      });
    });
  });
  const pendingHabits = habitEntries.filter((e) => !e.done);
  const doneCount = habitEntries.length - pendingHabits.length;

  const toggleHabit = (key) => {
    setHabitDoneState((prev) => ({ ...prev, [key]: true }));
  };

  const HOURS_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
  function isPlaceOpenNow(place) {
    if (!place.hours || typeof place.hours !== 'object') return false;
    const key = HOURS_KEYS[now.getDay()];
    const day = place.hours[key];
    if (!day || day.closed || !day.open || !day.close) return false;
    const [oh, om] = day.open.split(':').map(Number);
    const [ch, cm] = day.close.split(':').map(Number);
    const openMins = oh * 60 + om;
    const closeMins = ch * 60 + cm;
    const nowMins = now.getHours() * 60 + now.getMinutes();
    if (closeMins > openMins) return nowMins >= openMins && nowMins < closeMins;
    return nowMins >= openMins || nowMins < closeMins;
  }

  const term = search.trim().toLowerCase();
  let placesToShow = [];
  let placesHeader = '';
  if (term) {
    placesToShow = datingPlaces.filter((p) =>
      (p.location || '').toLowerCase().includes(term)
    );
    placesHeader = `Places matching "${search.trim()}"`;
  } else {
    const openNow = datingPlaces.filter((p) => isPlaceOpenNow(p));
    const startOfDay = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate()
    ).getTime();
    const endOfDay = startOfDay + 24 * 60 * 60 * 1000;
    const scheduledToday = datingPlaces.filter((p) => {
      if (!p.dateTime) return false;
      const t = new Date(p.dateTime).getTime();
      return !isNaN(t) && t >= startOfDay && t < endOfDay;
    });
    if (openNow.length) {
      placesToShow = openNow;
      placesHeader = 'Open Right Now';
    } else if (scheduledToday.length) {
      placesToShow = scheduledToday;
      placesHeader = 'Scheduled Today';
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.container}>
      <Text style={shared.h1}>Calendar</Text>
      <Text style={shared.tagline}>
        {dateLabel} • {timeLabel}
      </Text>

      {expiring.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Expiring Soon</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>{expiring.length}</Text>
            </View>
          </View>
          {expiring.map(({ it, daysLeft }) => {
            let label, color;
            if (daysLeft < 0) {
              label = 'Expired';
              color = ROSE;
            } else if (daysLeft === 0) {
              label = 'Today';
              color = ROSE;
            } else if (daysLeft === 1) {
              label = 'Tomorrow';
              color = GOLD;
            } else {
              label = `In ${daysLeft}d`;
              color = GOLD;
            }
            return (
              <TouchableOpacity key={it.id} style={shared.row}>
                {it.image ? (
                  <Image source={{ uri: it.image }} style={shared.thumb44} />
                ) : null}
                <Text style={shared.rowName}>{it.name}</Text>
                <Text style={[shared.rowRight, { color }]}>{label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {habitEntries.length > 0 && (
        <View style={shared.block}>
          <View style={shared.blockHead}>
            <Text style={shared.blockTitle}>Today's Habits</Text>
            <View style={shared.countBadge}>
              <Text style={shared.countBadgeText}>
                {doneCount}/{habitEntries.length}
              </Text>
            </View>
          </View>
          {pendingHabits.length === 0 ? (
            <Text style={shared.tagline}>🎉 All habits done for today.</Text>
          ) : (
            pendingHabits.map((e) => (
              <TouchableOpacity
                key={e.key}
                style={shared.row}
                onPress={() => toggleHabit(e.key)}
              >
                <View
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: 6,
                    borderWidth: 2,
                    borderColor: GOLD,
                    marginRight: 10,
                  }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 15, color: '#1c2b3a', fontWeight: '500' }}>
                    {e.habit.text}
                  </Text>
                  <Text style={{ fontSize: 12, color: '#6b7684', marginTop: 2 }}>
                    {e.card.title} • {e.goal.text}
                  </Text>
                </View>
                {e.habit.time ? (
                  <Text style={{ fontSize: 12, color: '#6b7684' }}>
                    {e.habit.time}
                  </Text>
                ) : null}
              </TouchableOpacity>
            ))
          )}
        </View>
      )}

      <View style={shared.block}>
        <View style={shared.blockHead}>
          <Text style={shared.blockTitle}>Places</Text>
        </View>
        <TextInput
          style={shared.searchInput}
          placeholder="Search by location (e.g. Houston)..."
          placeholderTextColor="#9aa5b1"
          value={search}
          onChangeText={setSearch}
        />
        {placesToShow.length > 0 ? (
          <>
            <Text style={shared.catHead}>{placesHeader}</Text>
            {placesToShow.map((p) => (
              <TouchableOpacity key={p.id} style={shared.row}>
                {p.image ? (
                  <Image source={{ uri: p.image }} style={shared.thumb66} />
                ) : null}
                <Text style={shared.rowName}>{p.name}</Text>
                <Text style={shared.rowRight}>
                  {isPlaceOpenNow(p) ? 'Open' : ''}
                </Text>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <Text style={shared.tagline}>Nothing right now.</Text>
        )}
      </View>
    </ScrollView>
  );
}

