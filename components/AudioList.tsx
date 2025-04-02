// components/AudioList.tsx
import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, Button, StyleSheet } from 'react-native';
import { getStoredAudios } from '@/services/AudioStorageService';
import { Audio } from 'expo-av';

const AudioList = ({ reportId }) => {
  const [audios, setAudios] = useState([]);

  useEffect(() => {
    // Obtén todos los audios y filtra los que correspondan al reporte
    const loadAudios = async () => {
      const storedAudios = await getStoredAudios();
      const filtered = storedAudios.filter(audio => audio.reportId === reportId);
      setAudios(filtered);
    };
    loadAudios();
  }, [reportId]);

  // Función para reproducir un audio
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

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Audios del Reporte {reportId}</Text>
      <FlatList
        data={audios}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View style={styles.audioItem}>
            <Text>Audio grabado el: {new Date(item.date).toLocaleString()}</Text>
            <Button title="Reproducir" onPress={() => playAudio(item.uri)} />
          </View>
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 10
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10
  },
  audioItem: {
    marginBottom: 10,
    padding: 10,
    backgroundColor: '#f2f2f2',
    borderRadius: 5
  }
});

export default AudioList;
