import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Plus,
  Minus,
  BookOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ExamQuestion {
  question: string;
  choices: { a: string; b: string; c: string; d: string };
  correctAnswer: "a" | "b" | "c" | "d";
  citation: string;
  explanation: string;
}

type Phase = "setup" | "generating" | "taking" | "results";

export function LearningExams() {
  const [phase, setPhase] = useState<Phase>("setup");

  // Setup state
  const [subject, setSubject] = useState("");
  const [questionCount, setQuestionCount] = useState("50");
  const [timerEnabled, setTimerEnabled] = useState(false);
  const [timerMinutes, setTimerMinutes] = useState(60);

  // Exam state
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Cleanup timer
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer countdown
  useEffect(() => {
    if (phase === "taking" && timerEnabled && timeLeft > 0) {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            timerRef.current = null;
            handleSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => {
        if (timerRef.current) clearInterval(timerRef.current);
      };
    }
  }, [phase, timerEnabled, timeLeft > 0]);

  const handleSubmit = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setPhase("results");
  }, []);

  const generateExam = async () => {
    if (!subject.trim()) {
      toast.error("Please enter a subject for the exam.");
      return;
    }

    setPhase("generating");

    try {
      const { data, error } = await supabase.functions.invoke(
        "generate-mock-exam",
        {
          body: { subject: subject.trim(), questionCount: Number(questionCount) },
        }
      );

      if (error) throw error;

      if (data?.error) {
        toast.error(data.error);
        setPhase("setup");
        return;
      }

      if (!data?.questions?.length) {
        toast.error("No questions were generated. Please try again.");
        setPhase("setup");
        return;
      }

      setQuestions(data.questions);
      setAnswers({});
      setCurrentIndex(0);
      if (timerEnabled) {
        setTimeLeft(timerMinutes * 60);
      }
      setPhase("taking");
    } catch (e: any) {
      console.error("Exam generation error:", e);
      toast.error(e.message || "Failed to generate exam. Please try again.");
      setPhase("setup");
    }
  };

  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const adjustTimer = (delta: number) => {
    setTimerMinutes((prev) => Math.max(5, prev + delta));
  };

  const score = questions.reduce(
    (acc, q, i) => acc + (answers[i] === q.correctAnswer ? 1 : 0),
    0
  );

  const resetExam = () => {
    setPhase("setup");
    setQuestions([]);
    setAnswers({});
    setCurrentIndex(0);
    setTimeLeft(0);
  };

  // ── SETUP ──
  if (phase === "setup") {
    return (
      <div className="space-y-6 max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-primary" />
              Create Mock Exam
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Subject */}
            <div className="space-y-2">
              <Label htmlFor="exam-subject">Subject / Topic</Label>
              <Input
                id="exam-subject"
                placeholder="e.g. FAA Part 107 Remote Pilot, US Constitutional Law, Organic Chemistry..."
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">
                Be specific for better results. The AI will use verifiable published sources.
              </p>
            </div>

            {/* Question Count */}
            <div className="space-y-2">
              <Label>Number of Questions</Label>
              <RadioGroup
                value={questionCount}
                onValueChange={setQuestionCount}
                className="flex gap-4"
              >
                {["50", "100", "150"].map((n) => (
                  <div key={n} className="flex items-center gap-2">
                    <RadioGroupItem value={n} id={`q-${n}`} />
                    <Label htmlFor={`q-${n}`} className="cursor-pointer">
                      {n}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
            </div>

            {/* Timer */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Time Limit
                </Label>
                <Switch
                  checked={timerEnabled}
                  onCheckedChange={setTimerEnabled}
                />
              </div>

              {timerEnabled && (
                <div className="space-y-3 pl-1">
                  <div className="flex flex-wrap gap-2">
                    {[30, 60, 90, 120].map((m) => (
                      <Button
                        key={m}
                        size="sm"
                        variant={timerMinutes === m ? "default" : "outline"}
                        onClick={() => setTimerMinutes(m)}
                      >
                        {m >= 60 ? `${m / 60}h` : `${m}m`}
                        {m === 90 && " (1.5h)"}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => adjustTimer(-30)}
                      disabled={timerMinutes <= 5}
                    >
                      <Minus className="h-4 w-4" />
                    </Button>
                    <Input
                      type="number"
                      min={5}
                      max={600}
                      value={timerMinutes}
                      onChange={(e) =>
                        setTimerMinutes(Math.max(5, Number(e.target.value) || 5))
                      }
                      className="w-24 text-center"
                    />
                    <span className="text-sm text-muted-foreground">minutes</span>
                    <Button
                      size="icon"
                      variant="outline"
                      onClick={() => adjustTimer(30)}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => adjustTimer(60)}
                    >
                      +1h
                    </Button>
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-md border border-border bg-muted/50 p-3 text-xs text-muted-foreground flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>
                Questions are generated by AI using verifiable published sources. While the AI is instructed to cite exact sources, you should independently verify citations for critical use cases. Generating {questionCount} questions may take 1–3 minutes.
              </span>
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={generateExam}
              disabled={!subject.trim()}
            >
              Generate Exam
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── GENERATING ──
  if (phase === "generating") {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-lg font-medium text-foreground">
          Generating your exam...
        </p>
        <p className="text-sm text-muted-foreground max-w-md text-center">
          Creating {questionCount} verified multiple-choice questions on "{subject}". This may take 1–3 minutes.
        </p>
      </div>
    );
  }

  // ── TAKING EXAM ──
  if (phase === "taking") {
    const q = questions[currentIndex];
    if (!q) return null;

    const answeredCount = Object.keys(answers).length;

    return (
      <div className="space-y-4 max-w-3xl mx-auto">
        {/* Header bar */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length} •{" "}
            {answeredCount} answered
          </div>
          {timerEnabled && (
            <Badge
              variant={timeLeft < 300 ? "destructive" : "secondary"}
              className="text-sm font-mono"
            >
              <Clock className="h-3.5 w-3.5 mr-1" />
              {formatTime(timeLeft)}
            </Badge>
          )}
        </div>

        <Progress
          value={((currentIndex + 1) / questions.length) * 100}
          className="h-2"
        />

        {/* Question card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base leading-relaxed">
              {currentIndex + 1}. {q.question}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <RadioGroup
              value={answers[currentIndex] || ""}
              onValueChange={(v) =>
                setAnswers((prev) => ({ ...prev, [currentIndex]: v }))
              }
              className="space-y-3"
            >
              {(["a", "b", "c", "d"] as const).map((letter) => (
                <label
                  key={letter}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border border-border p-3 cursor-pointer transition-colors hover:bg-accent/50",
                    answers[currentIndex] === letter && "border-primary bg-accent/30"
                  )}
                >
                  <RadioGroupItem value={letter} className="mt-0.5" />
                  <span className="text-sm">
                    <span className="font-semibold mr-1.5">
                      {letter.toUpperCase()}.
                    </span>
                    {q.choices[letter]}
                  </span>
                </label>
              ))}
            </RadioGroup>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" />
            Previous
          </Button>

          <div className="flex gap-2">
            {currentIndex < questions.length - 1 ? (
              <Button
                onClick={() =>
                  setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                }
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button onClick={handleSubmit}>Submit Exam</Button>
            )}
          </div>
        </div>

        {/* Question grid navigator */}
        <Card>
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground mb-2">Jump to question:</p>
            <div className="flex flex-wrap gap-1">
              {questions.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    "w-8 h-8 rounded text-xs font-medium transition-colors",
                    i === currentIndex
                      ? "bg-primary text-primary-foreground"
                      : answers[i]
                      ? "bg-accent text-accent-foreground"
                      : "bg-muted text-muted-foreground hover:bg-accent"
                  )}
                >
                  {i + 1}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── RESULTS ──
  if (phase === "results") {
    const pct = Math.round((score / questions.length) * 100);

    return (
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Score summary */}
        <Card>
          <CardContent className="pt-6 text-center space-y-2">
            <p className="text-4xl font-bold text-foreground">{pct}%</p>
            <p className="text-lg text-muted-foreground">
              {score} / {questions.length} correct
            </p>
            <Progress value={pct} className="h-3 max-w-xs mx-auto" />
            <Button variant="outline" className="mt-4" onClick={resetExam}>
              <RotateCcw className="h-4 w-4 mr-2" />
              New Exam
            </Button>
          </CardContent>
        </Card>

        {/* Review each question */}
        {questions.map((q, i) => {
          const userAnswer = answers[i];
          const isCorrect = userAnswer === q.correctAnswer;

          return (
            <Card
              key={i}
              className={cn(
                "border-l-4",
                isCorrect ? "border-l-green-500" : "border-l-destructive"
              )}
            >
              <CardHeader className="pb-2">
                <div className="flex items-start gap-2">
                  {isCorrect ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
                  )}
                  <CardTitle className="text-sm leading-relaxed">
                    {i + 1}. {q.question}
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-1.5">
                  {(["a", "b", "c", "d"] as const).map((letter) => {
                    const isThisCorrect = letter === q.correctAnswer;
                    const isThisUserAnswer = letter === userAnswer;
                    return (
                      <div
                        key={letter}
                        className={cn(
                          "text-sm rounded px-3 py-1.5 border",
                          isThisCorrect
                            ? "bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-300"
                            : isThisUserAnswer && !isThisCorrect
                            ? "bg-destructive/10 border-destructive/30 text-destructive"
                            : "border-transparent text-muted-foreground"
                        )}
                      >
                        <span className="font-semibold mr-1.5">
                          {letter.toUpperCase()}.
                        </span>
                        {q.choices[letter]}
                        {isThisCorrect && (
                          <span className="ml-2 text-xs font-medium">✓ Correct</span>
                        )}
                        {isThisUserAnswer && !isThisCorrect && (
                          <span className="ml-2 text-xs font-medium">✗ Your answer</span>
                        )}
                      </div>
                    );
                  })}
                </div>

                {!userAnswer && (
                  <p className="text-xs text-muted-foreground italic">
                    Not answered
                  </p>
                )}

                {/* Explanation */}
                <div className="text-sm text-muted-foreground bg-muted/50 rounded-md p-3">
                  <p className="font-medium text-foreground mb-1">Explanation:</p>
                  <p>{q.explanation}</p>
                </div>

                {/* Citation */}
                <div className="text-xs text-muted-foreground bg-muted/30 rounded-md p-3 border border-border">
                  <p className="font-medium text-foreground mb-1 flex items-center gap-1">
                    <BookOpen className="h-3.5 w-3.5" />
                    Citation:
                  </p>
                  <p className="italic">{q.citation}</p>
                </div>
              </CardContent>
            </Card>
          );
        })}

        <div className="text-center pb-4">
          <Button onClick={resetExam}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Take Another Exam
          </Button>
        </div>
      </div>
    );
  }

  return null;
}
