import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable } from 'react-native';
import { Button, Text } from 'react-native-paper';
import { Audio } from 'expo-av';
import { processAudioWithGemini } from '@/services/GeminiService';
import AudioButton from '@/components/AudioButton';
import { saveAudio, getStoredAudios, deleteAudio, deleteAll } from '@/services/AudioStorageService';
import { AudioType } from '@/types/global';

export default function App() {
  const [result, setResult] = useState<string>('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);
  const [audios, setAudios] = useState<AudioType[]>([]);
  const [isPressed, setIsPressed] = useState(false);
  const recordingTimeout = useRef<NodeJS.Timeout | null>(null);

  // Función para reproducir el sonido de aviso
  const playCueSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('@/assets/startRecordingCue.mp3')
      );
      await sound.playAsync();
      // Opcional: liberar el recurso después de reproducirlo
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error al reproducir sonido de aviso:', error);
    }
  };

  const startRecordingDelayed = async () => {
    try {
      // Solicitar permisos y configurar el modo de audio
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      // Reproducir sonido de aviso para indicar que se va a iniciar la grabación
      await playCueSound();
      // Crear la grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
    }
  };

  const handlePressIn = () => {
    setIsPressed(true);
    // Espera 500ms antes de iniciar la grabación
    recordingTimeout.current = setTimeout(() => {
      if (isPressed) {
        startRecordingDelayed();
      }
    }, 500);
  };

  const handlePressOut = async () => {
    setIsPressed(false);
    if (recordingTimeout.current) {
      clearTimeout(recordingTimeout.current);
      recordingTimeout.current = null;
    }
    // Si ya inició la grabación, detenla
    if (recording) {
      await stopRecording();
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setLoading(true);
    try {
      // Detener y descargar la grabación (capturando errores si ya se detuvo)
      try {
        await recording.stopAndUnloadAsync();
      } catch (error) {
        console.error('Error al detener grabación (posiblemente ya detenida):', error);
      }
      const uri = recording.getURI();
      if (!uri) throw new Error('No se pudo obtener el audio');
      const entry: AudioType = {
        id: Date.now().toString(), // identificador único
        uri,
        data: "",
        date: new Date().toISOString(),
        processed: false,
        sent: false,
      };
      console.log("Audio procesado:", uri);
      const savedAudioEntry = await saveAudio(entry);
      console.log("Audio guardado:", savedAudioEntry);
      const storedAudios = await getStoredAudios();
      setAudios(storedAudios);
    } catch (error) {
      console.error('Error completo:', error);
      setResult('Error: Formato de audio no soportado o API Key inválida');
    } finally {
      setRecording(null);
      setLoading(false);
    }
  };

  const loadAudios = async () => {
    const storedAudios = await getStoredAudios();
    console.log("Audios:", storedAudios);
    setAudios(storedAudios);
  };

  const playAudio = async (uri: string) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        if ('didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error reproduciendo el audio:', error);
    }
  };

  const enviarAudios = () => {
    console.log("PROCESSING AUDIOS...");
    audios.forEach(async (audio: AudioType) => {
      const response = await processAudioWithGemini(audio.uri);
      let dataParsed;
      try {
        const cleaned = response.replace(/```json/g, '').replace(/```/g, '');
        dataParsed = JSON.parse(cleaned);
      } catch (error) {
        console.error("Error al parsear JSON:", error);
        dataParsed = response;
      }
      const updateProperties = {
        data: dataParsed,
        processed: true,
        sent: true,
      };
      const updateEntry: AudioType = { ...audio, ...updateProperties };
      await saveAudio(updateEntry);
      setResult(typeof updateEntry.data === 'object' ? JSON.stringify(updateEntry.data) : updateEntry.data);
      console.log("Audio procesado:", response);
    });
  };

  useEffect(() => {
    loadAudios();
  }, []);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" style={styles.loader} />}
      <Text style={styles.resultText}>
        {result || 'Presiona y mantén el botón para grabar y procesar'}
      </Text>
      {result && <AudioButton textToRead={result} />}
      <Text>Audios</Text>
      <FlatList
        data={audios}
        keyExtractor={(item: AudioType) => item.id}
        renderItem={({ item }) => (
          <View style={styles.audioItem}>
            <Text variant="bodyLarge">
              Audio grabado el: {new Date(item.date).toLocaleString()}
            </Text>
            <Button onPress={() => playAudio(item.uri)}>Reproducir</Button>
            <Button
              onPress={async () => {
                await deleteAll();
                const storedAudios = await getStoredAudios();
                setAudios(storedAudios);
              }}
            >
              Eliminar
            </Button>
          </View>
        )}
      />
      <View style={styles.buttonRow}>
        <Button icon="send" compact={true} onPress={enviarAudios}>
          ENVIAR
        </Button>
        <Button
          mode="contained"
          compact={true}
          textColor='white'
          icon="microphone"
          accessibilityLabel="Botón para grabar el audio"
          accessibilityHint="Mantén presionado para grabar"
          onPressIn={handlePressIn}
          onPressOut={stopRecording}
        >
          GRABAR
        </Button>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20
  },
  recordButton: {
    padding: 20,
    borderRadius: 50,
    alignItems: 'center',
    marginBottom: 20
  },
  recordButtonText: {
    color: '#fff',
    fontWeight: 'bold'
  },
  resultText: {
    marginTop: 20,
    fontSize: 16,
    color: '#333'
  },
  loader: {
    marginVertical: 20
  },
  audioItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 5
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20
  }
});
