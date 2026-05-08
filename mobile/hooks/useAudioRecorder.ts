import { useRef, useState } from 'react';
import { Audio } from 'expo-av';

export function useAudioRecorder() {
  const [permissionResponse, requestPermission] = Audio.usePermissions();
  const recordingRef = useRef<Audio.Recording | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = async (): Promise<boolean> => {
    if (recordingRef.current) return false;
    try {
      if (permissionResponse?.status !== 'granted') {
        const resp = await requestPermission();
        if (resp.status !== 'granted') return false;
      }
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      recordingRef.current = recording;
      setIsRecording(true);
      return true;
    } catch (err) {
      console.error('Failed to start recording', err);
      recordingRef.current = null;
      return false;
    }
  };

  const stopRecording = async (): Promise<string | null> => {
    const rec = recordingRef.current;
    if (!rec) return null;
    recordingRef.current = null;
    setIsRecording(false);
    try {
      await rec.stopAndUnloadAsync();
      await Audio.setAudioModeAsync({ allowsRecordingIOS: false });
      return rec.getURI();
    } catch (err) {
      console.error('Failed to stop recording', err);
      return null;
    }
  };

  return { isRecording, startRecording, stopRecording };
}
