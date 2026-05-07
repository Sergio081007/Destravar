import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions, TextInput, Modal, Image, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { setUserName, setUserChar, getUserId } from '../utils/storage';
import { API_BASE_URL } from '../constants/config';
import { supabase } from '../utils/supabase';

const CHARS = {
  1: require('../assets/characters/char1.png'),
  2: require('../assets/characters/char2.png'),
  3: require('../assets/characters/char3.png'),
  4: require('../assets/characters/char4.png'),
  5: require('../assets/characters/char5.png'),
} as const;

type Props = {
  visible: boolean;
  currentName: string;
  currentChar: 1|2|3|4|5;
  onClose: () => void;
  onSave: (newName: string, newChar: 1|2|3|4|5) => void;
};

export default function EditProfileModal({ visible, currentName, currentChar, onClose, onSave }: Props) {
  const [name, setName] = useState(currentName);
  const [charIdx, setCharIdx] = useState<1|2|3|4|5>(currentChar);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible) {
      setName(currentName);
      setCharIdx(currentChar);
    }
  }, [visible, currentName, currentChar]);

  const handleSave = async () => {
    if (!name.trim()) return;
    setSaving(true);
    const savedName = name.trim();
    const savedChar = charIdx;
    try {
      await setUserName(savedName);
      await setUserChar(savedChar);

      const userId = await getUserId();
      if (userId) {
        fetch(`${API_BASE_URL}/usuarios`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Bypass-Tunnel-Reminder': 'true' },
          body: JSON.stringify({ id: userId, nome: savedName, avatar_id: savedChar })
        }).catch(() => {});
      }
      // Persiste char no Supabase Auth para sobreviver ao logout/login
      supabase.auth.updateUser({ data: { char: savedChar, nome: savedName } }).catch(() => {});
    } finally {
      setSaving(false);
    }
    onSave(savedName, savedChar);
  };

  if (!visible) return null;

  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.overlay}>
        <View style={styles.card}>
          <Text style={styles.title}>Editar Perfil</Text>
          
          <Text style={styles.label}>Como quer ser chamado?</Text>
          <TextInput
            style={styles.input}
            value={name}
            onChangeText={setName}
            placeholder="Seu nome ou apelido"
            maxLength={20}
            placeholderTextColor="#9ca3af"
          />

          <Text style={styles.label}>Escolha seu Avatar</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.charScroll}>
            {[1, 2, 3, 4, 5].map((i) => {
              const idx = i as 1|2|3|4|5;
              const isSelected = charIdx === idx;
              return (
                <TouchableOpacity
                  key={i}
                  activeOpacity={0.8}
                  onPress={() => setCharIdx(idx)}
                  style={[styles.charBtn, isSelected && styles.charBtnSelected]}
                >
                  <Image source={CHARS[idx]} style={styles.charImg} />
                  {isSelected && (
                    <View style={styles.checkBadge}>
                      <Ionicons name="checkmark" size={12} color="#fff" />
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </ScrollView>

          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.btnCancel} onPress={onClose} disabled={saving}>
              <Text style={styles.btnCancelText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.btnSave, !name.trim() && { opacity: 0.5 }]} onPress={handleSave} disabled={saving || !name.trim()}>
              <Text style={styles.btnSaveText}>{saving ? 'Salvando...' : 'Salvar'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  overlay: {
    flex: 1, backgroundColor: 'rgba(24,28,30,0.5)',
    justifyContent: 'center', alignItems: 'center',
    paddingHorizontal: 20,
  },
  card: {
    width: width - 40, backgroundColor: '#fff',
    borderRadius: 24, padding: 24,
    shadowColor: '#000', shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
  },
  title: {
    fontSize: 22, fontWeight: '800', color: '#181c1e',
    marginBottom: 20, textAlign: 'center',
  },
  label: {
    fontSize: 14, fontWeight: '700', color: '#404751',
    marginBottom: 8, marginTop: 4,
  },
  input: {
    backgroundColor: '#f1f4f7', borderRadius: 12, padding: 14,
    fontSize: 16, color: '#181c1e', fontWeight: '500',
    marginBottom: 20, borderWidth: 1, borderColor: '#ebeef1',
  },
  charScroll: {
    gap: 12, paddingVertical: 4, paddingBottom: 24,
  },
  charBtn: {
    width: 70, height: 70, borderRadius: 35,
    backgroundColor: '#f1f4f7', padding: 2,
    borderWidth: 3, borderColor: 'transparent',
    alignItems: 'center', justifyContent: 'center',
  },
  charBtnSelected: {
    borderColor: '#0061a2', backgroundColor: '#e0f2fe',
  },
  charImg: {
    width: '100%', height: '100%', borderRadius: 32,
  },
  checkBadge: {
    position: 'absolute', bottom: -4, right: -4,
    backgroundColor: '#0061a2', width: 20, height: 20,
    borderRadius: 10, justifyContent: 'center', alignItems: 'center',
    borderWidth: 2, borderColor: '#fff',
  },
  btnRow: {
    flexDirection: 'row', gap: 12, marginTop: 10,
  },
  btnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#f1f4f7', alignItems: 'center',
  },
  btnCancelText: { color: '#404751', fontWeight: '700', fontSize: 16 },
  btnSave: {
    flex: 1, paddingVertical: 14, borderRadius: 12,
    backgroundColor: '#0061a2', alignItems: 'center',
  },
  btnSaveText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
