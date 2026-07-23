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
  Linking,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const EPISODIC_LABELS = ['anime', 'tv series', 'tv show', 'tv'];

function isEpisodicCategory(categories, catId) {
  if (catId === 'anime') return true;
  const cat = categories.find((c) => c.id === catId);
  if (!cat) return false;
  return EPISODIC_LABELS.includes((cat.label || '').trim().toLowerCase());
}

function catLabel(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.label : 'Other';
}

function catColor(categories, id) {
  const c = categories.find((c) => c.id === id);
  return c ? c.color : '#8a8474';
}

function getYouTubeId(url) {
  try {
    const u = new URL(url);
    const host = u.hostname.replace('www.', '');
    if (host === 'youtu.be') return u.pathname.slice(1);
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      if (u.pathname === '/watch') return u.searchParams.get('v');
      if (u.pathname.startsWith('/embed/')) return u.pathname.split('/')[2];
      if (u.pathname.startsWith('/shorts/')) return u.pathname.split('/')[2];
    }
  } catch (e) {}
  return null;
}

function formatReleaseDate(val) {
  if (!val) return '';
  const d = new Date(val + 'T00:00:00');
  if (isNaN(d.getTime())) return val;
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

const CAT_COLORS = [
  '#b8705c',
  '#3f8f82',
  '#9a5c8f',
  '#4a7ba6',
  '#bc9440',
  '#5b7b8b',
  '#7b6ca6',
  '#6b8e5a',
];

export default function TrackerScreen({ items, setItems, categories, setCategories, initialFilter }) {
  const [activeFilter, setActiveFilter] = useState('all');
  useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter);
  }, [initialFilter]);
  const [search, setSearch] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [epModalId, setEpModalId] = useState(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catDraft, setCatDraft] = useState({ label: '', color: CAT_COLORS[0] });

  function emptyDraft() {
    return {
      title: '',
      category: categories[0]?.id || '',
      notes: '',
      status: '',
      releaseDate: '',
      mediaUrl: '',
      epCurrent: '',
      epTotal: '',
      gamePercent: '',
      image: null,
    };
  }

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      title: item.title || '',
      category: item.category || categories[0]?.id || '',
      notes: item.notes || '',
      status: item.status || '',
      releaseDate: item.releaseDate || '',
      mediaUrl: item.mediaUrl || '',
      epCurrent: item.epCurrent ? String(item.epCurrent) : '',
      epTotal: item.epTotal ? String(item.epTotal) : '',
      gamePercent: item.gamePercent ? String(item.gamePercent) : '',
      image: item.image || null,
    });
    setModalOpen(true);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Photo library access is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled && result.assets && result.assets[0]) {
      setDraft((d) => ({
        ...d,
        image: `data:image/jpeg;base64,${result.assets[0].base64}`,
      }));
    }
  }

  function saveItem() {
    if (!draft.title.trim()) {
      Alert.alert('Title required', 'Give this a title first.');
      return;
    }
    const item = {
      id: editingId || makeId('i'),
      title: draft.title.trim(),
      category: draft.category,
      notes: draft.notes.trim(),
      status: draft.status,
      releaseDate: draft.status === 'coming_soon' ? draft.releaseDate.trim() : '',
      mediaUrl: draft.mediaUrl.trim(),
      epCurrent: Number(draft.epCurrent) || 0,
      epTotal: Number(draft.epTotal) || 0,
      gamePercent: Math.max(0, Math.min(100, Number(draft.gamePercent) || 0)),
      image: draft.image,
      updatedAt: Date.now(),
    };
    if (editingId) {
      setItems((prev) => prev.map((it) => (it.id === editingId ? item : it)));
    } else {
      setItems((prev) => [...prev, item]);
    }
    setModalOpen(false);
  }

  function deleteItem() {
    Alert.alert('Delete this?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setItems((prev) => prev.filter((it) => it.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  function saveCategory() {
    if (!catDraft.label.trim()) {
      Alert.alert('Name required', 'Give this category a name.');
      return;
    }
    setCategories((prev) => [
      ...prev,
      { id: makeId('t'), label: catDraft.label.trim(), color: catDraft.color },
    ]);
    setCatDraft({ label: '', color: CAT_COLORS[0] });
    setCatModalOpen(false);
  }

  // On load, auto-clear "Coming Soon" for anything whose release date
  // has already passed — matches the web app's checkComingSoonReleases().
  useEffect(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    const anyChanged = items.some(
      (i) =>
        i.status === 'coming_soon' &&
        i.releaseDate &&
        /^\d{4}-\d{2}-\d{2}$/.test(i.releaseDate) &&
        i.releaseDate <= todayStr
    );
    if (anyChanged) {
      setItems((prev) =>
        prev.map((i) =>
          i.status === 'coming_soon' &&
          i.releaseDate &&
          /^\d{4}-\d{2}-\d{2}$/.test(i.releaseDate) &&
          i.releaseDate <= todayStr
            ? { ...i, status: '' }
            : i
        )
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function promptItemCompletion(item) {
    setTimeout(() => {
      Alert.alert(
        'Nice!',
        `You finished "${item.title}"! Remove it from your tracker?`,
        [
          { text: 'Keep it', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: () => {
              setItems((prev) => prev.filter((it) => it.id !== item.id));
            },
          },
        ]
      );
    }, 250);
  }

  function adjustEpisode(item, delta) {
    const wasComplete =
      item.epTotal > 0 && (Number(item.epCurrent) || 0) >= item.epTotal;
    let next = (Number(item.epCurrent) || 0) + delta;
    if (next < 0) next = 0;
    if (item.epTotal > 0 && next > item.epTotal) next = item.epTotal;
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, epCurrent: next } : it))
    );
    if (!wasComplete && item.epTotal > 0 && next >= item.epTotal) {
      promptItemCompletion({ ...item, epCurrent: next });
    }
  }

  function adjustGamePercent(item, delta) {
    const wasComplete = (Number(item.gamePercent) || 0) >= 100;
    let next = (Number(item.gamePercent) || 0) + delta;
    next = Math.max(0, Math.min(100, next));
    setItems((prev) =>
      prev.map((it) => (it.id === item.id ? { ...it, gamePercent: next } : it))
    );
    if (!wasComplete && next >= 100) {
      promptItemCompletion({ ...item, gamePercent: next });
    }
  }

  const counts = {};
  items.forEach((i) => {
    counts[i.category] = (counts[i.category] || 0) + 1;
  });
  const comingSoonCount = items.filter((i) => i.status === 'coming_soon').length;

  let filtered = items.filter((i) => {
    if (activeFilter === 'all') return true;
    if (activeFilter === 'coming_soon') return i.status === 'coming_soon';
    return i.category === activeFilter;
  });
  if (search.trim()) {
    const t = search.trim().toLowerCase();
    filtered = filtered.filter((i) => i.title.toLowerCase().includes(t));
  }
  filtered = [...filtered].sort((a, b) => {
    const aCS = a.status === 'coming_soon' ? 1 : 0;
    const bCS = b.status === 'coming_soon' ? 1 : 0;
    if (aCS !== bCS) return aCS - bCS;
    return (b.updatedAt || 0) - (a.updatedAt || 0);
  });

  const epItem = items.find((i) => i.id === epModalId);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Tracker</Text>
        <Text style={shared.tagline}>Shows, games, and movies</Text>

        <TextInput
          style={shared.searchInput}
          placeholder="Search titles..."
          placeholderTextColor="#9aa5b1"
          value={search}
          onChangeText={setSearch}
        />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{ marginBottom: 16 }}
        >
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'all' && styles.chipSel]}
            onPress={() => setActiveFilter('all')}
          >
            <Text
              style={[styles.chipText, activeFilter === 'all' && styles.chipTextSel]}
            >
              All {items.length}
            </Text>
          </TouchableOpacity>
          {categories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.chip,
                activeFilter === c.id && { backgroundColor: c.color, borderColor: c.color },
              ]}
              onPress={() => setActiveFilter(c.id)}
            >
              <Text
                style={[
                  styles.chipText,
                  activeFilter === c.id && styles.chipTextSel,
                ]}
              >
                {c.label} {counts[c.id] || 0}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={[styles.chip, activeFilter === 'coming_soon' && styles.chipSel]}
            onPress={() => setActiveFilter('coming_soon')}
          >
            <Text
              style={[
                styles.chipText,
                activeFilter === 'coming_soon' && styles.chipTextSel,
              ]}
            >
              Coming Soon {comingSoonCount}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.chip} onPress={() => setCatModalOpen(true)}>
            <Text style={styles.chipText}>+ Category</Text>
          </TouchableOpacity>
        </ScrollView>

        {filtered.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing here yet
            </Text>
            <Text style={shared.tagline}>
              Tap + to log something you're watching, playing, or listening to.
            </Text>
          </View>
        ) : (
          filtered.map((item) => {
            const epTotal = Number(item.epTotal) || 0;
            const epCurrent = Number(item.epCurrent) || 0;
            const epPct = epTotal > 0 ? Math.min(100, Math.round((epCurrent / epTotal) * 100)) : 0;
            const isGame = item.category === 'game';
            const isEpisodic = isEpisodicCategory(categories, item.category);
            const ytId = item.mediaUrl ? getYouTubeId(item.mediaUrl) : null;
            const color = catColor(categories, item.category);
            return (
              <TouchableOpacity
                key={item.id}
                style={[styles.card, { borderLeftColor: color }]}
                onPress={() => {
                  if (isGame) setEpModalId(item.id);
                  else if (isEpisodic) setEpModalId(item.id);
                  else openEdit(item);
                }}
                onLongPress={() => openEdit(item)}
                delayLongPress={400}
              >
                <View style={styles.thumbWrap}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.thumb} />
                  ) : ytId ? (
                    <TouchableOpacity
                      onPress={(e) => {
                        e.stopPropagation();
                        Linking.openURL(item.mediaUrl);
                      }}
                    >
                      <Image
                        source={{
                          uri: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
                        }}
                        style={styles.thumb}
                      />
                    </TouchableOpacity>
                  ) : (
                    <View
                      style={[
                        styles.thumb,
                        styles.thumbPlaceholder,
                        { backgroundColor: color },
                      ]}
                    >
                      <Text style={styles.thumbLetter}>
                        {(item.title || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <View style={styles.cardTopRow}>
                    <Text style={styles.cardTitle} numberOfLines={1}>
                      {item.title}
                    </Text>
                    {item.status === 'coming_soon' ? (
                      <View style={styles.stamp}>
                        <Text style={styles.stampText}>Coming Soon</Text>
                      </View>
                    ) : null}
                  </View>
                  <Text style={styles.cardMeta}>
                    {catLabel(categories, item.category)}
                  </Text>
                  {item.status === 'coming_soon' && item.releaseDate ? (
                    <Text style={styles.releaseText}>
                      Releases {formatReleaseDate(item.releaseDate)}
                    </Text>
                  ) : null}
                  {epTotal > 0 ? (
                    <View style={styles.progressRow}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${epPct}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressLabel}>
                        Ep {epCurrent}/{epTotal}
                      </Text>
                    </View>
                  ) : null}
                  {isGame && item.gamePercent > 0 ? (
                    <View style={styles.progressRow}>
                      <View style={styles.barTrack}>
                        <View
                          style={[
                            styles.barFill,
                            { width: `${item.gamePercent}%`, backgroundColor: color },
                          ]}
                        />
                      </View>
                      <Text style={styles.progressLabel}>🎮 {item.gamePercent}%</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Episode / Game % quick counter */}
      <Modal
        visible={!!epItem}
        animationType="slide"
        transparent
        onRequestClose={() => setEpModalId(null)}
      >
        {epItem ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <Text style={styles.sheetTitle}>{epItem.title}</Text>
              {epItem.category === 'game' ? (
                <>
                  <Text style={styles.counterBig}>{epItem.gamePercent || 0}%</Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, -5)}
                    >
                      <Text style={styles.counterBtnText}>−5</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, -1)}
                    >
                      <Text style={styles.counterBtnText}>−1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, 1)}
                    >
                      <Text style={styles.counterBtnText}>+1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustGamePercent(epItem, 5)}
                    >
                      <Text style={styles.counterBtnText}>+5</Text>
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <Text style={styles.counterBig}>{epItem.epCurrent || 0}</Text>
                  <Text style={{ textAlign: 'center', color: DIM, marginBottom: 16 }}>
                    {epItem.epTotal > 0 ? `of ${epItem.epTotal}` : 'episodes'}
                  </Text>
                  <View style={styles.counterRow}>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustEpisode(epItem, -1)}
                    >
                      <Text style={styles.counterBtnText}>−1</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.counterBtn}
                      onPress={() => adjustEpisode(epItem, 1)}
                    >
                      <Text style={styles.counterBtnText}>+1</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEpModalId(null)}
              >
                <Text style={styles.cancelBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View />
        )}
      </Modal>

      {/* Add/Edit modal */}
      <Modal
        visible={modalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>
                {editingId ? 'Edit' : 'Add'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Text style={styles.imgBtnText}>
                  {draft.image ? 'Change Photo' : 'Add Photo (optional)'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="What are you tracking?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {categories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      draft.category === c.id && { backgroundColor: c.color },
                    ]}
                    onPress={() => setDraft((d) => ({ ...d, category: c.id }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.category === c.id && styles.catChipTextSel,
                      ]}
                    >
                      {c.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Trailer / Video Link (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.mediaUrl}
                onChangeText={(v) => setDraft((d) => ({ ...d, mediaUrl: v }))}
                placeholder="YouTube link"
                placeholderTextColor="#9aa5b1"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Notes (optional)</Text>
              <TextInput
                style={[styles.input, { height: 70 }]}
                value={draft.notes}
                onChangeText={(v) => setDraft((d) => ({ ...d, notes: v }))}
                placeholder="Notes"
                placeholderTextColor="#9aa5b1"
                multiline
              />

              <TouchableOpacity
                style={styles.visitedRow}
                onPress={() =>
                  setDraft((d) => ({
                    ...d,
                    status: d.status === 'coming_soon' ? '' : 'coming_soon',
                  }))
                }
              >
                <View
                  style={[
                    styles.checkbox,
                    draft.status === 'coming_soon' && styles.checkboxDone,
                  ]}
                >
                  {draft.status === 'coming_soon' ? (
                    <Text style={{ color: '#fff', fontSize: 13 }}>✓</Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 14, color: INK }}>Coming soon</Text>
              </TouchableOpacity>

              {draft.status === 'coming_soon' ? (
                <>
                  <Text style={styles.label}>Release Date (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.releaseDate}
                    onChangeText={(v) =>
                      setDraft((d) => ({ ...d, releaseDate: v }))
                    }
                    placeholder="2026-09-01"
                    placeholderTextColor="#9aa5b1"
                  />
                </>
              ) : null}

              {isEpisodicCategory(categories, draft.category) ? (
                <>
                  <Text style={styles.label}>Episode Progress</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.epCurrent}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, epCurrent: v }))
                      }
                      placeholder="Current"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={draft.epTotal}
                      onChangeText={(v) =>
                        setDraft((d) => ({ ...d, epTotal: v }))
                      }
                      placeholder="Total"
                      placeholderTextColor="#9aa5b1"
                      keyboardType="numeric"
                    />
                  </View>
                </>
              ) : null}

              {draft.category === 'game' ? (
                <>
                  <Text style={styles.label}>Completion %</Text>
                  <TextInput
                    style={styles.input}
                    value={draft.gamePercent}
                    onChangeText={(v) =>
                      setDraft((d) => ({ ...d, gamePercent: v }))
                    }
                    placeholder="0-100"
                    placeholderTextColor="#9aa5b1"
                    keyboardType="numeric"
                  />
                </>
              ) : null}

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add category modal */}
      <Modal
        visible={catModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <Text style={styles.sheetTitle}>New Category</Text>
            <Text style={styles.label}>Name</Text>
            <TextInput
              style={styles.input}
              value={catDraft.label}
              onChangeText={(v) => setCatDraft((d) => ({ ...d, label: v }))}
              placeholder="e.g. Podcasts"
              placeholderTextColor="#9aa5b1"
            />
            <Text style={styles.label}>Color</Text>
            <View style={styles.colorRow}>
              {CAT_COLORS.map((c) => (
                <TouchableOpacity
                  key={c}
                  style={[
                    styles.colorDot,
                    { backgroundColor: c },
                    catDraft.color === c && styles.colorDotSel,
                  ]}
                  onPress={() => setCatDraft((d) => ({ ...d, color: c }))}
                />
              ))}
            </View>
            <TouchableOpacity style={styles.saveBtn} onPress={saveCategory}>
              <Text style={styles.saveBtnText}>Add Category</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={() => setCatModalOpen(false)}
            >
              <Text style={styles.cancelBtnText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSel: { backgroundColor: GOLD, borderColor: GOLD },
  chipText: { fontSize: 13, color: INK, fontWeight: '600' },
  chipTextSel: { color: '#fff' },
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 10,
    marginBottom: 12,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  thumbWrap: {},
  thumb: { width: 60, height: 84, borderRadius: 8 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { fontSize: 26, fontWeight: '700', color: '#fff' },
  cardTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '700', color: INK, flex: 1, marginRight: 6 },
  cardMeta: { fontSize: 11, color: DIM, marginTop: 2, textTransform: 'uppercase', fontWeight: '600' },
  stamp: {
    backgroundColor: '#fdf3e0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stampText: { color: GOLD, fontSize: 9, fontWeight: '700', textTransform: 'uppercase' },
  releaseText: { fontSize: 11, color: GOLD, marginTop: 4, textTransform: 'uppercase', fontWeight: '600' },
  progressRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#e9edf2', overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  progressLabel: { fontSize: 11, color: DIM, marginLeft: 8, fontWeight: '600' },
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
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 12, textAlign: 'center' },
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
  counterBig: { fontSize: 48, fontWeight: '800', color: INK, textAlign: 'center', marginTop: 8 },
  counterRow: { flexDirection: 'row', justifyContent: 'center', gap: 12, marginVertical: 20 },
  counterBtn: {
    backgroundColor: '#f2f5f8',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
  },
  counterBtnText: { fontSize: 16, fontWeight: '700', color: INK },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f2f5f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
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
  visitedRow: { flexDirection: 'row', alignItems: 'center', marginTop: 16 },
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  colorDot: { width: 34, height: 34, borderRadius: 17, marginRight: 10, marginBottom: 10 },
  colorDotSel: { borderWidth: 3, borderColor: INK },
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
});

