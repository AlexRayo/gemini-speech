import { Audio } from "expo-av";
import { useRef, useState } from "react";

const usePlayAudio = () => {

  const currentSoundRef = useRef<Audio.Sound | null>(null);
  const [audioUri, setAudioUri] = useState<string | null>(null);
  const [isPaused, setIsPaused] = useState(true);

  const play = async (uri: string) => {
    setAudioUri(uri);
    setIsPaused(false);
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
          setIsPaused(true);
        }
      });
    } catch (error) {
      console.error('Error reproduciendo el audio:', error);
    }
  };

  const toggleAudio = async () => {
    setIsPaused(!isPaused);
    try {
      if (currentSoundRef.current) {
        if (isPaused) {
          await currentSoundRef.current.playAsync();
        } else {
          await currentSoundRef.current.pauseAsync();
        }
      }
    } catch (error) {
      console.error("Error alternando el audio:", error);
    }
  };

  return {
    audioUri,
    isPaused,
    play,
    toggleAudio,
  }
}

export default usePlayAudio;