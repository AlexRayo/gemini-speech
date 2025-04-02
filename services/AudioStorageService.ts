import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

const AUDIO_STORAGE_KEY = 'AUDIO_FILES';

// Guarda la metadata del audio y mueve el archivo a una ubicación persistente
export const saveAudio = async (originalUri: string, reportId: string) => {
  try {
    // Define una carpeta en el FileSystem de la app
    //* Por q crear un nuevo directorio:
    // ** Persistencia y Organización: Al mover los audios a una carpeta específica, te aseguras de que estén en un lugar controlado y organizado, separándolos de otros archivos temporales o datos del sistema.
    //** Acceso y Clasificación: Tener una ruta fija facilita acceder a estos archivos, listarlos o clasificarlos (por ejemplo, por reporte o fecha) sin depender de rutas temporales que puedan cambiar.
    //** Manejo de Almacenamiento: Al utilizar un directorio propio, puedes gestionar mejor el almacenamiento, como limpiar archivos antiguos o verificar el estado de los audios sin interferir con otros recursos del sistema.*/

    const audioDir = `${FileSystem.documentDirectory}audios/`;
    const fileName = originalUri.split('/').pop();
    const newUri = `${audioDir}${fileName}`;

    // Asegúrate de que la carpeta exista
    const dirInfo = await FileSystem.getInfoAsync(audioDir);
    if (!dirInfo.exists) {
      await FileSystem.makeDirectoryAsync(audioDir, { intermediates: true });
    }

    // Copia el archivo a la carpeta persistente
    await FileSystem.moveAsync({
      from: originalUri,
      to: newUri,
    });

    // Crea un objeto con la metadata del audio
    const audioEntry = {
      id: Date.now().toString(), // identificador único, podrías usar UUIDs
      uri: newUri,
      reportId, // permite clasificar por reporte
      date: new Date().toISOString(),
      processed: false, // marca para saber si ya se procesó o no
    };

    // Guarda la metadata en AsyncStorage
    const storedAudios = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
    const audios = storedAudios ? JSON.parse(storedAudios) : [];
    audios.push(audioEntry);
    await AsyncStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(audios));

    return audioEntry;
  } catch (error) {
    console.error('Error al guardar el audio:', error);
    throw error;
  }
};

// Obtiene todos los audios almacenados
export const getStoredAudios = async () => {
  try {
    const storedAudios = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
    return storedAudios ? JSON.parse(storedAudios) : [];
  } catch (error) {
    console.error('Error al obtener audios almacenados:', error);
    return [];
  }
};

export const deleteAudio = async (audioId: string) => {
  try {
    // Obtiene la lista actual de audios
    const storedAudios = await AsyncStorage.getItem(AUDIO_STORAGE_KEY);
    const audios = storedAudios ? JSON.parse(storedAudios) : [];

    // Busca el audio a eliminar
    const audioToDelete = audios.find((audio: any) => audio.id === audioId);
    if (!audioToDelete) {
      console.warn('No se encontró el audio con ese ID.');
      return;
    }

    // Elimina el archivo físico
    await FileSystem.deleteAsync(audioToDelete.uri);

    // Filtra la lista para eliminar el audio y actualiza AsyncStorage
    const updatedAudios = audios.filter((audio: any) => audio.id !== audioId);
    await AsyncStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(updatedAudios));

    return updatedAudios;
  } catch (error) {
    console.error('Error eliminando el audio:', error);
    throw error;
  }
};
