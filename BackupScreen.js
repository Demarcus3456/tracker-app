import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, Share } from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { shared, GOLD, ROSE, INK, DIM } from './theme';

export default function BackupScreen({ getPayload, applyPayload }) {
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  async function exportBackup() {
    setBusy(true);
    setStatus('');
    try {
      const payload = getPayload();
      const json = JSON.stringify(payload, null, 2);
      await Share.share({
        message: json,
        title: 'Tracker Backup',
      });
      setStatus('Backup shared.');
    } catch (e) {
      setStatus('Export failed: ' + e.message);
    } finally {
      setBusy(false);
    }
  }

  async function importBackup() {
    setBusy(true);
    setStatus('');
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/*', '*/*'],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets || !result.assets[0]) {
        setBusy(false);
        return;
      }
      const res = await fetch(result.assets[0].uri);
      const content = await res.text();
      const parsed = JSON.parse(content);
      Alert.alert(
        'Overwrite current data?',
        'This will replace everything currently in the app with the contents of this backup file. Continue?',
        [
          { text: 'Cancel', style: 'cancel', onPress: () => setBusy(false) },
          {
            text: 'Overwrite',
            style: 'destructive',
            onPress: () => {
              applyPayload(parsed);
              setStatus('Backup imported.');
              setBusy(false);
            },
          },
        ]
      );
    } catch (e) {
      setStatus('Import failed: ' + e.message);
      setBusy(false);
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <View style={shared.container}>
        <Text style={shared.h1}>Backup</Text>
        <Text style={shared.tagline}>Save or restore everything in this app</Text>

        <View style={shared.block}>
          <TouchableOpacity style={styles.btn} disabled={busy} onPress={exportBackup}>
            <Text style={styles.btnText}>Export Backup</Text>
          </TouchableOpacity>
          <Text style={[shared.tagline, { marginBottom: 12 }]}>
            Opens your phone's share sheet with the backup as text — save it to
            Notes, send it to yourself, or copy it somewhere safe.
          </Text>
          <TouchableOpacity
            style={[styles.btn, styles.btnAlt]}
            disabled={busy}
            onPress={importBackup}
          >
            <Text style={[styles.btnText, styles.btnTextAlt]}>Import Backup</Text>
          </TouchableOpacity>
        </View>

        {status ? (
          <View style={shared.block}>
            <Text style={{ color: status.includes('failed') ? ROSE : INK }}>{status}</Text>
          </View>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  btn: {
    backgroundColor: GOLD,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  btnAlt: { backgroundColor: '#fff', borderWidth: 1, borderColor: GOLD },
  btnTextAlt: { color: GOLD },
});

