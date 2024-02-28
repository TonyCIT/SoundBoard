
import { useEffect, useState } from 'react';
import { Button, StyleSheet, View, ScrollView, TouchableOpacity, Text } from 'react-native';
import { Audio } from 'expo-av';

export default function App() {
  const [recording, setRecording] = useState(null);
  const [recordings, setRecordings] = useState(Array(54).fill(null)); // 5x10 grid
  const [currentRecordingIndex, setCurrentRecordingIndex] = useState(null);
  const [permissionsResponse, requestPermission] = Audio.usePermissions();

  const startRecording = async () => {
    try {
      // request permission to use the mic
      if (permissionsResponse.status !== 'granted') {
        console.log('Requesting permissions.');
        await requestPermission();
      }
      console.log('Permission is ', permissionsResponse.status);

      // set some device specific values
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      console.log('Starting recording...');
      const { recording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(recording);
      console.log('...recording');
    }
    catch (errorEvent) {
      console.error('Failed to startRecording(): ', errorEvent);
    }
  }

  const handleRecordPress = async () => {
    if (recording) {
      await stopRecording();
    } else {
      // Find the first button without a recording assigned
      const firstEmptyIndex = recordings.findIndex(r => !r);
      if (firstEmptyIndex !== -1) {
        setCurrentRecordingIndex(firstEmptyIndex);
        await startRecording();
      } else {
        console.log("No empty buttons available");
      }
    }
  };

  const handlePlayPress = async (uri) => {
    const { sound } = await Audio.Sound.createAsync({ uri });
    await sound.playAsync();
    sound.setOnPlaybackStatusUpdate(async (status) => {
      if (status.didJustFinish && !status.isLooping) {
        await sound.unloadAsync();
      }
    });
  };
  
  const handleLongPress = (index) => {
    // Update the recordings array by setting the pressed index to null
    const updatedRecordings = [...recordings];
    updatedRecordings[index] = null;
    setRecordings(updatedRecordings);
  };

  const stopRecording = async () => {
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      // Update the recordings array with the new URI at the currentRecordingIndex
      const updatedRecordings = recordings.map((rec, index) => index === currentRecordingIndex ? uri : rec);
      setRecordings(updatedRecordings);
      setRecording(null);
      console.log('Recording stopped and stored at ', uri);
    } catch (errorEvent) {
      console.error('Failed to stopRecording(): ', errorEvent);
    }
  };

  const playRecording = async () => {
    const { sound } = await Audio.Sound.createAsync({
      uri: recordingUri,
    });
    setPlayback(sound);
    await sound.replayAsync();
    console.log('Playing recorded sound from ', recordingUri);
  }

  // This effect hook will make sure the app stops recording when it ends
  useEffect(() => {
    return recording
      ? recording.stopAndUnloadAsync()
      : undefined;
  }, []);

  const getRandomColor = () => {
    // Generates a random color in hex format
    return '#' + Math.floor(Math.random()*16777215).toString(16);
  }

  const renderGridButton = (uri, index) => {
    const buttonColor = uri ? getRandomColor() : 'pink';
    return (
      <TouchableOpacity
        key={index}
        onPress={() => uri ? handlePlayPress(uri) : () => handleRecordPress()}
        onLongPress={() => handleLongPress(index)}
        style={[styles.gridButton, { backgroundColor: buttonColor }]}
      />
    );
  };


  return (
    <View style={styles.container}>
      <View style={styles.recordingButtonContainer}>
        <TouchableOpacity
          style={styles.recordingButton}
          onPress={recording ? stopRecording : () => handleRecordPress(currentRecordingIndex)}
        >
          <Text style={styles.recordingButtonText}>
            {recording ? 'Stop Recording' : 'Start Recording'}
          </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.gridContainer}>
        {recordings.map((uri, index) => renderGridButton(uri, index))}
      </ScrollView>
    </View>
  );
  
}


const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff', // Consider using a different background color for the entire app
  },
  recordingButtonContainer: {
    padding: 20,
  },
  recordingButton: {
    backgroundColor: '#ff5252', // A red color for the recording button
    borderRadius: 30, // Circular edges
    paddingVertical: 15,
    paddingHorizontal: 30,
    alignSelf: 'center',
    marginVertical: 20, // Add some vertical space from the grid
  },
  recordingButtonText: {
    color: '#fff', // White text color
    fontSize: 18,
    textAlign: 'center',
  },
  gridContainer: {
    padding: 16, // Add padding around the grid
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around', // This will space your buttons nicely
    alignItems: 'flex-start',
  },
  gridButton: {
    margin: 5,
    width: 50, // Adjust for square shape
    height: 50, // Adjust for square shape
    justifyContent: 'center', // Center the button text
    alignItems: 'center', // Center the button text
    borderRadius: 5, // Optional: if you want rounded corners
  },
});
