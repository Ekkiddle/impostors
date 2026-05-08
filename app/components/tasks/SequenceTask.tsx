'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { EmbossedDiv } from '../CustomDivs';

interface SequenceTaskProps {
  onSuccess?: () => void;
}

const getRandomSequence = () => {
  return Array.from({ length: 5 }, () => Math.floor(Math.random() * 9));
};

export default function SequenceTask({ onSuccess }: SequenceTaskProps) {
  const [sequence, setSequence] = useState(getRandomSequence);
  const [stage, setStage] = useState(1);
  const [input, setInput] = useState<number[]>([]);
  const [showSequence, setShowSequence] = useState(true);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(false);

  // Playback logic: Controls the "blinking" lights
  useEffect(() => {
    if (!showSequence || stage > 5) return;

    if (highlightIndex === -1) {
      // Small delay before starting the playback
      const startTimer = setTimeout(() => setHighlightIndex(0), 500);
      return () => clearTimeout(startTimer);
    }

    if (isPaused) {
      // The "off" phase between blinks
      const pauseTimer = setTimeout(() => {
        setIsPaused(false);
        if (highlightIndex < stage - 1) {
          setHighlightIndex(prev => prev + 1);
        } else {
          // Finished showing the sequence for the current stage
          setShowSequence(false);
        }
      }, 200);
      return () => clearTimeout(pauseTimer);
    } else {
      // The "on" phase
      const highlightTimer = setTimeout(() => {
        setIsPaused(true);
      }, 600);
      return () => clearTimeout(highlightTimer);
    }
  }, [highlightIndex, isPaused, showSequence, stage]);

  const handleButtonClick = (index: number) => {
    if (showSequence || stage > 5) return;

    const correctValue = sequence[input.length];

    if (index !== correctValue) {
      setError(true);
      setInput([]);
      setShowSequence(true);
      setHighlightIndex(-1);
      setIsPaused(false);
      // Brief red light for error
      setTimeout(() => setError(false), 1000);
      return;
    }

    const newInput = [...input, index];
    setInput(newInput);

    if (newInput.length === stage) {
      if (stage === 5) {
        setStage(6); // Success state
        if (onSuccess) onSuccess();
      } else {
        // Move to next stage
        setTimeout(() => {
          setStage(prev => prev + 1);
          setInput([]);
          setHighlightIndex(-1);
          setShowSequence(true);
          setIsPaused(false);
        }, 500);
      }
    }
  };

  const renderGridSquare = (index: React.Key | null | undefined) => {
    let isLit = false;
    if (showSequence && highlightIndex >= 0 && !isPaused) {
      isLit = sequence[highlightIndex] === index;
    }

    return (
      <div
        key={index}
        className={`w-[95%] aspect-square relative m-1 ${isLit ? 'bg-blue-500' : 'bg-black'}`}
      >
      </div>
    );
  };



  return (
    <div className="flex items-center justify-center h-full w-full bg-gray-300">
      <EmbossedDiv className='w-full h-full bg-gray-300'>

        <div className="relative z-20 flex flex-col items-center justify-center h-full w-full p-6">
          <div className="flex space-x-3 mb-4">
            {Array.from({ length: 5 }, (_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-3 border-black ${error
                  ? 'bg-red-500'
                  : i < stage - 1
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                  }`}
              />
            ))}
          </div>

          <div className="flex flex-row justify-center gap-4 w-full">
            {/* Display Section (Left) */}
            <div className="w-[45%] aspect-square bg-black p-2 rounded-lg grid grid-cols-3 gap-1">
              {Array.from({ length: 9 }, (_, i) => renderGridSquare(i))}
            </div>

            {/* Button Grid Section (Right) */}
            <div className="w-[45%] aspect-square grid grid-cols-3 gap-2">
              {Array.from({ length: 9 }, (_, i) => (
                <EmbossedDiv
                  key={i}
                  className='w-full aspect-square cursor-pointer bg-gray-400 active:bg-gray-500 border-black border-3'
                  innerDimensions={{ left: 10, right: 90, top: 10, bottom: 90 }}
                  onClick={() => handleButtonClick(i)}
                >
                </EmbossedDiv>))}
            </div>
          </div>
        </div>
      </EmbossedDiv>
    </div>
  );
}
