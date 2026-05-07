import { useState } from 'react';
import { Audio } from 'expo-av';

export function useAudioRecorder() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async (): Promise<boolean> => {
    try {
      if (permissionResponse?.status !== 'granted') {
        const resp = await requestPermission();
        if (resp.status !== 'granted') return false;
      }
      
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording: rec } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      
      setRecording(rec);
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('Failed to start recording', err);
      return false;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    if (!isRecording || !recording) return null;
    setIsRecording(false);
    try {
      await recording.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      const uri = recording.getURI();
      setRecording(null);
      return uri;
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  };

  return {
    isRecording,
    startRecording,
    stopRecording,
  };
}
