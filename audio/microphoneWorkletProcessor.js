class MicrophoneProcessor extends AudioWorkletProcessor {
  process(inputs) {
    if (!inputs || inputs.length === 0 || inputs[0].length === 0) {
      return true;
    }

    const inputChannelData = inputs[0][0];
    if (inputChannelData) {
      this.port.postMessage(inputChannelData.slice());
    }
    return true;
  }
}

registerProcessor('microphone-processor', MicrophoneProcessor);
