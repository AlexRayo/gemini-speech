import React, { useEffect, useState, useRef } from 'react';
import { View, StyleSheet, ActivityIndicator, FlatList, Pressable, Dimensions } from 'react-native';
import { Button, IconButton, Text, Portal, Dialog } from 'react-native-paper';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { processAudioWithGemini } from '@/services/GeminiService';
import { saveAudio, getStoredAudios, deleteAudio, deleteAll } from '@/services/AudioStorageService';
import { AudioType } from '@/types/global';

const MAX_RECORDING_TIME = 15000; // (cámbialo a 60000 para 60 segundos)
const RECORDING_DELAY = 500;

export default function App() {
  const recordingRef = useRef<Audio.Recording | null>(null);
  const maxRecordingTimeout = useRef<NodeJS.Timeout | null>(null);
  // Agrega una referencia para el sonido actualmente reproducido
  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const [audios, setAudios] = useState<AudioType[]>([]);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(false);

  const [loading, setLoading] = useState(false);
  const [visibleDialog, setVisibleDialog] = useState(false);
  const [audioToDelete, setAudioToDelete] = useState<AudioType | null>(null);

  // Funciones para manejar el diálogo
  const showDialog = (audio: AudioType) => {
    setAudioToDelete(audio);
    setVisibleDialog(true);
  };

  const hideDialog = () => {
    setVisibleDialog(false);
    setAudioToDelete(null);
  };

  const confirmDelete = async () => {
    if (audioToDelete) {
      await deleteAudio(audioToDelete.id);
      const storedAudios = await getStoredAudios();
      setAudios(storedAudios);
    }
    hideDialog();
  };

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

  const startRecording = async () => {
    console.log("Start recording delayed");
    try {
      // Solicitar permisos y configurar el modo de audio
      await playCueSound();
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      // Reproducir sonido de aviso para indicar que se va a iniciar la grabación
      // Crear la grabación
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      recordingRef.current = recording; // Actualizar referencia

      // Programar el límite máximo de grabación (por ejemplo, 10 segundos para pruebas)
      maxRecordingTimeout.current = setTimeout(async () => {
        await stopRecording();
        Speech.speak("Listo!", { language: 'es-ES' });
      }, MAX_RECORDING_TIME);
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
    }
  };

  const stopRecording = async () => {
    console.log("stop recording:", recordingRef.current)
    if (maxRecordingTimeout.current) {
      clearTimeout(maxRecordingTimeout.current);
      maxRecordingTimeout.current = null;
    }
    if (!recordingRef.current) return;

    setLoading(true);
    try {
      await recordingRef.current.stopAndUnloadAsync();
      const uri = recordingRef.current.getURI();

      if (!uri) throw new Error('No se pudo obtener el audio');

      const entry: AudioType = {
        id: Date.now().toString(),
        uri,
        data: { titulo: "" },
        date: new Date().toISOString(),
        processed: false,
        sent: false,
      };

      const savedAudioEntry = await saveAudio(entry);
      const storedAudios = await getStoredAudios();
      setAudios(storedAudios);
    } catch (error) {
      console.error('Error completo:', error);
    } finally {
      recordingRef.current = null;
      setLoading(false);
    }
  };

  const loadAudios = async () => {
    const storedAudios = await getStoredAudios();
    console.log("Audios:", storedAudios);
    setAudios(storedAudios);
  };

  const playAudio = async (uri: string) => {
    setAudioUri(uri);
    try {
      // Si hay un sonido reproduciéndose, detenerlo y liberarlo
      if (currentSoundRef.current) {
        await currentSoundRef.current.stopAsync();
        await currentSoundRef.current.unloadAsync();
        currentSoundRef.current = null;
      }

      // Crear el nuevo sonido y guardarlo en la referencia global
      const { sound } = await Audio.Sound.createAsync({ uri });
      currentSoundRef.current = sound;

      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate((status) => {
        // Al terminar de reproducir, liberar el recurso y limpiar la referencia
        if ('didJustFinish' in status && status.didJustFinish) {
          sound.unloadAsync();
          currentSoundRef.current = null;
          setAudioUri(null);
          setIsPaused(false);
        }
      });
    } catch (error) {
      console.error('Error reproduciendo el audio:', error);
    }
  };

  const toggleAudio = async () => {
    try {
      if (currentSoundRef.current) {
        if (isPaused) {
          await currentSoundRef.current.playAsync();
        } else {
          await currentSoundRef.current.pauseAsync();
        }
        setIsPaused(!isPaused);
      }
    } catch (error) {
      console.error("Error alternando el audio:", error);
    }
  };


  const enviarAudios = async () => {
    console.log("PROCESSING AUDIOS...");
    // Recorremos de forma secuencial para asegurar la actualización adecuada
    for (const audio of audios) {
      // Si ya fue procesado, lo saltamos
      if (audio.processed) {
        console.log(`Audio ${audio.id} ya fue procesado, saltando.`);
        continue;
      }
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
      console.log("Audio procesado:", response);
    }
    // Una vez terminado el procesamiento, refrescamos la lista de audios
    const storedAudios = await getStoredAudios();
    setAudios(storedAudios);
  };


  useEffect(() => {
    loadAudios();
    return () => {
      if (recordingRef.current) {
        recordingRef.current.stopAndUnloadAsync();
      }
      if (maxRecordingTimeout.current) {
        clearTimeout(maxRecordingTimeout.current);
      }
    };
  }, []);

  return (
    <View style={styles.container}>
      {loading && <ActivityIndicator size="large" style={styles.loader} />}
      <Text variant='titleLarge' style={styles.h1}>
        {audios.length === 0 ? 'No hay audios' : 'Audios'}
      </Text>

      <FlatList
        data={audios}
        keyExtractor={(item: AudioType) => item.id}
        renderItem={({ item }) => (
          <View style={[styles.audioItem, item.processed ? { backgroundColor: '#dcfce7' } : { backgroundColor: '#f1f1f1' }]}>
            <IconButton
              icon="delete"
              iconColor='tomato'
              onPress={() => showDialog(item)}
            />
            <View>
              <Text variant="bodyLarge" style={[{ fontWeight: 'bold', width: (Dimensions.get('window').width - 180) }]}>
                {item.processed ? item.data.titulo : 'Audio'}
              </Text>
              <Text variant="bodyLarge">
                {new Date(item.date).toLocaleString()}
              </Text>
            </View>


            <IconButton
              mode='outlined'
              icon={!isPaused && audioUri === item.uri ? "pause" : "play"}
              onPress={() => !isPaused && audioUri !== item.uri ? playAudio(item.uri) : toggleAudio()} />
          </View>
        )}
      />
      <Button
        icon="delete"
        mode='outlined'
        onPress={async () => {
          await deleteAll();
          const storedAudios = await getStoredAudios();
          setAudios(storedAudios);
        }}
      >Eliminar todos</Button>
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
          onPressOut={stopRecording}
          delayLongPress={RECORDING_DELAY}
          onLongPress={startRecording}
        >
          GRABAR
        </Button>
      </View>

      {/* Diálogo de confirmación para eliminar un audio */}
      <Portal>
        <Dialog visible={visibleDialog} onDismiss={hideDialog}>
          <Dialog.Title>Confirmar eliminación</Dialog.Title>
          <Dialog.Content>
            <Text>¿Estás seguro que deseas eliminar este audio?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={hideDialog}>Cancelar</Button>
            <Button onPress={confirmDelete}>Eliminar</Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  h1: {
    marginTop: 20,
    marginBottom: 10,
    textAlign: 'center',
    borderBottomColor: '#ccc',
    borderBottomWidth: 1,
    paddingBottom: 10,
  },
  audioItem: {
    borderRadius: 10,
    padding: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20
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
});
