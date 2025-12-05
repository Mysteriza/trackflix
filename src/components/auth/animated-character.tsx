
"use client";

import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';

interface AnimatedCharacterProps {
  state: 'idle' | 'tracking' | 'peeking';
}

export function AnimatedCharacter({ state }: AnimatedCharacterProps) {
  const [eyeStyle, setEyeStyle] = useState({});
  const [handLStyle, setHandLStyle] = useState({});
  const [handRStyle, setHandRStyle] = useState({});

  const normalEyeStyle = {
    left: '0.6em',
    top: '0.6em',
  };

  const trackingEyeStyle = {
    left: '0.75em',
    top: '1.12em',
  };

  const normalHandStyle = {
    height: '2.81em',
    top: '8.4em',
    left: '7.5em',
    transform: 'rotate(0deg)',
  };
  
  const normalHandRStyle = {
    height: '2.81em',
    top: '8.4em',
    right: '7.5em',
    transform: 'rotate(0deg)',
  };

  const peekingHandLStyle = {
    height: '6.56em',
    top: '3.87em',
    left: '7.8em',
    transform: 'rotate(-155deg)',
  };

  const peekingHandRStyle = {
    height: '6.56em',
    top: '3.87em',
    right: '7.8em',
    transform: 'rotate(155deg)',
  };
  
  useEffect(() => {
    if (state === 'tracking') {
      setEyeStyle(trackingEyeStyle);
      setHandLStyle(normalHandStyle);
      setHandRStyle(normalHandRStyle);
    } else if (state === 'peeking') {
      setEyeStyle(normalEyeStyle);
      setHandLStyle(peekingHandLStyle);
      setHandRStyle(peekingHandRStyle);
    } else { // idle
      setEyeStyle(normalEyeStyle);
      setHandLStyle(normalHandStyle);
      setHandRStyle(normalHandRStyle);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);


  return (
    <div className="relative w-[21.25em] h-[19em] max-w-full mx-auto" style={{fontSize: '14px'}}>
      {/* Ears */}
      <div className="absolute top-[1.75em] left-[5.75em] w-[2.81em] h-[2.5em] bg-primary rounded-t-full transform -rotate-38 border border-foreground/50"></div>
      <div className="absolute top-[1.75em] right-[5.75em] w-[2.81em] h-[2.5em] bg-primary rounded-t-full transform rotate-38 border border-foreground/50"></div>

      {/* Face */}
      <div className="absolute top-[2em] left-0 right-0 mx-auto w-[8.4em] h-[7.5em] bg-background border border-foreground/50 rounded-b-2xl rounded-t-full">
        {/* Blushes */}
        <div className="absolute top-[4em] left-[1em] w-[1.37em] h-[1em] bg-pink-300 rounded-full transform rotate-25"></div>
        <div className="absolute top-[4em] right-[1em] w-[1.37em] h-[1em] bg-pink-300 rounded-full transform -rotate-25"></div>

        {/* Eyes */}
        <div className="absolute top-[2.18em] left-[1.37em] w-[2em] h-[2.18em] bg-primary rounded-full transform -rotate-20">
          <div className="eyeball absolute w-[0.6em] h-[0.6em] bg-white rounded-full transform rotate-20" style={eyeStyle}></div>
        </div>
        <div className="absolute top-[2.18em] right-[1.37em] w-[2em] h-[2.18em] bg-primary rounded-full transform rotate-20">
          <div className="eyeball absolute w-[0.6em] h-[0.6em] bg-white rounded-full transform -rotate-20" style={eyeStyle}></div>
        </div>
        
        {/* Nose */}
        <div className="absolute top-[4.37em] left-0 right-0 mx-auto w-[1em] h-[1em] bg-primary transform rotate-45 rounded-tl-full rounded-tr-sm rounded-bl-sm rounded-br-sm">
          <div className="absolute w-[0.1em] h-[0.6em] bg-primary transform -rotate-45 top-[0.75em] left-[1em]"></div>
        </div>
        
        {/* Mouth */}
        <div className="absolute top-[5.31em] left-[3.12em] w-[0.93em] h-[0.75em] border-b-2 border-primary rounded-full"></div>
        <div className="absolute top-[5.31em] left-[4.05em] w-[0.93em] h-[0.75em] border-b-2 border-primary rounded-full"></div>
      </div>
      
      {/* Hands */}
      <div className="hand absolute w-[2.5em] border border-foreground/50 bg-primary rounded-b-2xl rounded-t-md" style={handLStyle}></div>
      <div className="hand absolute w-[2.5em] border border-foreground/50 bg-primary rounded-b-2xl rounded-t-md" style={handRStyle}></div>
    </div>
  );
}
