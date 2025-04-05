// App.tsx
import React, { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList } from 'react-native';
import { Button, Text } from 'react-native-paper';

import { Audio } from 'expo-av';
import { processAudioWithGemini } from '@/services/GeminiService';
import AudioButton from '@/components/AudioButton';
import { saveAudio, getStoredAudios, deleteAudio } from '@/services/AudioStorageService';
import { Link } from 'expo-router';

export default function App() {
  const [result, setResult] = useState<string>('');
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [loading, setLoading] = useState(false);
  const [audios, setAudios] = useState([]);

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
      // const response = await processAudioWithGemini(uri);
      // setResult(response);

      console.log("Audio procesado:", uri); // <-- Aquí ves el archivo procesado
      // Guardar el audio procesado
      const audioEntry = await saveAudio(uri, "1");
      console.log("Audio guardado:", audioEntry); // <-- Aquí ves el archivo procesado
      // Obtener todos los audios
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

  const playAudio = async (uri) => {
    try {
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      // Opcional: libera el recurso cuando termine la reproducción
      sound.setOnPlaybackStatusUpdate(status => {
        if (status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (error) {
      console.error('Error reproduciendo el audio:', error);
    }
  };

  useEffect(() => {
    loadAudios();

    return () => {

    }
  }, [])


  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" style={styles.loader} />}

      <Text style={styles.resultText}>
        {result || 'Presiona el botón para grabar y procesar'}
      </Text>
      {result && <AudioButton textToRead={result} />}
      <Text>
        Audios
      </Text>
      <FlatList
        data={audios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <Link href={`/${item.id}`} asChild>
            <View style={styles.audioItem}>
              <Text variant='bodyLarge'>Audio grabado el: {new Date(item.date).toLocaleString()}</Text>
              <Button onPress={() => playAudio(item.uri)}>Reproducir</Button>
              <Button
                onPress={async () => {
                  await deleteAudio(item.id);
                  // Luego de eliminar, actualiza la lista de audios
                  const storedAudios = await getStoredAudios();
                  setAudios(storedAudios);
                }}
              >Eliminar</Button>
            </View>
          </Link>
        )}
      />
      <Button
        mode="contained"
        compact={true}
        textColor='white'
        icon="microphone"
        accessibilityLabel="Botón para grabar el audio"
        accessibilityHint="Presiona para grabar el audio"
        onPressIn={startRecording}
        onPressOut={stopRecording}
      // Puedes utilizar el prop `color` o la configuración de tema para cambiar colores si lo requieres
      >GRABAR
      </Button>
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
  deleteButton: {
    marginTop: 10,
    backgroundColor: '#f44336',
  }
});