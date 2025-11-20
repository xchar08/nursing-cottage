"use client";
import React, { useState, useEffect } from "react";
import { 
  Box, VStack, Text, Button, Badge, Input, Textarea, 
  Radio, RadioGroup, Stack, Checkbox, CheckboxGroup, HStack, 
  Select, Card, CardBody, Image
} from "@chakra-ui/react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { HeartModel, SkeletonModel } from "./models/ProceduralModels";

interface Question {
  id: string;
  type: "multiple_choice" | "sata" | "fill_in_blank" | "matching" | "frq" | "3d_model_matching" | "diagram_mcq";
  question: string;
  options?: string[];
  correctAnswer?: string; 
  answer?: string; 
  correctAnswers?: string[]; 
  pairs?: { left: string; right: string }[]; 
  model?: string; 
  correctLabel?: string; 
  modelAnswer?: string;
  imageUrl?: string;
}

export default function FlashcardGame({ questions, onFeedback }: { questions: Question[], onFeedback: (isCorrect: boolean) => void }) {
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<any>(null); 
  const [isAnswered, setIsAnswered] = useState(false);
  const [matchState, setMatchState] = useState<Record<string, string>>({});
  
  const [grading, setGrading] = useState(false);
  const [aiFeedback, setAiFeedback] = useState("");

  const q = questions[index];

  // Universal Answer Getter
  const getCorrectAnswer = (q: Question) => {
    if (q.type === "3d_model_matching") return q.correctLabel;
    return q.correctAnswer || q.answer || "Error: Answer missing";
  };

  useEffect(() => {
    setSelected(null);
    setMatchState({});
    setIsAnswered(false);
    setAiFeedback("");
    setGrading(false);
  }, [index]);

  const check = async () => {
    // --- FRQ ASYNC GRADING ---
    if (q.type === "frq") {
      setGrading(true);
      try {
        const res = await fetch("/api/grade-answer", {
          method: "POST",
          body: JSON.stringify({
            question: q.question,
            userAnswer: selected,
            modelAnswer: q.modelAnswer
          })
        });
        const data = await res.json();
        setIsAnswered(true);
        setAiFeedback(data.feedback);
        onFeedback(data.correct);
      } catch (e) {
        setIsAnswered(true);
        setAiFeedback("Could not grade automatically.");
        onFeedback(true); 
      }
      setGrading(false);
      return;
    }

    // --- SYNC GRADING ---
    setIsAnswered(true);
    let correct = false;
    const rightAnswer = getCorrectAnswer(q);

    switch (q.type) {
      case "multiple_choice":
      case "diagram_mcq":
        // Smart Check: Matches exact string OR Letter (A/B/C)
        if (selected === rightAnswer) {
          correct = true;
        } else if (rightAnswer && rightAnswer.length === 1 && q.options) {
          const selectedIndex = q.options.indexOf(selected);
          const letterIndex = rightAnswer.toUpperCase().charCodeAt(0) - 65; 
          if (selectedIndex === letterIndex) correct = true;
        }
        break;

      case "fill_in_blank":
        correct = (selected as string)?.toLowerCase().trim() === rightAnswer?.toLowerCase().trim();
        break;

      case "sata": 
        if (Array.isArray(selected) && q.correctAnswers) {
          const userSet = new Set(selected);
          const correctSet = new Set(q.correctAnswers);
          correct = userSet.size === correctSet.size && Array.from(userSet).every((v: any) => correctSet.has(v));
        }
        break;

      case "matching":
        if (q.pairs && Object.keys(matchState).length === q.pairs.length) {
          correct = q.pairs.every(pair => matchState[pair.left] === pair.right);
        }
        break;

      case "3d_model_matching":
        correct = selected === q.correctLabel;
        break;
    }

    onFeedback(correct);
  };

  const next = () => {
    setIndex((i) => (i + 1) % questions.length);
  };

  if (!q) return <Text>Quiz Complete!</Text>;

  return (
    <Card variant="outline" borderRadius="3xl" boxShadow="sm" borderColor="cottage.Sage500" bg="white">
      <CardBody p={6}>
        <HStack justify="space-between" mb={4}>
          <Badge colorScheme="purple" fontSize="0.9em" borderRadius="md" px={2}>Question {index + 1}</Badge>
          <Badge colorScheme="gray">{q.type.replace(/_/g, " ").toUpperCase()}</Badge>
        </HStack>
        
        <Text fontSize="xl" fontWeight="bold" mb={6} color="cottage.text">{q.question}</Text>

        {/* --- RENDERERS --- */}

        {(q.type === "multiple_choice" || q.type === "diagram_mcq") && (
          <VStack spacing={4} align="stretch">
            {q.type === "diagram_mcq" && q.imageUrl && (
               <Box borderRadius="lg" overflow="hidden" border="1px solid" borderColor="gray.200" maxH="300px">
                  <Image src={q.imageUrl} alt="Question diagram" objectFit="contain" w="full" h="full"/>
               </Box>
            )}
            <RadioGroup onChange={setSelected} value={selected}>
              <Stack spacing={3}>
                {q.options?.map((opt) => (
                  <Radio key={opt} value={opt} isDisabled={isAnswered} colorScheme="green" size="lg">
                    {opt}
                  </Radio>
                ))}
              </Stack>
            </RadioGroup>
          </VStack>
        )}

        {q.type === "sata" && (
          <CheckboxGroup onChange={(vals) => setSelected(vals)} value={selected || []}>
            <Stack spacing={3}>
              {q.options?.map((opt) => (
                <Checkbox key={opt} value={opt} isDisabled={isAnswered} colorScheme="green" size="lg">
                  {opt}
                </Checkbox>
              ))}
            </Stack>
          </CheckboxGroup>
        )}

        {q.type === "fill_in_blank" && (
          <Input 
            placeholder="Type your answer..." 
            value={selected || ""} 
            onChange={(e) => setSelected(e.target.value)}
            isDisabled={isAnswered}
            size="lg"
            focusBorderColor="cottage.Sage500"
          />
        )}

        {q.type === "frq" && (
          <VStack align="start" w="full" spacing={4}>
            <Textarea 
              placeholder="Type your explanation here..." 
              value={selected || ""} 
              onChange={(e) => setSelected(e.target.value)}
              isDisabled={isAnswered || grading}
              rows={5}
              focusBorderColor="cottage.Sage500"
            />
            {grading && <Text color="cottage.Sage500" fontWeight="bold" className="animate-pulse">Analyzing your answer...</Text>}
            {isAnswered && (
              <Box w="full" p={4} bg="gray.50" borderRadius="lg" border="1px solid" borderColor="gray.200">
                <HStack mb={2}>
                  <Badge colorScheme="blue">AI Feedback</Badge>
                  <Text fontSize="sm" fontWeight="bold">{aiFeedback}</Text>
                </HStack>
                <HStack align="start" mt={3}>
                  <Badge colorScheme="green" mt={1}>Official</Badge>
                  <Text fontSize="sm" color="gray.700">{q.modelAnswer || "No model answer available."}</Text>
                </HStack>
              </Box>
            )}
          </VStack>
        )}

        {q.type === "matching" && (
          <VStack spacing={4} align="stretch">
            {q.pairs && q.pairs.length > 0 ? (
              q.pairs.map((pair, idx) => (
                <HStack key={idx} spacing={4} bg="cottage.bg" p={3} borderRadius="xl">
                  <Text fontWeight="bold" flex={1}>{pair.left}</Text>
                  <Text color="gray.400">→</Text>
                  <Select 
                    placeholder="Select match..." 
                    bg="white" 
                    flex={1}
                    isDisabled={isAnswered}
                    onChange={(e) => setMatchState(prev => ({...prev, [pair.left]: e.target.value}))}
                  >
                    {[...q.pairs!].sort((a, b) => a.right.localeCompare(b.right)).map(p => (
                      <option key={p.right} value={p.right}>{p.right}</option>
                    ))}
                  </Select>
                </HStack>
              ))
            ) : (
              <Text color="red.500">Error loading matching pairs.</Text>
            )}
          </VStack>
        )}

        {q.type === "3d_model_matching" && (
          <Box h="350px" borderRadius="xl" overflow="hidden" bg="gray.100" position="relative" border="2px solid" borderColor="cottage.Sage500">
            <Canvas camera={{ position: [0, 0, 4] }}>
              <ambientLight intensity={0.7} />
              <spotLight position={[10,10,10]} />
              {q.model === "Heart" ? (
                <HeartModel onClick={setSelected} labels={isAnswered ? [q.correctLabel!] : []} />
              ) : (
                <SkeletonModel onClick={setSelected} labels={isAnswered ? [q.correctLabel!] : []} />
              )}
              <OrbitControls />
            </Canvas>
            {!isAnswered && (
              <Box position="absolute" bottom={3} left={0} right={0} textAlign="center" pointerEvents="none">
                <Badge bg="white/90" p={2} borderRadius="full" boxShadow="md" fontSize="sm">
                  Click the correct structure
                </Badge>
              </Box>
            )}
          </Box>
        )}

        {/* --- FEEDBACK & CONTROLS --- */}
        <Box mt={8}>
          {!isAnswered ? (
            <Button 
              w="full" 
              colorScheme="teal" 
              size="lg" 
              onClick={check} 
              isLoading={grading}
              loadingText="Grading..."
              isDisabled={!selected && Object.keys(matchState).length === 0 && q.type !== 'frq'}
              bg="cottage.Sage500" 
              _hover={{ bg: "cottage.Sage600" }}
            >
              Check Answer
            </Button>
          ) : (
            <VStack spacing={3}>
              {q.type !== "frq" && (
                <Box p={3} bg={(selected === getCorrectAnswer(q)) || (q.type === "matching" && true) ? "green.50" : "red.50"} borderRadius="lg" w="full" border="1px solid" borderColor={(selected === getCorrectAnswer(q)) ? "green.200" : "red.200"}>
                  <Text fontWeight="bold" color={(selected === getCorrectAnswer(q)) || (q.type === "matching" && true) ? "green.700" : "red.700"}>
                     {q.type === "matching" ? "Check your matches above." : 
                      q.type === "sata" ? `Correct options: ${q.correctAnswers?.join(", ")}` :
                      `Correct Answer: ${getCorrectAnswer(q)}`}
                  </Text>
                </Box>
              )}
              <Button w="full" variant="outline" onClick={next} borderColor="cottage.Sage500" color="cottage.Sage600">
                Next Question ➡️
              </Button>
            </VStack>
          )}
        </Box>
      </CardBody>
    </Card>
  );
}
