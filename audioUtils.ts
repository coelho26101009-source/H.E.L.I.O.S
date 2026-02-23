export const PCM_SAMPLE_RATE = 24000;

export const base64ToUint8Array = (base64: string) => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export const createPcmBlob = (channelData: Float32Array) => {
  const pcm16 = new Int16Array(channelData.length);
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    pcm16[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return new Blob([pcm16], { type: 'audio/pcm' });
};

export const decodeAudioData = async (
  audioData: Uint8Array,
  audioContext: AudioContext,
  sampleRate: number = 24000
): Promise<AudioBuffer> => {
  const audioBuffer = audioContext.createBuffer(1, audioData.length, sampleRate);
  const channelData = audioBuffer.getChannelData(0);
  for (let i = 0; i < audioData.length; i++) {
    const int16 = (audioData[2 * i + 1] << 8) | audioData[2 * i];
    channelData[i] = int16 / 32768.0; 
  }
  return audioBuffer;
};
export const floatTo16BitPcmBase64 = (input: Float32Array): string => {
  const buffer = new ArrayBuffer(input.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true); // Little-endian
  }
  let binary = '';
  const bytes = new Uint8Array(buffer);
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};