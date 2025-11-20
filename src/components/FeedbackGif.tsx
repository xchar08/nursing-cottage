"use client";
import { Box, Image } from "@chakra-ui/react";
import { useEffect, useState, useRef } from "react";
import gsap from "gsap";

export default function FeedbackGif({ state, reset }: { state: 'correct'|'wrong'|'idle', reset: () => void }) {
  const [src, setSrc] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    if (state === 'idle') return;
    const folder = state === 'correct' ? 'dog' : 'monkey';
    const num = Math.floor(Math.random() * 2) + 1;
    setSrc(`/assets/${folder}/${num}.gif`);

    const ctx = gsap.context(() => {
      gsap.timeline({ onComplete: reset })
        .fromTo(ref.current, { y: 100, opacity: 0, scale: 0.5 }, { y: 0, opacity: 1, scale: 1, duration: 0.6, ease: "back.out(1.7)" })
        .to(ref.current, { y: 0, duration: 2 })
        .to(ref.current, { y: 100, opacity: 0, duration: 0.4 });
    });
    return () => ctx.revert();
  }, [state, reset]);

  if (state === 'idle') return null;

  return (
    <Box ref={ref} position="fixed" bottom="40px" right="40px" zIndex={9999} p={2} bg="white" borderRadius="full" boxShadow="xl" border="5px solid" borderColor={state === 'correct' ? "#8DA399" : "#D4A3A3"}>
      <Image src={src} boxSize="180px" objectFit="cover" borderRadius="full" alt="feedback" />
    </Box>
  );
}
