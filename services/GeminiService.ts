// services/GeminiService.ts
import axios from 'axios';
import * as FileSystem from 'expo-file-system';

export const processAudioWithGemini = async (audioUri: string): Promise<string> => {
  const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY;
  try {
    // 1. Convertir el audio a base64
    const base64Audio = await FileSystem.readAsStringAsync(audioUri, {
      encoding: FileSystem.EncodingType.Base64,
    });

    // 2. Enviar el audio directamente a Gemini
    const response = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro-latest:generateContent?key=${GEMINI_API_KEY}`,
      {
        contents: [{
          parts: [
            {
              text: "Transcribe este audio, analiza su contenido y responde en formato JSON; es para enviar a una base de datos de una ONG. Es importante que trates de determinar un título del audio(sobre lo que trate), clasifica los puntos importantes:"
            },
            {
              inlineData: {
                mimeType: "audio/mp3", // Ajusta según tu formato
                data: base64Audio
              }
            }
          ]
        }]
      },
      {
        headers: {
          'Content-Type': 'application/json',
        }
      }
    );

    return response.data.candidates[0].content.parts[0].text;

  } catch (error) {
    console.error('Error en Gemini:', error);
    throw new Error('Error procesando el audio');
  }
};