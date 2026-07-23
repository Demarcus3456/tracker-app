import React, { useState, useEffect } from 'react';
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
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function todayISODate() {
  const d = new Date();
  return (
    d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
  );
}

function workoutSetVolume(w) {
  let sets = 0,
    vol = 0;
  (w.exercises || []).forEach((ex) => {
    (ex.sets || []).forEach((s) => {
      sets++;
      vol += (Number(s.weight) || 0) * (Number(s.reps) || 0);
    });
  });
  return { sets, vol };
}

function lastSetsFor(bodyWorkouts, exerciseId, excludeWorkoutId) {
  const past = bodyWorkouts
    .filter((w) => w.id !== excludeWorkoutId && (w.exercises || []).some((ex) => ex.exerciseId === exerciseId))
    .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0));
  if (!past.length) return null;
  const ex = past[0].exercises.find((e) => e.exerciseId === exerciseId);
  return ex && ex.sets && ex.sets.length ? ex.sets : null;
}

export default function BodyScreen({
  bodyWorkouts,
  setBodyWorkouts,
  bodyRoutines,
  setBodyRoutines,
  bodyInventory,
  setBodyInventory,
  bodyExercises,
  setBodyExercises,
  initialSection,
}) {
  const [section, setSection] = useState('workouts'); // 'workouts' | 'routines' | 'inventory'
  useEffect(() => {
    if (initialSection) setSection(initialSection);
  }, [initialSection]);

  // --- simple item (routines / inventory) state ---
  const [itemModalOpen, setItemModalOpen] = useState(false);
  const [editingItemId, setEditingItemId] = useState(null);
  const [itemDraft, setItemDraft] = useState({ name: '', notes: '', amount: '', image: null });

  // --- workout editor state ---
  const [workoutModalOpen, setWorkoutModalOpen] = useState(false);
  const [editingWorkoutId, setEditingWorkoutId] = useState(null);
  const [workoutDraft, setWorkoutDraft] = useState(emptyWorkoutDraft());
  const [exercisePickerOpen, setExercisePickerOpen] = useState(false);
  const [exerciseQuery, setExerciseQuery] = useState('');

  function emptyWorkoutDraft() {
    return { id: makeId('bw'), title: '', date: todayISODate(), exercises: [], notes: '' };
  }

  const currentList = section === 'routines' ? bodyRoutines : section === 'inventory' ? bodyInventory : bodyWorkouts;
  const setCurrentList = section === 'routines' ? setBodyRoutines : section === 'inventory' ? setBodyInventory : setBodyWorkouts;

  // --- simple item CRUD (routines / inventory) ---
  function openItemAdd() {
    setEditingItemId(null);
    setItemDraft({ name: '', notes: '', amount: '', image: null });
    setItemModalOpen(true);
  }

  function openItemEdit(it) {
    setEditingItemId(it.id);
    setItemDraft({ name: it.name || '', notes: it.notes || '', amount: it.amount || '', image: it.image || null });
    setItemModalOpen(true);
  }

  async function pickItemImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setItemDraft((d) => ({ ...d, image: `data:image/jpeg;base64,${result.assets[0].base64}` }));
    }
  }

  function saveItem() {
    const name = itemDraft.name.trim();
    if (!name) {
      Alert.alert('Name required', 'Give this a name first.');
      return;
    }
    if (editingItemId) {
      setCurrentList((prev) =>
        prev.map((it) =>
          it.id === editingItemId
            ? { ...it, name, notes: itemDraft.notes.trim(), amount: itemDraft.amount.trim(), image: itemDraft.image, updatedAt: Date.now() }
            : it
        )
      );
    } else {
      setCurrentList((prev) => [
        ...prev,
        {
          id: makeId('bi'),
          name,
          notes: itemDraft.notes.trim(),
          amount: itemDraft.amount.trim(),
          image: itemDraft.image,
          updatedAt: Date.now(),
        },
      ]);
    }
    setItemModalOpen(false);
  }

  function deleteItem() {
    setCurrentList((prev) => prev.filter((it) => it.id !== editingItemId));
    setItemModalOpen(false);
  }

  // --- workout CRUD ---
  function openWorkoutAdd() {
    setEditingWorkoutId(null);
    setWorkoutDraft(emptyWorkoutDraft());
    setWorkoutModalOpen(true);
  }

  function openWorkoutEdit(w) {
    setEditingWorkoutId(w.id);
    setWorkoutDraft(JSON.parse(JSON.stringify(w)));
    setWorkoutModalOpen(true);
  }

  function saveWorkout() {
    if (editingWorkoutId) {
      setBodyWorkouts((prev) =>
        prev.map((w) => (w.id === editingWorkoutId ? { ...workoutDraft, updatedAt: Date.now() } : w))
      );
    } else {
      setBodyWorkouts((prev) => [...prev, { ...workoutDraft, updatedAt: Date.now() }]);
    }
    setWorkoutModalOpen(false);
  }

  function deleteWorkout() {
    setBodyWorkouts((prev) => prev.filter((w) => w.id !== editingWorkoutId));
    setWorkoutModalOpen(false);
  }

  function addExerciseToDraft(exercise) {
    setWorkoutDraft((d) => ({
      ...d,
      exercises: [...d.exercises, { exerciseId: exercise.id, name: exercise.name, sets: [{ weight: '', reps: '' }] }],
    }));
    setExercisePickerOpen(false);
    setExerciseQuery('');
  }

  function createAndAddExercise(name) {
    name = name.trim();
    if (!name) return;
    const exercise = { id: makeId('bex'), name };
    setBodyExercises((prev) => [...prev, exercise]);
    addExerciseToDraft(exercise);
  }

  function removeExercise(exi) {
    setWorkoutDraft((d) => ({ ...d, exercises: d.exercises.filter((_, i) => i !== exi) }));
  }

  function addSet(exi) {
    setWorkoutDraft((d) => {
      const exercises = d.exercises.map((ex, i) => {
        if (i !== exi) return ex;
        const prev = ex.sets[ex.sets.length - 1];
        return { ...ex, sets: [...ex.sets, { weight: prev ? prev.weight : '', reps: prev ? prev.reps : '' }] };
      });
      return { ...d, exercises };
    });
  }

  function removeSet(exi, si) {
    setWorkoutDraft((d) => {
      const exercises = d.exercises.map((ex, i) =>
        i !== exi ? ex : { ...ex, sets: ex.sets.filter((_, j) => j !== si) }
      );
      return { ...d, exercises };
    });
  }

  function updateSet(exi, si, field, value) {
    setWorkoutDraft((d) => {
      const exercises = d.exercises.map((ex, i) => {
        if (i !== exi) return ex;
        const sets = ex.sets.map((s, j) => (j !== si ? s : { ...s, [field]: value }));
        return { ...ex, sets };
      });
      return { ...d, exercises };
    });
  }

  const exerciseMatches = bodyExercises
    .filter((ex) => !exerciseQuery.trim() || ex.name.toLowerCase().includes(exerciseQuery.trim().toLowerCase()))
    .sort((a, b) => a.name.localeCompare(b.name));
  const exactMatch = bodyExercises.some((ex) => ex.name.toLowerCase() === exerciseQuery.trim().toLowerCase());

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Body</Text>

        <View style={styles.subTabRow}>
          {[
            ['workouts', 'Workouts'],
            ['routines', 'Self Care Routines'],
            ['inventory', 'Self Care Inventory'],
          ].map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[styles.subTabBtn, section === key && styles.subTabBtnSel]}
              onPress={() => setSection(key)}
            >
              <Text style={[styles.subTabText, section === key && styles.subTabTextSel]}>
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {section === 'workouts' ? (
          bodyWorkouts.length === 0 ? (
            <View style={shared.block}>
              <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
                No workouts yet
              </Text>
              <Text style={shared.tagline}>Tap + to log a workout.</Text>
            </View>
          ) : (
            [...bodyWorkouts]
              .sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.updatedAt || 0) - (a.updatedAt || 0))
              .map((w) => {
                const { sets, vol } = workoutSetVolume(w);
                const exNames = (w.exercises || []).map((ex) => ex.name).join(', ');
                return (
                  <TouchableOpacity key={w.id} style={shared.block} onPress={() => openWorkoutEdit(w)}>
                    <Text style={{ fontSize: 15, fontWeight: '700', color: INK }}>
                      {w.title || 'Workout'}
                    </Text>
                    <Text style={styles.workoutMeta}>
                      {w.date} • {(w.exercises || []).length} exercises • {sets} sets
                      {vol ? ` • ${vol.toLocaleString()} kg vol` : ''}
                    </Text>
                    {exNames ? (
                      <Text style={styles.workoutExNames} numberOfLines={1}>
                        {exNames}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })
          )
        ) : currentList.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              {section === 'routines' ? 'No routines yet' : 'Nothing here yet'}
            </Text>
            <Text style={shared.tagline}>
              {section === 'routines'
                ? 'Tap + to log a self care routine.'
                : 'Tap + to add a self care item.'}
            </Text>
          </View>
        ) : (
          <View style={shared.block}>
            {[...currentList]
              .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0))
              .map((it) => (
                <TouchableOpacity key={it.id} style={shared.row} onPress={() => openItemEdit(it)}>
                  {it.image ? <Image source={{ uri: it.image }} style={shared.thumb44} /> : null}
                  <View style={{ flex: 1, marginLeft: 8 }}>
                    <Text style={{ fontSize: 15, color: INK }}>{it.name}</Text>
                    {it.notes ? (
                      <Text style={styles.itemNotes} numberOfLines={1}>
                        {it.notes}
                      </Text>
                    ) : null}
                  </View>
                  {it.amount ? <Text style={shared.rowRight}>{it.amount}</Text> : null}
                </TouchableOpacity>
              ))}
          </View>
        )}
      </ScrollView>

      <TouchableOpacity
        style={styles.fab}
        onPress={section === 'workouts' ? openWorkoutAdd : openItemAdd}
      >
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Simple item add/edit (routines / inventory) */}
      <Modal
        visible={itemModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setItemModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingItemId ? 'Edit' : 'Add'}
              </Text>
              {itemDraft.image ? (
                <Image source={{ uri: itemDraft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickItemImage}>
                <Text style={styles.imgBtnText}>
                  {itemDraft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.name}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, name: v }))}
                placeholder="Name"
                placeholderTextColor="#9aa5b1"
              />
              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={itemDraft.notes}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />
              <Text style={styles.label}>Amount (optional)</Text>
              <TextInput
                style={styles.input}
                value={itemDraft.amount}
                onChangeText={(v) => setItemDraft((d) => ({ ...d, amount: v }))}
                placeholder="e.g. 3x/week"
                placeholderTextColor="#9aa5b1"
              />
              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>
                  {editingItemId ? 'Save Changes' : 'Add'}
                </Text>
              </TouchableOpacity>
              {editingItemId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setItemModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Workout editor */}
      <Modal
        visible={workoutModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setWorkoutModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingWorkoutId ? 'Edit Workout' : 'Log Workout'}
              </Text>
              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={workoutDraft.title}
                onChangeText={(v) => setWorkoutDraft((d) => ({ ...d, title: v }))}
                placeholder="e.g. Leg Day"
                placeholderTextColor="#9aa5b1"
              />
              <Text style={styles.label}>Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={workoutDraft.date}
                onChangeText={(v) => setWorkoutDraft((d) => ({ ...d, date: v }))}
                placeholder={todayISODate()}
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Exercises</Text>
              {workoutDraft.exercises.length === 0 ? (
                <Text style={[shared.tagline, { marginBottom: 8 }]}>
                  No exercises yet — tap + Add Exercise below.
                </Text>
              ) : (
                workoutDraft.exercises.map((ex, exi) => {
                  const lastSets = lastSetsFor(bodyWorkouts, ex.exerciseId, editingWorkoutId);
                  const lastText = lastSets
                    ? lastSets.map((s) => `${s.weight || 0}kg×${s.reps || 0}`).join(', ')
                    : null;
                  return (
                    <View key={exi} style={styles.exCard}>
                      <View style={styles.exCardHead}>
                        <Text style={styles.exCardTitle}>{ex.name}</Text>
                        <TouchableOpacity onPress={() => removeExercise(exi)}>
                          <Text style={styles.delX}>×</Text>
                        </TouchableOpacity>
                      </View>
                      {lastText ? (
                        <Text style={styles.exCardLast}>Last: {lastText}</Text>
                      ) : null}
                      {ex.sets.map((s, si) => (
                        <View key={si} style={styles.setRow}>
                          <Text style={styles.setNum}>{si + 1}</Text>
                          <TextInput
                            style={styles.setInput}
                            value={s.weight === undefined ? '' : String(s.weight)}
                            onChangeText={(v) => updateSet(exi, si, 'weight', v)}
                            placeholder="kg"
                            placeholderTextColor="#9aa5b1"
                            keyboardType="decimal-pad"
                          />
                          <TextInput
                            style={styles.setInput}
                            value={s.reps === undefined ? '' : String(s.reps)}
                            onChangeText={(v) => updateSet(exi, si, 'reps', v)}
                            placeholder="reps"
                            placeholderTextColor="#9aa5b1"
                            keyboardType="number-pad"
                          />
                          <TouchableOpacity onPress={() => removeSet(exi, si)}>
                            <Text style={styles.delX}>×</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                      <TouchableOpacity style={styles.addSetBtn} onPress={() => addSet(exi)}>
                        <Text style={styles.addSetBtnText}>+ Add Set</Text>
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
              <TouchableOpacity
                style={[styles.saveBtn, styles.saveBtnAlt]}
                onPress={() => {
                  setExerciseQuery('');
                  setExercisePickerOpen(true);
                }}
              >
                <Text style={[styles.saveBtnText, styles.saveBtnTextAlt]}>+ Add Exercise</Text>
              </TouchableOpacity>

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={workoutDraft.notes}
                onChangeText={(v) => setWorkoutDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity style={styles.saveBtn} onPress={saveWorkout}>
                <Text style={styles.saveBtnText}>Save Workout</Text>
              </TouchableOpacity>
              {editingWorkoutId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteWorkout}>
                  <Text style={styles.deleteBtnText}>Delete Workout</Text>
                </TouchableOpacity>
              ) : null}
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setWorkoutModalOpen(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Exercise picker */}
      <Modal
        visible={exercisePickerOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setExercisePickerOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>Add Exercise</Text>
            <TextInput
              style={styles.input}
              value={exerciseQuery}
              onChangeText={setExerciseQuery}
              placeholder="Search or create..."
              placeholderTextColor="#9aa5b1"
              autoFocus
            />
            {exerciseQuery.trim() && !exactMatch ? (
              <TouchableOpacity
                style={styles.createExBtn}
                onPress={() => createAndAddExercise(exerciseQuery)}
              >
                <Text style={styles.createExBtnText}>+ Create "{exerciseQuery.trim()}"</Text>
              </TouchableOpacity>
            ) : null}
            <ScrollView style={{ maxHeight: 300, marginTop: 8 }}>
              {exerciseMatches.length === 0 ? (
                <Text style={shared.tagline}>
                  {bodyExercises.length ? 'No matches.' : 'No exercises yet — create one above.'}
                </Text>
              ) : (
                exerciseMatches.map((ex) => (
                  <TouchableOpacity
                    key={ex.id}
                    style={styles.exPickRow}
                    onPress={() => addExerciseToDraft(ex)}
                  >
                    <Text style={{ fontSize: 14, color: INK }}>{ex.name}</Text>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setExercisePickerOpen(false)}>
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  subTabRow: { flexDirection: 'row', flexWrap: 'wrap', marginBottom: 16 },
  subTabBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  subTabBtnSel: { backgroundColor: GOLD, borderColor: GOLD },
  subTabText: { fontSize: 13, fontWeight: '600', color: DIM },
  subTabTextSel: { color: '#fff' },
  workoutMeta: { fontSize: 11, color: DIM, marginTop: 4 },
  workoutExNames: { fontSize: 12, color: DIM, marginTop: 4 },
  itemNotes: { fontSize: 11, color: DIM, marginTop: 2 },
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
  exCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
  },
  exCardHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  exCardTitle: { fontSize: 14, fontWeight: '700', color: INK },
  exCardLast: { fontSize: 11, color: DIM, marginTop: 2, marginBottom: 6 },
  delX: { fontSize: 20, color: DIM, paddingHorizontal: 4 },
  setRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 8 },
  setNum: { width: 18, fontSize: 12, color: DIM },
  setInput: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: INK,
    borderWidth: 1,
    borderColor: BORDER,
  },
  addSetBtn: { marginTop: 8, alignSelf: 'flex-start' },
  addSetBtnText: { color: GOLD, fontSize: 13, fontWeight: '700' },
  createExBtn: {
    backgroundColor: '#fdf3e0',
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  createExBtnText: { color: GOLD, fontWeight: '700', fontSize: 13 },
  exPickRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 20,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  saveBtnAlt: { backgroundColor: '#fff', borderWidth: 1, borderColor: GOLD, marginTop: 12 },
  saveBtnTextAlt: { color: GOLD },
  deleteBtn: { paddingVertical: 12, alignItems: 'center', marginTop: 8 },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

