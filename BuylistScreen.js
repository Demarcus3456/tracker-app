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

const CAT_COLORS = [
  '#7b6ca6',
  '#b8705c',
  '#5b7b8b',
  '#bc9440',
  '#249bad',
  '#4a90a4',
  '#8a6d3b',
  '#6b8e5a',
];

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

export default function BuylistScreen({
  buylist,
  setBuylist,
  buylistCategories,
  setBuylistCategories,
  initialFilter,
}) {
  const [activeFilter, setActiveFilter] = useState('all');
  useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter);
  }, [initialFilter]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [catDraft, setCatDraft] = useState({ name: '', color: CAT_COLORS[0] });

  function emptyDraft() {
    return { title: '', price: '', url: '', notes: '', categoryId: null, image: null };
  }

  const filtered =
    activeFilter === 'all'
      ? buylist
      : buylist.filter((it) => it.categoryId === activeFilter);
  const sorted = [...filtered].sort((a, b) => (b.addedAt || 0) - (a.addedAt || 0));

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      title: item.title || '',
      price: item.price || '',
      url: item.url || '',
      notes: item.notes || '',
      categoryId: item.categoryId || null,
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
      Alert.alert('Title required', 'Give this item a title first.');
      return;
    }
    const item = {
      id: editingId || makeId('b'),
      title: draft.title.trim(),
      price: draft.price.trim(),
      url: draft.url.trim(),
      notes: draft.notes.trim(),
      categoryId: draft.categoryId,
      image: draft.image,
      addedAt: editingId
        ? buylist.find((b) => b.id === editingId)?.addedAt || Date.now()
        : Date.now(),
    };
    if (editingId) {
      setBuylist((prev) => prev.map((b) => (b.id === editingId ? item : b)));
    } else {
      setBuylist((prev) => [...prev, item]);
    }
    setModalOpen(false);
  }

  function deleteItem() {
    Alert.alert('Delete item?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setBuylist((prev) => prev.filter((b) => b.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  function saveCategory() {
    if (!catDraft.name.trim()) {
      Alert.alert('Name required', 'Give this category a name.');
      return;
    }
    setBuylistCategories((prev) => [
      ...prev,
      { id: makeId('bc'), name: catDraft.name.trim(), color: catDraft.color },
    ]);
    setCatDraft({ name: '', color: CAT_COLORS[0] });
  }

  function deleteCategory(catId) {
    const inUse = buylist.some((it) => it.categoryId === catId);
    const doDelete = () => {
      if (inUse) {
        setBuylist((prev) =>
          prev.map((it) => (it.categoryId === catId ? { ...it, categoryId: null } : it))
        );
      }
      setBuylistCategories((prev) => prev.filter((c) => c.id !== catId));
      if (activeFilter === catId) setActiveFilter('all');
    };
    if (inUse) {
      Alert.alert(
        'Category is in use',
        'Some items use this category. Remove it anyway? They will be left uncategorized.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: doDelete },
        ]
      );
    } else {
      doDelete();
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Buylist</Text>
        <Text style={shared.tagline}>Things you're thinking about buying</Text>

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
              style={[
                styles.chipText,
                activeFilter === 'all' && styles.chipTextSel,
              ]}
            >
              All
            </Text>
          </TouchableOpacity>
          {buylistCategories.map((c) => (
            <TouchableOpacity
              key={c.id}
              style={[
                styles.chip,
                activeFilter === c.id && { backgroundColor: c.color },
              ]}
              onPress={() => setActiveFilter(c.id)}
            >
              <View style={[styles.chipDot, { backgroundColor: c.color }]} />
              <Text
                style={[
                  styles.chipText,
                  activeFilter === c.id && styles.chipTextSel,
                ]}
              >
                {c.name}
              </Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity
            style={styles.chip}
            onPress={() => setCatModalOpen(true)}
          >
            <Text style={styles.chipText}>⚙️ Categories</Text>
          </TouchableOpacity>
        </ScrollView>

        {sorted.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing here
            </Text>
            <Text style={shared.tagline}>
              {buylist.length
                ? 'No items in this category yet.'
                : "Tap + to add something you're thinking about buying."}
            </Text>
          </View>
        ) : (
          sorted.map((it) => {
            const cat = buylistCategories.find((c) => c.id === it.categoryId);
            return (
              <View
                key={it.id}
                style={[
                  styles.card,
                  { borderLeftColor: cat ? cat.color : INK },
                ]}
              >
                <TouchableOpacity onPress={() => openEdit(it)}>
                  {it.image ? (
                    <Image source={{ uri: it.image }} style={styles.cardImg} />
                  ) : (
                    <View style={[styles.cardImg, styles.cardImgPlaceholder]}>
                      <Text style={styles.placeholderLetter}>
                        {(it.title || '?').charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.cardTitle} numberOfLines={2}>
                    {it.title}
                  </Text>
                  {cat ? (
                    <Text style={[styles.cardCat, { color: cat.color }]}>
                      {cat.name}
                    </Text>
                  ) : null}
                  {it.price ? (
                    <Text style={styles.cardPrice}>{it.price}</Text>
                  ) : null}
                  <View style={styles.cardActions}>
                    <TouchableOpacity onPress={() => openEdit(it)}>
                      <Text style={styles.actionLink}>Edit</Text>
                    </TouchableOpacity>
                    {it.url ? (
                      <TouchableOpacity onPress={() => Linking.openURL(it.url)}>
                        <Text style={styles.actionLink}>Visit ↗</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Add/Edit item modal */}
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
                {editingId ? 'Edit Item' : 'Add Item'}
              </Text>

              {draft.image ? (
                <Image source={{ uri: draft.image }} style={styles.imgPreview} />
              ) : null}
              <TouchableOpacity style={styles.imgBtn} onPress={pickImage}>
                <Text style={styles.imgBtnText}>
                  {draft.image ? 'Change Photo' : 'Add Photo'}
                </Text>
              </TouchableOpacity>

              <Text style={styles.label}>Title</Text>
              <TextInput
                style={styles.input}
                value={draft.title}
                onChangeText={(v) => setDraft((d) => ({ ...d, title: v }))}
                placeholder="What is it?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {buylistCategories.map((c) => (
                  <TouchableOpacity
                    key={c.id}
                    style={[
                      styles.catChip,
                      draft.categoryId === c.id && { backgroundColor: c.color },
                    ]}
                    onPress={() =>
                      setDraft((d) => ({
                        ...d,
                        categoryId: d.categoryId === c.id ? null : c.id,
                      }))
                    }
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.categoryId === c.id && styles.catChipTextSel,
                      ]}
                    >
                      {c.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Price (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.price}
                onChangeText={(v) => setDraft((d) => ({ ...d, price: v }))}
                placeholder="$0.00"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Link (optional)</Text>
              <TextInput
                style={styles.input}
                value={draft.url}
                onChangeText={(v) => setDraft((d) => ({ ...d, url: v }))}
                placeholder="https://..."
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

              <TouchableOpacity style={styles.saveBtn} onPress={saveItem}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add Item'}
                </Text>
              </TouchableOpacity>

              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteItem}>
                  <Text style={styles.deleteBtnText}>Delete Item</Text>
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

      {/* Manage categories modal */}
      <Modal
        visible={catModalOpen}
        animationType="slide"
        transparent
        onRequestClose={() => setCatModalOpen(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.sheet}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.sheetTitle}>Manage Categories</Text>
              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={catDraft.name}
                onChangeText={(v) => setCatDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Board Games"
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

              {buylistCategories.length > 0 ? (
                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>Existing Categories</Text>
                  {buylistCategories.map((c) => (
                    <View key={c.id} style={styles.manageCatRow}>
                      <View style={styles.manageCatNameWrap}>
                        <View style={[styles.manageCatDot, { backgroundColor: c.color }]} />
                        <Text style={styles.manageCatName}>{c.name}</Text>
                      </View>
                      <TouchableOpacity onPress={() => deleteCategory(c.id)}>
                        <Text style={styles.manageCatRemove}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCatModalOpen(false)}
              >
                <Text style={styles.cancelBtnText}>Close</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#fff',
    marginRight: 8,
    borderWidth: 1,
    borderColor: BORDER,
  },
  chipSel: { backgroundColor: GOLD, borderColor: GOLD },
  chipDot: { width: 8, height: 8, borderRadius: 4, marginRight: 6 },
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
  cardImg: { width: 64, height: 64, borderRadius: 10 },
  cardImgPlaceholder: {
    backgroundColor: '#eef2f6',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholderLetter: { fontSize: 22, fontWeight: '700', color: DIM },
  cardTitle: { fontSize: 14, fontWeight: '600', color: INK },
  cardCat: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  cardPrice: { fontSize: 13, color: DIM, marginTop: 2, fontWeight: '600' },
  cardActions: { flexDirection: 'row', gap: 16, marginTop: 6 },
  actionLink: { fontSize: 12, color: GOLD, fontWeight: '700', marginRight: 16 },
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
  colorRow: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 },
  colorDot: {
    width: 34,
    height: 34,
    borderRadius: 17,
    marginRight: 10,
    marginBottom: 10,
  },
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
  manageCatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
  },
  manageCatNameWrap: { flexDirection: 'row', alignItems: 'center' },
  manageCatDot: { width: 10, height: 10, borderRadius: 5, marginRight: 10 },
  manageCatName: { fontSize: 14, color: INK },
  manageCatRemove: { color: ROSE, fontSize: 13, fontWeight: '700' },
});

