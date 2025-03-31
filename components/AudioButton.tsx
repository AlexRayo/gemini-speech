import React from 'react';
import { View, Button, StyleSheet } from 'react-native';
import * as Speech from 'expo-speech';

const AudioButton = ({ textToRead }: any) => {
  const speakText = () => {
    Speech.stop();
    Speech.speak(textToRead, { language: 'es-ES' });
  };

  return (
    <View style={styles.container}>
      <Button title="Escuchar respuesta" onPress={speakText} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    margin: 10,
  },
});

export default AudioButton;
