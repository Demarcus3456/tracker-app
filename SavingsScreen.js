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

function makeId(prefix) {
  return prefix + Date.now() + Math.random().toString(36).slice(2, 8);
}

function fmtMoney(n) {
  const num = Number(n) || 0;
  return '$' + num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function savingsPct(goal) {
  const target = Number(goal.target) || 0;
  const current = Number(goal.current) || 0;
  if (target <= 0) return 0;
  return Math.min(100, Math.round((current / target) * 100));
}

export default function SavingsScreen({ savingsGoals, setSavingsGoals }) {
  const [detailId, setDetailId] = useState(null);
  const [amountText, setAmountText] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState(emptyDraft());

  function emptyDraft() {
    return { title: '', target: '', color: SWATCHES[0], image: null };
  }

  const totalBalance = savingsGoals.reduce((sum, g) => sum + (Number(g.current) || 0), 0);
  const detailGoal = savingsGoals.find((g) => g.id === detailId);

  function openAdd() {
    setEditingId(null);
    setDraft(emptyDraft());
    setModalOpen(true);
  }

  function openEdit(goal) {
    setEditingId(goal.id);
    setDraft({
      title: goal.title,
      target: String(goal.target || ''),
      color: goal.color || SWATCHES[0],
      image: goal.image || null,
    });
    setModalOpen(true);
  }

  async function pickImage() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) return;
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

  function save() {
    const title = draft.title.trim();
    if (!title) {
      Alert.alert('Title required', 'What are you saving for?');
      return;
    }
    const target = Math.max(0, Number(draft.target) || 0);
    if (editingId) {
      setSavingsGoals((prev) =>
        prev.map((g) =>
          g.id === editingId
            ? { ...g, title, target, color: draft.color, image: draft.image, updatedAt: Date.now() }
            : g
        )
      );
    } else {
      setSavingsGoals((prev) => [
        ...prev,
        {
          id: makeId('sg'),
          title,
          target,
          current: 0,
          color: draft.color,
          image: draft.image,
          transactions: [],
          updatedAt: Date.now(),
        },
      ]);
    }
    setModalOpen(false);
  }

  function deleteGoal() {
    Alert.alert('Delete goal?', 'This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setSavingsGoals((prev) => prev.filter((g) => g.id !== editingId));
          setModalOpen(false);
          if (detailId === editingId) setDetailId(null);
        },
      },
    ]);
  }

  function applyTransaction(sign) {
    const raw = parseFloat(amountText);
    if (isNaN(raw) || raw <= 0) return;
    const amount = sign * raw;
    setSavingsGoals((prev) =>
      prev.map((g) => {
        if (g.id !== detailId) return g;
        const nextCurrent = Math.max(0, (Number(g.current) || 0) + amount);
        const transactions = [
          { id: makeId('t'), amount, date: Date.now() },
          ...(g.transactions || []),
        ];
        return { ...g, current: nextCurrent, transactions, updatedAt: Date.now() };
      })
    );
    setAmountText('');
  }

  const sorted = [...savingsGoals].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));

  return (
    <View style={{ flex: 1 }}>
      <ScrollView contentContainerStyle={shared.container}>
        <Text style={shared.h1}>Savings</Text>

        <View style={styles.plaque}>
          <Text style={styles.plaqueNum}>{fmtMoney(totalBalance)}</Text>
          <Text style={styles.plaqueLbl}>Balance</Text>
        </View>

        {sorted.length === 0 ? (
          <View style={shared.block}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: INK, marginBottom: 4 }}>
              No goals yet
            </Text>
            <Text style={shared.tagline}>Tap + to start saving toward something.</Text>
          </View>
        ) : (
          sorted.map((g) => {
            const pct = savingsPct(g);
            return (
              <TouchableOpacity
                key={g.id}
                style={[styles.card, { borderLeftColor: g.color }]}
                onPress={() => {
                  setDetailId(g.id);
                  setAmountText('');
                }}
              >
                {g.image ? (
                  <Image source={{ uri: g.image }} style={styles.thumb} />
                ) : (
                  <View style={[styles.thumb, styles.thumbPlaceholder, { backgroundColor: g.color }]}>
                    <Text style={styles.thumbLetter}>
                      {(g.title || '?').charAt(0).toUpperCase()}
                    </Text>
                  </View>
                )}
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={styles.badge}>GOAL</Text>
                  <Text style={styles.cardTitle}>{g.title}</Text>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${pct}%`, backgroundColor: g.color }]} />
                  </View>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>
                      {fmtMoney(g.current)} of {fmtMoney(g.target)}
                    </Text>
                    <Text style={styles.metaText}>{pct}%</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <TouchableOpacity style={styles.fab} onPress={openAdd}>
        <Text style={styles.fabText}>+</Text>
      </TouchableOpacity>

      {/* Detail modal */}
      <Modal
        visible={!!detailGoal}
        animationType="slide"
        transparent
        onRequestClose={() => setDetailId(null)}
      >
        {detailGoal ? (
          <View style={styles.modalOverlay}>
            <View style={styles.sheet}>
              <ScrollView keyboardShouldPersistTaps="handled">
                <View style={styles.detailHeadRow}>
                  <Text style={styles.sheetTitle}>{detailGoal.title}</Text>
                  <TouchableOpacity onPress={() => openEdit(detailGoal)}>
                    <Text style={styles.editLink}>Edit</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.balanceAmt}>
                  {fmtMoney(detailGoal.current)}{' '}
                  <Text style={styles.balanceTarget}>/ {fmtMoney(detailGoal.target)}</Text>
                </Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.barFill,
                      { width: `${savingsPct(detailGoal)}%`, backgroundColor: detailGoal.color },
                    ]}
                  />
                </View>

                <Text style={styles.label}>Add or Withdraw</Text>
                <TextInput
                  style={styles.input}
                  value={amountText}
                  onChangeText={setAmountText}
                  placeholder="0.00"
                  placeholderTextColor="#9aa5b1"
                  keyboardType="decimal-pad"
                />
                <View style={{ flexDirection: 'row', gap: 10, marginTop: 10 }}>
                  <TouchableOpacity
                    style={[styles.txnBtn, styles.txnBtnAdd]}
                    onPress={() => applyTransaction(1)}
                  >
                    <Text style={styles.txnBtnAddText}>+ Add</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.txnBtn, styles.txnBtnSub]}
                    onPress={() => applyTransaction(-1)}
                  >
                    <Text style={styles.txnBtnSubText}>− Withdraw</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ marginTop: 20 }}>
                  <Text style={styles.label}>History</Text>
                  {(detailGoal.transactions || []).length === 0 ? (
                    <Text style={shared.tagline}>No transactions yet</Text>
                  ) : (
                    (detailGoal.transactions || []).slice(0, 20).map((t) => (
                      <View key={t.id} style={styles.historyRow}>
                        <Text style={{ color: DIM, fontSize: 13 }}>
                          {new Date(t.date).toLocaleDateString()}
                        </Text>
                        <Text
                          style={{
                            color: t.amount < 0 ? ROSE : '#2e9e5b',
                            fontWeight: '700',
                            fontSize: 13,
                          }}
                        >
                          {t.amount < 0 ? '-' : '+'}
                          {fmtMoney(Math.abs(t.amount))}
                        </Text>
                      </View>
                    ))
                  )}
                </View>

                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setDetailId(null)}
                >
                  <Text style={styles.cancelBtnText}>Close</Text>
                </TouchableOpacity>
              </ScrollView>
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
                {editingId ? 'Edit Goal' : 'Add Goal'}
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
                placeholder="What are you saving for?"
                placeholderTextColor="#9aa5b1"
              />

              <Text style={styles.label}>Target Amount</Text>
              <TextInput
                style={styles.input}
                value={draft.target}
                onChangeText={(v) => setDraft((d) => ({ ...d, target: v }))}
                placeholder="0.00"
                placeholderTextColor="#9aa5b1"
                keyboardType="decimal-pad"
              />

              <Text style={styles.label}>Color</Text>
              <View style={styles.colorRow}>
                {SWATCHES.map((c) => (
                  <TouchableOpacity
                    key={c}
                    style={[
                      styles.colorDot,
                      { backgroundColor: c },
                      draft.color === c && styles.colorDotSel,
                    ]}
                    onPress={() => setDraft((d) => ({ ...d, color: c }))}
                  />
                ))}
              </View>

              <TouchableOpacity style={styles.saveBtn} onPress={save}>
                <Text style={styles.saveBtnText}>
                  {editingId ? 'Save Changes' : 'Add Goal'}
                </Text>
              </TouchableOpacity>
              {editingId ? (
                <TouchableOpacity style={styles.deleteBtn} onPress={deleteGoal}>
                  <Text style={styles.deleteBtnText}>Delete Goal</Text>
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
  plaque: {
    backgroundColor: '#1c2b3a',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    marginBottom: 16,
  },
  plaqueNum: { color: '#fff', fontSize: 32, fontWeight: '800' },
  plaqueLbl: { color: '#a9b6c4', fontSize: 12, marginTop: 4 },
  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 14,
    padding: 12,
    marginBottom: 12,
    borderLeftWidth: 4,
    alignItems: 'center',
  },
  thumb: { width: 56, height: 56, borderRadius: 12 },
  thumbPlaceholder: { alignItems: 'center', justifyContent: 'center' },
  thumbLetter: { fontSize: 22, fontWeight: '700', color: '#fff' },
  badge: { fontSize: 10, fontWeight: '700', color: DIM, letterSpacing: 0.5 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: INK, marginBottom: 6 },
  barTrack: { height: 6, borderRadius: 3, backgroundColor: '#e9edf2', overflow: 'hidden', marginTop: 6 },
  barFill: { height: 6, borderRadius: 3 },
  metaRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 },
  metaText: { fontSize: 11, color: DIM },
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
  detailHeadRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  editLink: { color: GOLD, fontWeight: '700', fontSize: 14 },
  balanceAmt: { fontSize: 26, fontWeight: '800', color: INK, marginTop: 8 },
  balanceTarget: { fontSize: 16, fontWeight: '500', color: DIM },
  label: { fontSize: 12, fontWeight: '600', color: DIM, marginTop: 16, marginBottom: 6 },
  input: {
    backgroundColor: '#f2f5f8',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: INK,
  },
  txnBtn: { flex: 1, borderRadius: 12, paddingVertical: 12, alignItems: 'center' },
  txnBtnAdd: { backgroundColor: GOLD },
  txnBtnAddText: { color: '#fff', fontWeight: '700' },
  txnBtnSub: { backgroundColor: '#fff', borderWidth: 1, borderColor: BORDER },
  txnBtnSubText: { color: INK, fontWeight: '700' },
  historyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: BORDER,
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

