// App.tsx
import React, { useState } from 'react';
import { Button, View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Audio } from 'expo-av';
import { processAudioWithGemini } from '@/services/GeminiService';
import AudioButton from '@/components/AudioButton';

export default function App() {
  const [result, setResult] = useState<string>('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );

      setRecording(recording);

    } catch (error) {
      console.error('Error al iniciar grabación:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;

    setLoading(true);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      if (!uri) throw new Error('No se pudo obtener el audio');

      // Procesar directamente con Gemini
      const response = await processAudioWithGemini(uri);
      setResult(response);

      console.log("Audio procesado:", uri); // <-- Aquí ves el archivo procesado

    } catch (error) {
      console.error('Error completo:', error);
      setResult('Error: Formato de audio no soportado o API Key inválida');
    } finally {
      setRecording(null);
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Button
        title={recording ? 'Detener grabación' : 'Iniciar grabación'}
        onPress={recording ? stopRecording : startRecording}
      />

      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <Text style={styles.resultText}>
        {result || 'Presiona el botón para grabar y procesar'}
      </Text>
      {result && <AudioButton textToRead={result} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  resultText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333'
  },
  loader: {
    marginVertical: 20
  }
});