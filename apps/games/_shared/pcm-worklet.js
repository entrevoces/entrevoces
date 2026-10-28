// AudioWorklet: zero-output microphone tap. Runs only after the player consents.
class EntreVocesPcm extends AudioWorkletProcessor {
  process(inputs,outputs){const channel=inputs[0]?.[0];if(channel?.length)this.port.postMessage(new Float32Array(channel));for(const channels of outputs)for(const output of channels)output.fill(0);return true;}
}
registerProcessor('entre-voces-pcm',EntreVocesPcm);
