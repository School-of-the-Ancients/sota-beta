import { useState, useEffect, useRef } from 'react';

const FADE_DURATION = 1000; // 1 second fade

export const useAmbientAudio = (initialSrc: string | null) => {
  const [isMuted, setIsMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const targetVolumeRef = useRef(0.3); // Consistent low volume for ambience

  // Main effect for creating and cleaning up the audio element
  useEffect(() => {
    if (!audioRef.current) {
        audioRef.current = new Audio();
        audioRef.current.loop = true;
    }
    const audio = audioRef.current;

    return () => {
      audio.pause();
      audioRef.current = null;
    };
  }, []);
  
  const fadeAudio = (audio: HTMLAudioElement, targetVolume: number) => {
    const startVolume = audio.volume;
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const elapsedTime = timestamp - startTime;
      const progress = Math.min(elapsedTime / FADE_DURATION, 1);
      
      audio.volume = startVolume + (targetVolume - startVolume) * progress;

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        if (targetVolume === 0) {
          audio.pause();
        }
      }
    };
    
    if (targetVolume > 0 && audio.paused) {
      audio.play().catch(e => console.error("Audio play failed:", e));
    }

    requestAnimationFrame(animate);
  };


  const changeTrack = (newSrc: string | null) => {
    const audio = audioRef.current;
    if (!audio) return;

    const change = () => {
        if (newSrc) {
            audio.src = newSrc;
            if (!isMuted) {
                fadeAudio(audio, targetVolumeRef.current);
            }
        } else {
            // If newSrc is null, just pause current track
            if (!audio.paused) {
                fadeAudio(audio, 0);
            }
        }
    }

    if (!audio.paused && audio.src) {
        fadeAudio(audio, 0);
        setTimeout(change, FADE_DURATION);
    } else {
        change();
    }
  };

  const toggleMute = () => {
    setIsMuted(prevMuted => {
      const newMuted = !prevMuted;
      const audio = audioRef.current;
      if (audio) {
        if (newMuted) {
          fadeAudio(audio, 0);
        } else {
            if (audio.src && !audio.src.endsWith('null')) { // Check if there's a valid source before playing
                fadeAudio(audio, targetVolumeRef.current);
            }
        }
      }
      return newMuted;
    });
  };

  useEffect(() => {
    changeTrack(initialSrc);
  }, [initialSrc]);


  return { isMuted, toggleMute, changeTrack };
};
