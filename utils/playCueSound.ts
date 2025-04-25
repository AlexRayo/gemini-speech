import { Audio } from 'expo-av';

export const playCueSound = async () => {
  try {
    const { sound } = await Audio.Sound.createAsync(
      require('@assets/startRecordingCue.mp3')
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