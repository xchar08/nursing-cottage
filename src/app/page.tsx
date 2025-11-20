"use client";
import React, { useState, Suspense, useRef } from "react";
import { 
  Container, Heading, VStack, HStack, Text, 
  Textarea, Button, Checkbox, CheckboxGroup, Stack, Box, 
  Badge, useToast, Input, Progress, Select
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { BookOpen, Box as BoxIcon, Activity, UploadCloud } from "lucide-react";

import { SkeletonModel, HeartModel } from "@/components/models/ProceduralModels";
import DiagramMapper from "@/components/DiagramMapper";
import FeedbackGif from "@/components/FeedbackGif";
import FlashcardGame from "@/components/FlashcardGame";
import { parsePdf, parsePptx } from "@/utils/fileParser";

export default function App() {
  const [tab, setTab] = useState("quiz");
  const [currentDiagram, setCurrentDiagram] = useState("heart");
  const [notes, setNotes] = useState("");
  const [types, setTypes] = useState<string[]>(["multiple_choice", "3d_model_matching"]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<'idle'|'correct'|'wrong'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // --- HOTSPOT CONFIGURATIONS ---
  const allHotspots: Record<string, any[]> = {
    heart: [
      { id: '1', label: 'Superior Vena Cava', cx: 38, cy: 20, r: 14 },
      { id: '2', label: 'Aorta', cx: 50, cy: 12, r: 16 },
      { id: '3', label: 'Pulmonary Artery', cx: 58, cy: 22, r: 14 },
      { id: '4', label: 'Right Atrium', cx: 32, cy: 35, r: 18 },
      { id: '5', label: 'Right Ventricle', cx: 40, cy: 60, r: 22 },
      { id: '6', label: 'Left Atrium', cx: 68, cy: 32, r: 15 },
      { id: '7', label: 'Left Ventricle', cx: 65, cy: 65, r: 25 },
      { id: '8', label: 'Inferior Vena Cava', cx: 30, cy: 75, r: 14 },
      { id: '9', label: 'Pulmonary Veins', cx: 78, cy: 35, r: 12 }
    ],
    lungs: [
      { id: '1', label: 'Trachea', cx: 50, cy: 20, r: 15 },
      { id: '2', label: 'Right Bronchus', cx: 42, cy: 35, r: 12 },
      { id: '3', label: 'Left Bronchus', cx: 58, cy: 35, r: 12 },
      { id: '4', label: 'Right Upper Lobe', cx: 30, cy: 45, r: 25 },
      { id: '5', label: 'Left Upper Lobe', cx: 70, cy: 45, r: 25 },
      { id: '6', label: 'Diaphragm', cx: 50, cy: 85, r: 30 }
    ],
    digestive: [
      { id: '1', label: 'Esophagus', cx: 50, cy: 10, r: 15 },
      { id: '2', label: 'Liver', cx: 35, cy: 25, r: 25 },
      { id: '3', label: 'Stomach', cx: 65, cy: 30, r: 22 },
      { id: '4', label: 'Large Intestine', cx: 50, cy: 55, r: 30 },
      { id: '5', label: 'Small Intestine', cx: 50, cy: 70, r: 25 }
    ],
    brain: [
      { id: '1', label: 'Frontal Lobe', cx: 30, cy: 30, r: 25 },
      { id: '2', label: 'Parietal Lobe', cx: 60, cy: 20, r: 20 },
      { id: '3', label: 'Occipital Lobe', cx: 85, cy: 45, r: 18 },
      { id: '4', label: 'Temporal Lobe', cx: 50, cy: 55, r: 20 },
      { id: '5', label: 'Cerebellum', cx: 75, cy: 70, r: 18 },
      { id: '6', label: 'Brainstem', cx: 50, cy: 80, r: 15 }
    ],
    kidneys: [
      { id: '1', label: 'Cortex', cx: 25, cy: 30, r: 20 },
      { id: '2', label: 'Medulla', cx: 75, cy: 30, r: 20 },
      { id: '3', label: 'Renal Pelvis', cx: 50, cy: 50, r: 18 },
      { id: '4', label: 'Renal Artery (Red)', cx: 55, cy: 65, r: 10 },
      { id: '5', label: 'Renal Vein (Blue)', cx: 45, cy: 65, r: 10 },
      { id: '6', label: 'Ureter', cx: 50, cy: 90, r: 12 }
    ]
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    setLoading(true);
    setUploadProgress(0);
    
    try {
      const allContent: string[] = [];
      const totalFiles = files.length;
      
      toast({ 
        title: `Processing ${totalFiles} file${totalFiles > 1 ? 's' : ''}...`, 
        status: "info", 
        duration: 2000 
      });

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let content = "";
        
        try {
          if (file.name.endsWith(".pdf")) {
            content = await parsePdf(file);
          } 
          else if (file.name.endsWith(".pptx")) {
            content = await parsePptx(file);
          }
          else {
            content = await file.text();
          }

          if (content.trim()) {
            allContent.push(`\n========== ${file.name} ==========\n${content}`);
          }
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          toast({ title: `Skipped: ${file.name}`, status: "warning" });
        }
        
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      if (allContent.length === 0) throw new Error("No text extracted");

      const combinedNotes = allContent.join("\n\n");
      setNotes(combinedNotes);
      
      toast({ title: "Success!", description: "Notes imported.", status: "success" });
    } catch (error) {
      console.error(error);
      toast({ title: "Error", description: "Failed to process files.", status: "error" });
    }
    
    setLoading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const generate = async () => {
    if (!notes.trim()) {
      toast({ title: "Please enter study notes first.", status: "warning" });
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/generate-quiz", { 
        method: "POST", 
        body: JSON.stringify({ text: notes, types }) 
      });
      
      if (!res.ok) throw new Error("Failed to fetch");
      
      const data = await res.json();
      if (data.questions && Array.isArray(data.questions)) {
        setQuiz(data.questions);
        toast({ title: "Assessment Generated!", status: "success" });
      } else {
        throw new Error("Invalid format");
      }
    } catch (e) {
      toast({ title: "Error generating quiz", description: "Please try again.", status: "error" });
    }
    setLoading(false);
  };

  return (
    <Box minH="100vh" pb={20} bg="cottage.bg">
      <FeedbackGif state={feedback} reset={() => setFeedback('idle')} />
      
      <Box bg="cottage.Sage500" py={10} px={4} borderBottomRadius="3xl" mb={8} boxShadow="sm">
        <Container maxW="container.lg" textAlign="center">
          <Heading color="white" fontFamily="heading" size="2xl" mb={2}>The Nursing Cottage 🌿</Heading>
          <Text color="whiteAlpha.900" fontSize="lg">Cozy study tools for serious students.</Text>
        </Container>
      </Box>

      <Container maxW="container.lg">
        <HStack spacing={4} mb={8} justify="center" wrap="wrap">
          {[
            { id: "quiz", icon: BookOpen, label: "Quiz Studio" },
            { id: "library", icon: BoxIcon, label: "Model Library" },
            { id: "diagrams", icon: Activity, label: "2D Diagrams" }
          ].map((item) => (
            <Button
              key={item.id}
              leftIcon={<item.icon size={18} />}
              bg={tab === item.id ? "cottage.Terra500" : "white"}
              color={tab === item.id ? "white" : "cottage.text"}
              shadow="sm"
              onClick={() => setTab(item.id)}
              _hover={{ transform: "translateY(-2px)", shadow: "md" }}
              size="lg"
              transition="all 0.2s"
            >
              {item.label}
            </Button>
          ))}
        </HStack>

        <AnimatePresence mode="wait">
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
          >
            {tab === "quiz" && (
              <VStack spacing={8} align="stretch">
                <Box bg="white" p={8} borderRadius="3xl" shadow="sm" border="1px solid" borderColor="cottage.Sage500">
                  <HStack justify="space-between" mb={4} wrap="wrap">
                    <Heading size="md" color="cottage.Sage600">1. Study Notes</Heading>
                    
                    <Button 
                      leftIcon={<UploadCloud size={18} />} 
                      size="sm" 
                      variant="outline" 
                      colorScheme="green"
                      isLoading={loading && !notes}
                      loadingText="Processing..."
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Files
                    </Button>
                    <Input 
                      type="file" 
                      accept=".txt,.md,.json,.pdf,.pptx"
                      multiple
                      display="none" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                  </HStack>

                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} colorScheme="green" size="sm" borderRadius="full" mb={4} />
                  )}

                  <Textarea 
                    placeholder="Paste notes here OR upload files..." 
                    rows={8} 
                    bg="cottage.paper" 
                    border="1px solid"
                    borderColor="gray.200"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    _focus={{ borderColor: "cottage.Sage500", boxShadow: "none" }}
                    mb={6}
                  />

                  <Heading size="md" mb={4} color="cottage.Sage600">2. Assessment Types</Heading>
                  <CheckboxGroup value={types} onChange={(v) => setTypes(v as string[])}>
                    <Stack direction={{ base: "column", md: "row" }} spacing={8} wrap="wrap">
                      <VStack align="start">
                        <Checkbox value="multiple_choice" colorScheme="green" size="lg">Multiple Choice</Checkbox>
                        <Checkbox value="sata" colorScheme="green" size="lg">Select All That Apply</Checkbox>
                      </VStack>
                      <VStack align="start">
                        <Checkbox value="matching" colorScheme="pink" size="lg">Matching Terms</Checkbox>
                        <Checkbox value="fill_in_blank" colorScheme="pink" size="lg">Fill in Blank</Checkbox>
                      </VStack>
                      <VStack align="start">
                        <Checkbox value="frq" colorScheme="orange" size="lg">Free Response</Checkbox>
                        <Checkbox value="3d_model_matching" colorScheme="purple" size="lg">3D Practicals</Checkbox>
                      </VStack>
                    </Stack>
                  </CheckboxGroup>

                  <Button 
                    mt={8} 
                    w="full" 
                    size="lg" 
                    variant="solid" 
                    isLoading={loading && !!notes}
                    onClick={generate}
                    bg="cottage.Sage500"
                    color="white"
                    _hover={{ bg: "cottage.Sage600" }}
                  >
                    Generate Assessment
                  </Button>
                </Box>

                {quiz.length > 0 && (
                  <Box>
                    <FlashcardGame 
                      questions={quiz} 
                      onFeedback={(isCorrect) => setFeedback(isCorrect ? 'correct' : 'wrong')} 
                    />
                  </Box>
                )}
              </VStack>
            )}

            {tab === "library" && (
              <VStack spacing={6}>
                <Heading size="md" color="cottage.Sage600">Interactive 3D Library</Heading>
                <Box w="full" h="600px" borderRadius="3xl" overflow="hidden" bg="gray.100" shadow="inner" position="relative">
                  <Canvas camera={{ position: [0, 0, 6] }}>
                    <Environment preset="city" />
                    <Suspense fallback={null}>
                      <group position={[-2, -0.5, 0]}>
                        <SkeletonModel onClick={(part) => toast({ title: `Skeleton: ${part}`, status: 'info' })} labels={['Skull', 'Ribcage', 'Pelvis']} />
                      </group>
                      <group position={[2, 0.5, 0]}>
                        <HeartModel onClick={(part) => toast({ title: `Heart: ${part}`, status: 'info' })} labels={['Aorta', 'Left Ventricle']} />
                      </group>
                    </Suspense>
                    <OrbitControls />
                  </Canvas>
                </Box>
              </VStack>
            )}

            {tab === "diagrams" && (
              <VStack spacing={6}>
                <HStack justify="space-between" w="full" maxW="800px">
                   <Heading size="md" color="cottage.Sage600">Micro-Anatomy Reference</Heading>
                   <Select 
                     w="200px" 
                     value={currentDiagram} 
                     onChange={(e) => setCurrentDiagram(e.target.value)}
                     bg="white"
                   >
                     <option value="heart">Heart</option>
                     <option value="lungs">Lungs</option>
                     <option value="digestive">Digestive System</option>
                     <option value="brain">Brain</option>
                     <option value="kidneys">Kidneys</option>
                   </Select>
                </HStack>
                
                <Box maxW="800px" mx="auto">
                  <DiagramMapper 
                    src={`/diagrams/${currentDiagram}.jpg`} 
                    hotspots={allHotspots[currentDiagram] || []}
                    onPartClick={(lbl) => toast({ title: `Structure: ${lbl}`, status: 'info', duration: 2000 })}
                  />
                </Box>
                <Text fontSize="sm" color="gray.500" fontStyle="italic">
                  Hover or click on structures to reveal labels.
                </Text>
              </VStack>
            )}
          </motion.div>
        </AnimatePresence>
      </Container>
    </Box>
  );
}
