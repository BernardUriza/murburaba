// Simple test to verify the audio file fix

async function testAudioFile() {
  try {
    console.log('Testing if jfk_speech.wav is accessible...');
    const response = await fetch('http://localhost:3002/jfk_speech.wav');
    
    if (response.ok) {
      const contentType = response.headers.get('content-type');
      const contentLength = response.headers.get('content-length');
      console.log('✅ Audio file found!');
      console.log(`   Content-Type: ${contentType}`);
      console.log(`   Size: ${contentLength} bytes`);
    } else {
      console.log('❌ Audio file not found:', response.status);
    }
  } catch (error) {
    console.error('Error fetching audio file:', error);
  }
}

testAudioFile();