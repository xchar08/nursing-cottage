"use client";
import React, { useState } from 'react';
import { Box, Image, Tooltip } from '@chakra-ui/react';
import { motion } from 'framer-motion';

interface Hotspot {
  id: string;
  label: string;
  cx: number; // % from left
  cy: number; // % from top
  r: number;  // radius in pixels
}

interface Props {
  src: string;
  hotspots: Hotspot[];
  onPartClick: (label: string) => void;
}

// Create a motion-enabled Box correctly to avoid type conflicts
const MotionBox = motion(Box);

export default function DiagramMapper({ src, hotspots, onPartClick }: Props) {
  const [hovered, setHovered] = useState<string | null>(null);

  return (
    <Box position="relative" w="full" maxW="800px" mx="auto">
      <Image src={src} alt="Anatomical diagram" borderRadius="xl" />
      
      {hotspots.map(spot => (
        <Tooltip key={spot.id} label={spot.label} placement="top" hasArrow>
          <MotionBox
            position="absolute"
            left={`${spot.cx}%`}
            top={`${spot.cy}%`}
            w={`${spot.r * 2}px`}
            h={`${spot.r * 2}px`}
            borderRadius="full"
            bg="rgba(0, 150, 255, 0.4)"
            border="2px solid white"
            cursor="pointer"
            transform="translate(-50%, -50%)"
            onMouseEnter={() => setHovered(spot.id)}
            onMouseLeave={() => setHovered(null)}
            onClick={() => onPartClick(spot.label)}
            
            // Framer Motion props now work correctly without conflict
            whileHover={{ scale: 1.2, filter: 'brightness(1.2)' }}
            transition={{ type: 'spring', stiffness: 400, damping: 10 }}
            
            style={{
              boxShadow: '0 0 10px rgba(0,0,0,0.3)',
            }}
          />
        </Tooltip>
      ))}
    </Box>
  );
}
