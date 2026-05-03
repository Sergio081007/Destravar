import { Modal, View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

type Props = {
  visible: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmExitModal({ visible, onConfirm, onCancel }: Props) {
  return (
    <Modal transparent animationType="fade" visible={visible} onRequestClose={onCancel}>
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            <Ionicons name="alert-circle" size={32} color="#f59e0b" />
          </View>
          <Text style={styles.title}>Sair da etapa?</Text>
          <Text style={styles.subtitle}>
            Seu progresso nesta etapa será perdido e você terá que começar do início.
          </Text>
          <View style={styles.buttons}>
            <TouchableOpacity style={styles.btnCancel} onPress={onCancel} activeOpacity={0.8}>
              <Text style={styles.btnCancelText}>Continuar</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btnConfirm} onPress={onConfirm} activeOpacity={0.8}>
              <Text style={styles.btnConfirmText}>Sair</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  card: {
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 24,
    padding: 28,
    alignItems: 'center',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: '#fffbeb',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: 4,
  },
  title: {
    fontSize: 18, fontWeight: '800', color: '#181c1e', textAlign: 'center',
  },
  subtitle: {
    fontSize: 14, color: '#404751', textAlign: 'center', lineHeight: 20, fontWeight: '400',
  },
  buttons: {
    flexDirection: 'row', gap: 12, marginTop: 8, width: '100%',
  },
  btnCancel: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#0061a2',
    alignItems: 'center',
  },
  btnCancelText: {
    color: '#fff', fontWeight: '700', fontSize: 15,
  },
  btnConfirm: {
    flex: 1, paddingVertical: 14, borderRadius: 14,
    backgroundColor: '#fef2f2',
    borderWidth: 1, borderColor: '#fecaca',
    alignItems: 'center',
  },
  btnConfirmText: {
    color: '#dc2626', fontWeight: '700', fontSize: 15,
  },
});
