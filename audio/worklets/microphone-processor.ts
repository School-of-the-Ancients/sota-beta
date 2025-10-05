class MicrophoneProcessor extends AudioWorkletProcessor {
  process(inputs: Float32Array[][]) {
    const input = inputs[0];
    if (input && input[0]) {
      const channelData = input[0];
      const chunk = channelData.slice();
      this.port.postMessage(chunk, [chunk.buffer]);
    }
    return true;
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
export {};
