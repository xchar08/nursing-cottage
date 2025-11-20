"use client";
import { Box, Image, Tooltip } from "@chakra-ui/react";
import { motion } from "framer-motion";

interface Hotspot { id: string; label: string; cx: number; cy: number; r: number; }

export default function DiagramMapper({ src, hotspots, onPartClick }: { src: string, hotspots: Hotspot[], onPartClick: (lbl: string) => void }) {
  return (
    <Box position="relative" borderRadius="3xl" overflow="hidden" boxShadow="lg" border="4px solid" borderColor="white">
      <Image src={src} alt="Anatomy" w="100%" />
      <svg style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {hotspots.map((spot) => (
          <motion.circle
            key={spot.id}
            cx={`${spot.cx}%`}
            cy={`${spot.cy}%`}
            r={spot.r}
            fill="rgba(255, 255, 255, 0.3)"
            stroke="#8DA399"
            strokeWidth="2"
            style={{ cursor: 'pointer' }}
            whileHover={{ scale: 1.2, fill: "rgba(141, 163, 153, 0.6)" }}
            onClick={() => onPartClick(spot.label)}
          />
        ))}
      </svg>
      {hotspots.map((spot) => (
        <Tooltip key={spot.id} label={spot.label} bg="cottage.Sage500">
          <Box position="absolute" left={`${spot.cx}%`} top={`${spot.cy}%`} w={`${spot.r*2}px`} h={`${spot.r*2}px`} transform="translate(-50%,-50%)" pointerEvents="none" />
        </Tooltip>
      ))}
    </Box>
  );
}
