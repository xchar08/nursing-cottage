"use client";
import React, { useState, Suspense, useRef } from "react";
import { 
  Container, Heading, VStack, HStack, Text, 
  Textarea, Button, Checkbox, CheckboxGroup, Stack, Box, 
  Badge, useToast, Input, Progress
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
  const [notes, setNotes] = useState("");
  const [types, setTypes] = useState<string[]>(["multiple_choice", "3d_model_matching"]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<'idle'|'correct'|'wrong'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // --- MULTI-FILE UPLOAD LOGIC ---
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

      // Process each file
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
            // Plain text files
            content = await file.text();
          }

          if (content.trim()) {
            // Add a header for each file to separate them
            allContent.push(`\n========== ${file.name} ==========\n${content}`);
          }
        } catch (fileError) {
          console.error(`Error processing ${file.name}:`, fileError);
          toast({ 
            title: `Skipped: ${file.name}`, 
            description: "Could not extract text.", 
            status: "warning",
            duration: 2000
          });
        }
        
        // Update progress
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }

      if (allContent.length === 0) {
        throw new Error("No text could be extracted from any file");
      }

      // Concatenate all extracted content
      const combinedNotes = allContent.join("\n\n");
      setNotes(combinedNotes);
      
      toast({ 
        title: "Success!", 
        description: `${allContent.length} file${allContent.length > 1 ? 's' : ''} imported.`, 
        status: "success" 
      });
    } catch (error) {
      console.error(error);
      toast({ 
        title: "Error", 
        description: "Failed to process files.", 
        status: "error" 
      });
    }
    
    setLoading(false);
    setUploadProgress(0);
    
    // Reset input so same files can be re-uploaded if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
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
                      Upload Files (Multiple)
                    </Button>
                    <Input 
                      type="file" 
                      accept=".txt,.md,.json,.pdf,.pptx"
                      multiple // <--- KEY CHANGE: Allow multiple files
                      display="none" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                    />
                  </HStack>

                  {/* Progress Bar */}
                  {uploadProgress > 0 && uploadProgress < 100 && (
                    <Progress value={uploadProgress} colorScheme="green" size="sm" borderRadius="full" mb={4} />
                  )}

                  <Textarea 
                    placeholder="Paste notes here OR upload multiple PDFs/PowerPoints..." 
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
                <Heading size="md" color="cottage.Sage600">Micro-Anatomy Reference</Heading>
                <Box maxW="800px" mx="auto">
                  <DiagramMapper 
                    src="/diagrams/heart.jpg" 
                    hotspots={[
                      { id: '1', label: 'Superior Vena Cava', cx: 30, cy: 20, r: 15 },
                      { id: '2', label: 'Aorta', cx: 50, cy: 15, r: 20 },
                    ]}
                    onPartClick={(lbl) => toast({ title: `Structure: ${lbl}`, status: 'info', duration: 2000 })}
                  />
                </Box>
              </VStack>
            )}
          </motion.div>
        </AnimatePresence>
      </Container>
    </Box>
  );
}
