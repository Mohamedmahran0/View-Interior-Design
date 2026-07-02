'use client';

import { useState, useEffect } from 'react';

export default function Typewriter({ phrases, speed = 80, pause = 2500 }: { phrases: string[], speed?: number, pause?: number }) {
  const [text, setText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [loopNum, setLoopNum] = useState(0);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    
    const handleType = () => {
      const i = loopNum % phrases.length;
      const fullText = phrases[i];

      setText(isDeleting 
        ? fullText.substring(0, text.length - 1) 
        : fullText.substring(0, text.length + 1)
      );

      let typingSpeed = speed;
      if (isDeleting) typingSpeed /= 2; // erase faster

      if (!isDeleting && text === fullText) {
        typingSpeed = pause; // Wait before erasing
        setIsDeleting(true);
      } else if (isDeleting && text === '') {
        setIsDeleting(false);
        setLoopNum(loopNum + 1);
        typingSpeed = 500; // Wait before typing next
      }

      timer = setTimeout(handleType, typingSpeed);
    };

    timer = setTimeout(handleType, isDeleting ? speed / 2 : speed);
    return () => clearTimeout(timer);
  }, [text, isDeleting, loopNum, phrases, speed, pause]);

  return (
    <span className="inline-block text-emerald-400 font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-cyan-400">
      {text}
      <span className="animate-pulse text-white/50 inline-block font-normal w-[4px] ml-1">|</span>
    </span>
  );
}
