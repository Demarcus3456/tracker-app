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
import { shared, GOLD, ROSE, INK, DIM, CARD, BORDER } from './theme';

const INV_CATEGORIES = [
  'Seasonings',
  'Meats',
  'Pantry',
  'Produce',
  'Dairy',
  'Other',
];

function todayDateKey() {
  return new Date().toISOString().split('T')[0];
}

function makeId() {
  return 'inv' + Date.now() + Math.random().toString(36).slice(2, 8);
}

export default function InventoryScreen({ inventory, setInventory }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({
    name: '',
    category: 'Pantry',
    amount: '',
    qty: '',
    expDate: '',
    image: null,
  });

  function openAdd() {
    setEditingId(null);
    setDraft({
      name: '',
      category: 'Pantry',
      amount: '',
      qty: '',
      expDate: '',
      image: null,
    });
    setModalOpen(true);
  }

  function openEdit(item) {
    setEditingId(item.id);
    setDraft({
      name: item.name || '',
      category: item.category || 'Pantry',
      amount: item.amount || '',
      qty: item.qty != null ? String(item.qty) : '',
      expDate: item.expDate || '',
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
      const asset = result.assets[0];
      const uri = `data:image/jpeg;base64,${asset.base64}`;
      setDraft((d) => ({ ...d, image: uri }));
    }
  }

  function saveItem() {
    if (!draft.name.trim()) {
      Alert.alert('Name required', 'Give this item a name first.');
      return;
    }
    const qtyNum = draft.qty.trim() === '' ? null : Number(draft.qty);
    const item = {
      id: editingId || makeId(),
      name: draft.name.trim(),
      category: draft.category,
      amount: draft.amount.trim(),
      qty: qtyNum,
      expDate: draft.expDate.trim(),
      image: draft.image,
    };
    if (editingId) {
      setInventory((prev) => prev.map((it) => (it.id === editingId ? item : it)));
    } else {
      setInventory((prev) => [...prev, item]);
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
          setInventory((prev) => prev.filter((it) => it.id !== editingId));
          setModalOpen(false);
        },
      },
    ]);
  }

  const todayKey = todayDateKey();
  const grouped = INV_CATEGORIES.map((cat) => ({
    cat,
    items: inventory.filter((it) => it.category === cat),
  })).filter((g) => g.items.length);

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Inventory</Text>
        <Text style={shared.tagline}>
          {inventory.length} item{inventory.length === 1 ? '' : 's'}
        </Text>

        {inventory.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              Nothing in your inventory
            </Text>
            <Text style={shared.tagline}>
              Add what you have on hand — seasonings, meats, pantry staples.
            </Text>
          </View>
        ) : (
          grouped.map(({ cat, items }) => (
            <View key={cat} style={shared.block}>
              <Text style={shared.catHead}>{cat}</Text>
              {items.map((it) => {
                let expBit = null;
                if (it.expDate) {
                  const daysLeft = Math.round(
                    (new Date(it.expDate + 'T00:00:00') -
                      new Date(todayKey + 'T00:00:00')) /
                      86400000
                  );
                  let color = DIM;
                  let label = `Exp ${it.expDate}`;
                  if (daysLeft < 0) {
                    color = ROSE;
                    label = 'Expired';
                  } else if (daysLeft === 0) {
                    color = ROSE;
                    label = 'Expires today';
                  } else if (daysLeft <= 3) {
                    color = GOLD;
                    label = `Expires in ${daysLeft}d`;
                  }
                  expBit = (
                    <Text style={{ fontSize: 11, color, marginTop: 2 }}>{label}</Text>
                  );
                }
                return (
                  <TouchableOpacity
                    key={it.id}
                    style={shared.row}
                    onPress={() => openEdit(it)}
                  >
                    {it.image ? (
                      <Image source={{ uri: it.image }} style={shared.thumb44} />
                    ) : null}
                    <View style={{ flex: 1, marginLeft: 8 }}>
                      <Text style={{ fontSize: 15, color: INK }}>{it.name}</Text>
                      {expBit}
                    </View>
                    {it.qty != null ? (
                      <Text style={shared.rowRight}>Qty {it.qty}</Text>
                    ) : it.amount ? (
                      <Text style={shared.rowRight}>{it.amount}</Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </View>
          ))
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

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

              <Text style={styles.label}>Name</Text>
              <TextInput
                style={styles.input}
                value={draft.name}
                onChangeText={(v) => setDraft((d) => ({ ...d, name: v }))}
                placeholder="e.g. Milk"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Category</Text>
              <View style={styles.catRow}>
                {INV_CATEGORIES.map((cat) => (
                  <TouchableOpacity
                    key={cat}
                    style={[
                      styles.catChip,
                      draft.category === cat && styles.catChipSel,
                    ]}
                    onPress={() => setDraft((d) => ({ ...d, category: cat }))}
                  >
                    <Text
                      style={[
                        styles.catChipText,
                        draft.category === cat && styles.catChipTextSel,
                      ]}
                    >
                      {cat}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Amount (optional, e.g. "half gallon")</Text>
              <TextInput
                style={styles.input}
                value={draft.amount}
                onChangeText={(v) => setDraft((d) => ({ ...d, amount: v }))}
                placeholder="Amount"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Quantity (optional, whole number)</Text>
              <TextInput
                style={styles.input}
                value={draft.qty}
                onChangeText={(v) => setDraft((d) => ({ ...d, qty: v }))}
                placeholder="e.g. 3"
                placeholderTextColor="#9aa5b1"
                keyboardType="numeric"
              />

              <Text style={styles.label}>Expiration Date (optional, YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={draft.expDate}
                onChangeText={(v) => setDraft((d) => ({ ...d, expDate: v }))}
                placeholder="2026-08-01"
                placeholderTextColor="#9aa5b1"
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
    </View>
  );
}

const styles = StyleSheet.create({
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
    maxHeight: '88%',
  },
  sheetTitle: { fontSize: 20, fontWeight: '700', color: INK, marginBottom: 16 },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 12, marginBottom: 6 },
  input: {
    backgroundColor: '#f2f5f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  catRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  catChip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: '#f2f5f8',
    marginRight: 8,
    marginBottom: 8,
  },
  catChipSel: { backgroundColor: GOLD },
  catChipText: { fontSize: 13, color: INK },
  catChipTextSel: { color: '#fff', fontWeight: '600' },
  imgPreview: {
    width: '100%',
    height: 160,
    borderRadius: 12,
    marginBottom: 10,
  },
  imgBtn: {
    borderWidth: 1,
    borderColor: BORDER,
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: 'center',
    marginBottom: 4,
  },
  imgBtnText: { color: INK, fontSize: 14, fontWeight: '500' },
  saveBtn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 24,
  },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  deleteBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  deleteBtnText: { color: ROSE, fontSize: 14, fontWeight: '600' },
  cancelBtn: { paddingVertical: 10, alignItems: 'center', marginTop: 2 },
  cancelBtnText: { color: DIM, fontSize: 14 },
});

