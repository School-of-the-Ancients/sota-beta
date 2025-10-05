/// <reference lib="webworker" />

class PCMProcessor extends AudioWorkletProcessor {
    process(inputs: Float32Array[][]): boolean {
        const [input] = inputs;
        if (!input || input.length === 0) {
            return true;
        }

        const channelData = input[0];
        if (!channelData || channelData.length === 0) {
            return true;
        }

        const copy = channelData.slice();
        this.port.postMessage(copy, [copy.buffer]);
        return true;
    }
}

registerProcessor('pcm-processor', PCMProcessor);

export {};
