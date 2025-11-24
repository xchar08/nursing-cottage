"use client";
import React, { useState, useEffect, useRef, Suspense } from "react";
import { 
  Container, Heading, VStack, HStack, Text, 
  Textarea, Button, Stack, Box, 
  useToast, Input, Progress, Select, 
  Modal, ModalOverlay, ModalContent, ModalHeader, ModalBody, 
  ModalCloseButton, ModalFooter, useDisclosure, Divider, Icon,
  Menu, MenuButton, MenuList, MenuItem, IconButton,
  SimpleGrid, Badge, Wrap, WrapItem, Tag, TagLabel, TagCloseButton
} from "@chakra-ui/react";
import { AnimatePresence, motion } from "framer-motion";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Environment } from "@react-three/drei";
import { 
  BookOpen, Box as BoxIcon, Activity, UploadCloud, 
  Plus, LogOut, Save, Mail, ChevronDown, Trash2, FolderOpen,
  Clock, FileText, Smartphone
} from "lucide-react";
import { FaGoogle } from "react-icons/fa"; 

import { supabase } from "@/lib/supabase";
import { signInWithEmail, signInWithGoogle } from "./auth/actions";

import { SkeletonModel, HeartModel } from "@/components/models/ProceduralModels";
import DiagramMapper from "@/components/DiagramMapper";
import FeedbackGif from "@/components/FeedbackGif";
import FlashcardGame from "@/components/FlashcardGame";
import { parsePdf, parsePptx } from "@/utils/fileParser";
import DocumentScanner from "@/components/DocumentScanner";

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState<any>(null);
  const [email, setEmail] = useState("");
  const [loadingAuth, setLoadingAuth] = useState(false);

  const [classes, setClasses] = useState<any[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [newClassName, setNewClassName] = useState("");

  const [studySets, setStudySets] = useState<any[]>([]);
  const [selectedStudySet, setSelectedStudySet] = useState<any>(null);
  const [studySetName, setStudySetName] = useState("");

  const [tab, setTab] = useState("quiz");
  const [currentDiagram, setCurrentDiagram] = useState("heart");
  const [notes, setNotes] = useState("");
  const [selectedTypes, setSelectedTypes] = useState<string[]>(["multiple_choice", "3d_model_matching"]);
  const [quiz, setQuiz] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [feedback, setFeedback] = useState<'idle'|'correct'|'wrong'>('idle');
  const [showScanner, setShowScanner] = useState(false);
  
  const { isOpen: isClassModalOpen, onOpen: onClassModalOpen, onClose: onClassModalClose } = useDisclosure();
  const { isOpen: isSaveModalOpen, onOpen: onSaveModalOpen, onClose: onSaveModalClose } = useDisclosure();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const toast = useToast();

  // --- AUTH LISTENER ---
  useEffect(() => {
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(session.user);
        await fetchClasses(session.user.id);
      }

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'SIGNED_IN' && session) {
          setUser(session.user);
          fetchClasses(session.user.id);
          if (window.location.hash) {
             window.history.replaceState(null, '', '/');
          }
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          setClasses([]);
          setSelectedClassId("");
        }
      });

      return () => subscription.unsubscribe();
    };
    initAuth();
  }, []);

  useEffect(() => {
    if (selectedClassId && user?.id !== 'guest') {
      fetchStudySets();
    }
  }, [selectedClassId]);

  // --- LOGIN HANDLERS ---
  const handleLogin = async () => {
    if (!email) {
      toast({ title: "Please enter an email", status: "warning" });
      return;
    }
    setLoadingAuth(true);
    try {
      const result = await signInWithEmail(email);
      if (result?.error) {
        toast({ title: "Error", description: result.error, status: "error" });
      } else {
        toast({ title: "Magic link sent!", description: "Check your email inbox.", status: "success" });
      }
    } catch (err: any) {
      toast({ title: "Connection Error", description: err.message, status: "error" });
    }
    setLoadingAuth(false);
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await signInWithGoogle();
      if (result?.error) {
         toast({ title: "Login Failed", description: result.error, status: "error" });
      }
    } catch (err) {
      console.error("Unexpected Error:", err);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  // --- DATA HANDLERS ---
  const fetchClasses = async (userId: string) => {
    const { data, error } = await supabase.from('classes').select('*').eq('user_id', userId).order('created_at', { ascending: false });
    if (error) console.error("Error fetching classes:", error);
    if (data && data.length > 0) {
      setClasses(data);
      if (!selectedClassId) setSelectedClassId(data[0].id);
    }
  };

  const fetchStudySets = async () => {
    // Only fetch from quizzes table (unified storage)
    const { data } = await supabase
      .from('quizzes')
      .select('*')
      .eq('class_id', selectedClassId)
      .order('created_at', { ascending: false });

    setStudySets(data || []);
  };

  const createClass = async () => {
    if (!newClassName || !user || user.id === 'guest') return;
    const { data, error } = await supabase.from('classes').insert([{ user_id: user.id, name: newClassName }]).select();
    
    if (error) {
      toast({ title: "Error", description: error.message, status: "error" });
      return;
    }
    
    if (data) {
      setClasses([data[0], ...classes]);
      setSelectedClassId(data[0].id);
      setNewClassName("");
      onClassModalClose();
      toast({ title: "Class created!", status: "success" });
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
        body: JSON.stringify({ text: notes, types: selectedTypes }) 
      });
      const data = await res.json();
      
      if (data.questions) {
        setQuiz(data.questions);
        
        if (user && user.id !== 'guest' && selectedClassId) {
          onSaveModalOpen();
        } else {
          toast({ title: "Assessment Generated!", status: "success" });
        }
      }
    } catch (e) {
      toast({ title: "Error generating quiz", status: "error" });
    }
    setLoading(false);
  };

  const saveStudySet = async () => {
    if (!studySetName.trim()) {
      toast({ title: "Please enter a name", status: "warning" });
      return;
    }

    // Save as ONE unified study set (quiz + notes together)
    await supabase.from('quizzes').insert([{
      user_id: user.id,
      class_id: selectedClassId,
      title: studySetName,
      data: quiz,
      notes: notes // Store notes alongside quiz
    }]);

    toast({ title: "Saved!", description: `"${studySetName}" added to your class.`, status: "success" });
    setStudySetName("");
    onSaveModalClose();
    fetchStudySets();
  };

  const loadStudySet = (set: any) => {
    setSelectedStudySet(set);
    setQuiz(set.data);
    setNotes(set.notes || ''); // Load both quiz and notes
    setTab('quiz');
    toast({ title: `Loaded "${set.title}"`, status: "info" });
  };

  const deleteStudySet = async (id: string) => {
    await supabase.from('quizzes').delete().eq('id', id);
    toast({ title: "Deleted", status: "success" });
    fetchStudySets();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setLoading(true);
    setUploadProgress(0);
    try {
      const allContent: string[] = [];
      const totalFiles = files.length;
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        let content = "";
        if (file.name.endsWith(".pdf")) content = await parsePdf(file);
        else if (file.name.endsWith(".pptx")) content = await parsePptx(file);
        else content = await file.text();
        if (content.trim()) allContent.push(`\n========== ${file.name} ==========\n${content}`);
        setUploadProgress(((i + 1) / totalFiles) * 100);
      }
      const combinedNotes = allContent.join("\n\n");
      setNotes(combinedNotes);
      toast({ title: "Notes imported!", status: "success" });
    } catch (error) {
      toast({ title: "Import failed", status: "error" });
    }
    setLoading(false);
    setUploadProgress(0);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleScannerComplete = (extractedText: string) => {
    setNotes(notes ? notes + "\n\n" + extractedText : extractedText);
    setShowScanner(false);
    toast({ title: "Text extracted!", description: "Added to your notes.", status: "success" });
  };

  const toggleType = (type: string) => {
    if (selectedTypes.includes(type)) {
      setSelectedTypes(selectedTypes.filter(t => t !== type));
    } else {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

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
      { id: '1', label: 'Trachea', cx: 50, cy: 15, r: 15 },
      { id: '2', label: 'Right Bronchus', cx: 42, cy: 30, r: 12 },
      { id: '3', label: 'Left Bronchus', cx: 58, cy: 30, r: 12 },
      { id: '4', label: 'Right Upper Lobe', cx: 30, cy: 45, r: 25 },
      { id: '5', label: 'Left Upper Lobe', cx: 70, cy: 45, r: 25 },
      { id: '6', label: 'Diaphragm', cx: 50, cy: 85, r: 30 }
    ],
    brain: [
      { id: '1', label: 'Frontal Lobe', cx: 25, cy: 35, r: 22 },
      { id: '2', label: 'Parietal Lobe', cx: 55, cy: 20, r: 20 },
      { id: '3', label: 'Occipital Lobe', cx: 85, cy: 45, r: 18 },
      { id: '4', label: 'Temporal Lobe', cx: 50, cy: 55, r: 20 },
      { id: '5', label: 'Cerebellum', cx: 75, cy: 75, r: 18 },
      { id: '6', label: 'Brainstem', cx: 50, cy: 85, r: 12 }
    ],
  };

  const assessmentTypes = [
    { id: 'multiple_choice', label: 'Multiple Choice', color: 'green' },
    { id: 'sata', label: 'Select All That Apply', color: 'green' },
    { id: 'matching', label: 'Matching Terms', color: 'pink' },
    { id: 'fill_in_blank', label: 'Fill in Blank', color: 'pink' },
    { id: 'frq', label: 'Free Response', color: 'orange' },
    { id: '3d_model_matching', label: '3D Practicals', color: 'purple' },
    { id: 'diagram_mcq', label: 'Diagram Labeling', color: 'teal' }
  ];

  // --- RENDER: LOGIN SCREEN ---
  if (!user) {
    return (
      <Box minH="100vh" bg="cottage.bg" display="flex" alignItems="center" justifyContent="center" p={4}>
        <VStack spacing={6} w="full" maxW="md" bg="white" p={10} borderRadius="3xl" shadow="2xl" border="1px solid" borderColor="cottage.Sage200">
          <VStack spacing={2}>
            <Heading color="cottage.Sage600" fontSize="3xl">The Nursing Cottage 🌿</Heading>
            <Text color="gray.500" textAlign="center">Your cozy space for serious study.</Text>
          </VStack>

          <Button w="full" variant="outline" leftIcon={<Icon as={FaGoogle} />} onClick={handleGoogleLogin} size="lg" borderColor="gray.300" _hover={{ bg: "gray.50" }}>
            Continue with Google
          </Button>
          
          <HStack w="full" py={2}>
            <Divider />
            <Text fontSize="xs" color="gray.400" whiteSpace="nowrap">OR USE EMAIL</Text>
            <Divider />
          </HStack>
          
          <VStack w="full" spacing={3}>
            <Input placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} size="lg" bg="gray.50" borderRadius="md" />
            <Button w="full" colorScheme="green" bg="cottage.Sage500" size="lg" isLoading={loadingAuth} onClick={handleLogin} leftIcon={<Mail size={18} />}>
              Send Magic Link
            </Button>
          </VStack>

          <Button variant="link" color="gray.400" size="sm" onClick={() => setUser({ id: 'guest', email: 'Guest' })}>
            Continue as Guest
          </Button>
        </VStack>
      </Box>
    );
  }

  // --- RENDER: MAIN APP ---
  return (
    <Box minH="100vh" pb={20} bg="cottage.bg">
      <FeedbackGif state={feedback} reset={() => setFeedback('idle')} />
      
      {/* HEADER */}
      <Box bg="cottage.Sage500" py={4} px={4} boxShadow="sm">
        <Container maxW="container.xl">
          <HStack justify="space-between" align="center">
            <HStack spacing={4}>
              <Heading color="white" fontSize="2xl">The Nursing Cottage 🌿</Heading>
              {user.id !== 'guest' && (
                <Menu>
                  <MenuButton as={Button} rightIcon={<ChevronDown size={16} />} variant="ghost" color="white" size="sm">
                    {classes.find(c => c.id === selectedClassId)?.name || 'Select Class'}
                  </MenuButton>
                  <MenuList>
                    {classes.map(c => (
                      <MenuItem key={c.id} onClick={() => setSelectedClassId(c.id)}>
                        <BookOpen size={16} style={{ marginRight: 8 }} /> {c.name}
                      </MenuItem>
                    ))}
                    <Divider />
                    <MenuItem icon={<Plus size={16} />} onClick={onClassModalOpen}>
                      New Class
                    </MenuItem>
                  </MenuList>
                </Menu>
              )}
            </HStack>
            
            <HStack>
              <Text color="whiteAlpha.800" fontSize="sm">{user.email?.split('@')[0] || 'Guest'}</Text>
              <IconButton aria-label="Logout" icon={<LogOut size={18} />} size="sm" variant="ghost" color="white" onClick={handleLogout} />
            </HStack>
          </HStack>
        </Container>
      </Box>

      <Container maxW="container.xl" mt={8}>
        {/* NAVIGATION */}
        <HStack spacing={4} mb={8} justify="center" wrap="wrap">
          {[
            { id: "quiz", icon: BookOpen, label: "Quiz Studio" },
            ...(user.id !== 'guest' && selectedClassId ? [{ id: "sets", icon: FolderOpen, label: "Study Sets" }] : []),
            { id: "library", icon: BoxIcon, label: "3D Library" },
            { id: "diagrams", icon: Activity, label: "Diagrams" }
          ].map((item: any) => (
            <Button
              key={item.id}
              leftIcon={<item.icon size={18} />}
              bg={tab === item.id ? "cottage.Terra500" : "white"}
              color={tab === item.id ? "white" : "cottage.text"}
              shadow="sm"
              onClick={() => setTab(item.id)}
              _hover={{ transform: "translateY(-2px)", shadow: "md" }}
              size="lg"
            >
              {item.label}
            </Button>
          ))}
        </HStack>

        {/* TAB CONTENT */}
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}>
            
            {tab === "quiz" && (
              <VStack spacing={8} align="stretch">
                <Box bg="white" p={8} borderRadius="2xl" shadow="md">
                  <HStack justify="space-between" mb={4} wrap="wrap" spacing={2}>
                    <Heading size="md" color="cottage.Sage600">Study Notes</Heading>
                    <HStack>
                      <Button 
                        leftIcon={<Smartphone size={18} />} 
                        size="sm" 
                        variant="outline" 
                        colorScheme="blue"
                        onClick={() => setShowScanner(true)}
                      >
                        Scan Documents
                      </Button>
                      <Button leftIcon={<UploadCloud size={18} />} size="sm" variant="outline" colorScheme="green" isLoading={loading && !notes} onClick={() => fileInputRef.current?.click()}>
                        Upload Files
                      </Button>
                    </HStack>
                    <Input type="file" accept=".txt,.md,.json,.pdf,.pptx" multiple display="none" ref={fileInputRef} onChange={handleFileUpload} />
                  </HStack>

                  {uploadProgress > 0 && <Progress value={uploadProgress} colorScheme="green" size="sm" borderRadius="full" mb={4} />}
                  <Textarea placeholder="Paste notes here OR upload files..." rows={8} bg="gray.50" value={notes} onChange={(e) => setNotes(e.target.value)} mb={6} borderRadius="lg" />

                  <Heading size="md" mb={3} color="cottage.Sage600">Assessment Types</Heading>
                  <Wrap spacing={3} mb={6}>
                    {assessmentTypes.map(type => (
                      <WrapItem key={type.id}>
                        <Tag size="lg" colorScheme={selectedTypes.includes(type.id) ? type.color : 'gray'} variant={selectedTypes.includes(type.id) ? 'solid' : 'outline'} cursor="pointer" onClick={() => toggleType(type.id)}>
                          <TagLabel>{type.label}</TagLabel>
                          {selectedTypes.includes(type.id) && <TagCloseButton />}
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>

                  <Button w="full" size="lg" isLoading={loading} onClick={generate} bg="cottage.Sage500" color="white" _hover={{ bg: "cottage.Sage600" }} leftIcon={<Save size={18} />}>
                    Generate Assessment
                  </Button>
                </Box>

                {quiz.length > 0 && (
                  <Box>
                    <FlashcardGame questions={quiz} onFeedback={(isCorrect) => setFeedback(isCorrect ? 'correct' : 'wrong')} />
                  </Box>
                )}
              </VStack>
            )}

            {tab === "sets" && (
              <Box>
                <Heading size="lg" mb={6} color="cottage.Sage600">Your Study Sets</Heading>
                {studySets.length === 0 ? (
                  <Box bg="white" p={12} borderRadius="2xl" textAlign="center">
                    <FolderOpen size={48} style={{ margin: '0 auto 16px', color: '#9CA3AF' }} />
                    <Text color="gray.500">No study sets yet. Generate and save a quiz to see it here!</Text>
                  </Box>
                ) : (
                  <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
                    {studySets.map(set => (
                      <Box key={set.id} bg="white" p={6} borderRadius="xl" shadow="md" _hover={{ shadow: 'lg', transform: 'translateY(-4px)' }} transition="all 0.2s" cursor="pointer" onClick={() => loadStudySet(set)}>
                        <HStack justify="space-between" mb={3}>
                          <Badge colorScheme="green">Study Set</Badge>
                          <IconButton aria-label="Delete" icon={<Trash2 size={16} />} size="xs" variant="ghost" colorScheme="red" onClick={(e) => { e.stopPropagation(); deleteStudySet(set.id); }} />
                        </HStack>
                        <Heading size="sm" mb={2} noOfLines={2}>{set.title}</Heading>
                        <HStack fontSize="xs" color="gray.500">
                          <Clock size={14} />
                          <Text>{new Date(set.created_at).toLocaleDateString()}</Text>
                        </HStack>
                      </Box>
                    ))}
                  </SimpleGrid>
                )}
              </Box>
            )}

            {tab === "library" && (
              <VStack spacing={6}>
                <Heading size="md" color="cottage.Sage600">Interactive 3D Library</Heading>
                <Box w="full" h="600px" borderRadius="3xl" overflow="hidden" bg="gray.100" shadow="inner">
                  <Canvas camera={{ position: [0, 0, 6] }}>
                    <Environment preset="city" />
                    <Suspense fallback={null}>
                      <group position={[-2, -0.5, 0]}>
                        <SkeletonModel onClick={(part) => toast({ title: part, status: 'info' })} labels={['Skull', 'Ribcage']} />
                      </group>
                      <group position={[2, 0.5, 0]}>
                        <HeartModel onClick={(part) => toast({ title: part, status: 'info' })} labels={['Aorta', 'Ventricle']} />
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
                   <Select w="250px" value={currentDiagram} onChange={(e) => setCurrentDiagram(e.target.value)} bg="white">
                     <option value="heart">Heart</option>
                     <option value="lungs">Lungs</option>
                     <option value="brain">Brain</option>
                   </Select>
                </HStack>
                <Box maxW="800px" mx="auto">
                  <DiagramMapper src={`/diagrams/${currentDiagram}.jpg`} hotspots={allHotspots[currentDiagram] || []} onPartClick={(lbl) => toast({ title: `Structure: ${lbl}`, status: 'info', duration: 2000 })} />
                </Box>
              </VStack>
            )}
          </motion.div>
        </AnimatePresence>
      </Container>

      {/* DOCUMENT SCANNER MODAL */}
      <Modal isOpen={showScanner} onClose={() => setShowScanner(false)} size="xl">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Document Scanner</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <DocumentScanner onComplete={handleScannerComplete} />
          </ModalBody>
        </ModalContent>
      </Modal>

      {/* CLASS MODAL */}
      <Modal isOpen={isClassModalOpen} onClose={onClassModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Create New Class</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input placeholder="e.g. Pharmacology 101" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button colorScheme="green" onClick={createClass}>Create</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* SAVE STUDY SET MODAL */}
      <Modal isOpen={isSaveModalOpen} onClose={onSaveModalClose}>
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Save Study Set</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <Input placeholder="e.g. Chapter 5 Quiz" value={studySetName} onChange={(e) => setStudySetName(e.target.value)} />
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onSaveModalClose}>Skip</Button>
            <Button colorScheme="green" onClick={saveStudySet}>Save</Button>
          </ModalFooter>
        </ModalContent>
      </Modal>
    </Box>
  );
}
