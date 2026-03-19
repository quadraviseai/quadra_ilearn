const STORAGE_KEY = "quadrailearn-mock-test";
const PAYMENT_AMOUNT = 10;

const examCatalog = [
  {
    id: "jee-main",
    label: "JEE Main",
    blurb: "Engineering entrance practice with concept-focused mock tests.",
    subjects: [
      {
        id: "jee-physics",
        label: "Physics",
        description: "Mechanics, electricity, optics, and modern physics checkpoints.",
        topics: [
          { key: "kinematics", label: "Kinematics", concept: "motion, displacement, and velocity relationships", fix: "solve more graph-based motion questions", signal: "convert motion statements into equations quickly" },
          { key: "laws-of-motion", label: "Laws of Motion", concept: "force balance and Newtonian reasoning", fix: "draw force diagrams before calculation", signal: "identify net force without trial and error" },
          { key: "work-energy", label: "Work and Energy", concept: "energy conservation and work transfer", fix: "track energy changes stage by stage", signal: "choose the correct conservation equation directly" },
          { key: "rotation", label: "Rotational Motion", concept: "torque, angular acceleration, and inertia", fix: "practice torque direction and pivot analysis", signal: "map linear ideas to rotational analogies" },
          { key: "electrostatics", label: "Electrostatics", concept: "charge interaction and electric field behavior", fix: "review field-line and potential comparisons", signal: "judge electric influence without full computation" },
          { key: "current-electricity", label: "Current Electricity", concept: "circuit relationships and resistance logic", fix: "rebuild circuit questions branch by branch", signal: "simplify a circuit before substituting values" },
          { key: "optics", label: "Optics", concept: "image formation and ray interpretation", fix: "draw ray paths before using formulas", signal: "predict image type from geometry alone" },
          { key: "modern-physics", label: "Modern Physics", concept: "atomic models and quantum behavior", fix: "link formulas to the physical experiment behind them", signal: "recognize where classical reasoning fails" },
        ],
      },
      {
        id: "jee-mathematics",
        label: "Mathematics",
        description: "Algebra, calculus, coordinate geometry, and functions.",
        topics: [
          { key: "quadratic-equations", label: "Quadratic Equations", concept: "roots, discriminant, and transformation patterns", fix: "connect graph shape with root behavior", signal: "spot the fastest solving method immediately" },
          { key: "sequences-series", label: "Sequences and Series", concept: "term patterns and summation structure", fix: "rewrite the series before choosing a formula", signal: "classify AP, GP, or mixed form early" },
          { key: "functions", label: "Functions", concept: "domain, range, and composition logic", fix: "test edge cases while finding domain restrictions", signal: "read transformation effects without plotting fully" },
          { key: "limits", label: "Limits", concept: "approach behavior and indeterminate forms", fix: "factor or rationalize before substituting", signal: "identify the simplification pattern quickly" },
          { key: "derivatives", label: "Derivatives", concept: "rate of change and slope behavior", fix: "differentiate stepwise before simplification", signal: "match the derivative rule to the expression structure" },
          { key: "integrals", label: "Integrals", concept: "accumulation and reverse differentiation", fix: "look for substitution before expansion", signal: "recognize standard integral forms rapidly" },
          { key: "coordinate-geometry", label: "Coordinate Geometry", concept: "line, circle, and conic relationships", fix: "convert the question into a clean geometric condition", signal: "see distance and slope constraints directly" },
          { key: "probability", label: "Probability", concept: "counting favorable cases with clean sample spaces", fix: "write the sample space before computing ratios", signal: "separate dependent and independent events correctly" },
        ],
      },
    ],
  },
  {
    id: "neet",
    label: "NEET",
    blurb: "Medical entrance practice with biology and chemistry-heavy coverage.",
    subjects: [
      {
        id: "neet-biology",
        label: "Biology",
        description: "Cell biology, genetics, ecology, and physiology practice.",
        topics: [
          { key: "cell-biology", label: "Cell Biology", concept: "organelle function and structural coordination", fix: "compare functions instead of memorizing isolated names", signal: "map a process to the right organelle confidently" },
          { key: "genetics", label: "Genetics", concept: "inheritance patterns and trait prediction", fix: "draw inheritance tables before deciding outcomes", signal: "separate genotype from phenotype consistently" },
          { key: "human-physiology", label: "Human Physiology", concept: "system-level coordination in the body", fix: "follow the process step by step through the body system", signal: "link organ function with outcome under stress" },
          { key: "plant-physiology", label: "Plant Physiology", concept: "transport, growth, and regulation in plants", fix: "connect input condition with plant response", signal: "trace transport movement without mixing pathways" },
          { key: "ecology", label: "Ecology", concept: "population, environment, and ecosystem balance", fix: "read the ecological relationship before applying data", signal: "identify the interaction type from a short scenario" },
          { key: "evolution", label: "Evolution", concept: "variation, selection, and adaptation", fix: "relate evidence to the mechanism of change", signal: "separate adaptation from random variation clearly" },
          { key: "biotechnology", label: "Biotechnology", concept: "applications of genetic and molecular tools", fix: "tie the tool to its biological purpose", signal: "choose the right technique for the stated outcome" },
          { key: "reproduction", label: "Reproduction", concept: "human and plant reproductive processes", fix: "sequence the stages instead of memorizing fragments", signal: "place the event at the correct stage instantly" },
        ],
      },
      {
        id: "neet-chemistry",
        label: "Chemistry",
        description: "Physical, organic, and inorganic chemistry checkpoints.",
        topics: [
          { key: "atomic-structure", label: "Atomic Structure", concept: "electronic arrangement and model limitations", fix: "connect each rule to the model it belongs to", signal: "choose the right atomic model from the evidence given" },
          { key: "chemical-bonding", label: "Chemical Bonding", concept: "bond formation, geometry, and polarity", fix: "count electron regions before judging shape", signal: "separate bond type from molecular polarity correctly" },
          { key: "thermodynamics", label: "Thermodynamics", concept: "heat, work, and energy transfer in reactions", fix: "track sign conventions before using formulas", signal: "tell endothermic and exothermic changes apart quickly" },
          { key: "equilibrium", label: "Equilibrium", concept: "dynamic balance and shift conditions", fix: "read the disturbance before predicting the shift", signal: "apply Le Chatelier without overcomplicating the system" },
          { key: "organic-reactions", label: "Organic Reactions", concept: "functional group behavior and reaction pathways", fix: "identify the functional group before the reagent effect", signal: "predict the product family from the reagent pattern" },
          { key: "hydrocarbons", label: "Hydrocarbons", concept: "structure, stability, and reaction preference", fix: "relate structure to reactivity before elimination", signal: "recognize saturation and substitution trends clearly" },
          { key: "coordination-compounds", label: "Coordination Compounds", concept: "ligands, geometry, and complex naming", fix: "decode the complex one unit at a time", signal: "link ligand count to geometry accurately" },
          { key: "biomolecules", label: "Biomolecules", concept: "structure and function of biological compounds", fix: "group compounds by role before memorizing examples", signal: "spot the biomolecule category from functional clues" },
        ],
      },
    ],
  },
  {
    id: "cbse-class-10",
    label: "CBSE Class 10",
    blurb: "School exam readiness with structured subject-level practice.",
    subjects: [
      {
        id: "cbse-science",
        label: "Science",
        description: "Physics, chemistry, and biology concepts for board readiness.",
        topics: [
          { key: "light", label: "Light", concept: "reflection, refraction, and image formation", fix: "draw the path of light before choosing an answer", signal: "separate mirror and lens behavior correctly" },
          { key: "electricity", label: "Electricity", concept: "current, potential difference, and resistance", fix: "write circuit relationships before substituting values", signal: "see series and parallel effects immediately" },
          { key: "acids-bases-salts", label: "Acids, Bases and Salts", concept: "properties, reactions, and indicators", fix: "connect reaction type with the expected observation", signal: "classify substances from their behavior confidently" },
          { key: "metals-nonmetals", label: "Metals and Non-metals", concept: "reactivity and material properties", fix: "compare the property before naming the category", signal: "predict likely reaction behavior from the material type" },
          { key: "life-processes", label: "Life Processes", concept: "nutrition, respiration, and transport in organisms", fix: "follow the process order instead of isolated facts", signal: "identify the correct body system from a short description" },
          { key: "control-coordination", label: "Control and Coordination", concept: "nervous and hormonal regulation", fix: "map the stimulus to the control pathway used", signal: "distinguish fast neural response from hormonal response" },
          { key: "heredity", label: "Heredity", concept: "traits, inheritance, and variation", fix: "track how the trait moves across generations", signal: "link variation with inheritance accurately" },
          { key: "environment", label: "Our Environment", concept: "ecosystem balance and resource relationships", fix: "understand the interaction before reading the numbers", signal: "spot the food-chain or resource-cycle logic quickly" },
        ],
      },
      {
        id: "cbse-mathematics",
        label: "Mathematics",
        description: "Board-style algebra, geometry, and statistics practice.",
        topics: [
          { key: "real-numbers", label: "Real Numbers", concept: "factorization and number relationships", fix: "break the number structure before applying the theorem", signal: "identify HCF-LCM relationships directly" },
          { key: "polynomials", label: "Polynomials", concept: "zeros, factors, and graphical meaning", fix: "test factor and zero relationships together", signal: "move between equation and graph without hesitation" },
          { key: "linear-equations", label: "Linear Equations", concept: "pair of lines and their intersection logic", fix: "compare coefficients before solving fully", signal: "tell unique, infinite, and no-solution cases apart" },
          { key: "triangles", label: "Triangles", concept: "similarity and proportional relationships", fix: "mark corresponding sides before calculating", signal: "spot the similarity condition from the figure quickly" },
          { key: "coordinate-geometry-cbse", label: "Coordinate Geometry", concept: "distance and section interpretation on the plane", fix: "visualize the point movement before formula use", signal: "pick the right coordinate formula from the question type" },
          { key: "trigonometry", label: "Trigonometry", concept: "ratio relationships and angle application", fix: "write the known ratio set before manipulation", signal: "link the angle scenario to the correct ratio quickly" },
          { key: "surface-area-volume", label: "Surface Areas and Volumes", concept: "solid geometry and measurement logic", fix: "separate the visible surfaces from the full solid", signal: "choose area vs volume without confusion" },
          { key: "statistics", label: "Statistics", concept: "data summary and central tendency", fix: "organize the table before computing the measure", signal: "pick mean, median, or mode based on the data shape" },
        ],
      },
    ],
  },
];

const questionVariants = [
  {
    prompt: (topic, subject) => `Which choice best represents strong understanding of ${topic.label} in ${subject.label}?`,
    correct: (topic) => `Applying ${topic.concept} with confidence`,
    distractors: [
      "Relying only on guesswork",
      "Skipping the concept and memorizing options",
      "Avoiding practice whenever the wording changes",
    ],
  },
  {
    prompt: (topic) => `A student is weak in ${topic.label}. What is the most useful next step?`,
    correct: (topic) => `Focus on ${topic.fix}`,
    distractors: [
      "Start random tests without reviewing mistakes",
      "Ignore the topic and move to unrelated chapters",
      "Memorize final answers without checking method",
    ],
  },
  {
    prompt: (topic) => `Which signal usually shows improvement in ${topic.label}?`,
    correct: (topic) => `You can ${topic.signal}`,
    distractors: [
      "You answer faster without reading the question",
      "You change methods every time without reason",
      "You depend fully on elimination instead of understanding",
    ],
  },
  {
    prompt: (topic) => `When revising ${topic.label}, which approach is most reliable?`,
    correct: (topic) => `Link the idea to ${topic.concept}`,
    distractors: [
      "Read the topic once and avoid any worked examples",
      "Practice only solved answers and skip new questions",
      "Study the chapter without checking where mistakes happen",
    ],
  },
];

function shuffle(items) {
  const copy = [...items];
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
}

function buildQuestionPool(subject) {
  return subject.topics.flatMap((topic) =>
    questionVariants.map((variant, variantIndex) => {
      const options = shuffle([
        { id: `${topic.key}-correct-${variantIndex + 1}`, label: variant.correct(topic), correct: true },
        ...variant.distractors.map((option, optionIndex) => ({
          id: `${topic.key}-wrong-${variantIndex + 1}-${optionIndex + 1}`,
          label: option,
          correct: false,
        })),
      ]);

      const correctOption = options.find((option) => option.correct);

      return {
        id: `${subject.id}-${topic.key}-${variantIndex + 1}`,
        topicKey: topic.key,
        topicLabel: topic.label,
        prompt: variant.prompt(topic, subject),
        options: options.map(({ correct, ...option }) => option),
        correctOptionId: correctOption?.id,
      };
    }),
  );
}

function getDefaultState() {
  return {
    selectedExamId: null,
    selectedSubjectId: null,
    activeAttempt: null,
    reports: [],
    entitlements: {},
  };
}

function readState() {
  if (typeof window === "undefined") {
    return getDefaultState();
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return getDefaultState();
    }
    return { ...getDefaultState(), ...JSON.parse(rawValue) };
  } catch {
    return getDefaultState();
  }
}

function writeState(state) {
  if (typeof window === "undefined") {
    return;
  }
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getEntitlementKey(examId, subjectId) {
  return `${examId}:${subjectId}`;
}

function getExamById(examId) {
  return examCatalog.find((exam) => exam.id === examId) ?? null;
}

function getSubjectById(examId, subjectId) {
  return getExamById(examId)?.subjects.find((subject) => subject.id === subjectId) ?? null;
}

function withResolvedSelection(state = readState()) {
  const exam = getExamById(state.selectedExamId);
  const subject = exam?.subjects.find((item) => item.id === state.selectedSubjectId) ?? null;
  return { state, exam, subject };
}

export function getExamCatalog() {
  return examCatalog;
}

export function getStudentFlowSnapshot() {
  const { state, exam, subject } = withResolvedSelection();
  return {
    ...state,
    selectedExam: exam,
    selectedSubject: subject,
    latestReport: state.reports[0] ?? null,
  };
}

export function selectExam(examId) {
  const state = readState();
  const exam = getExamById(examId);
  if (!exam) {
    return getStudentFlowSnapshot();
  }

  const nextState = {
    ...state,
    selectedExamId: exam.id,
    selectedSubjectId: exam.subjects.some((subject) => subject.id === state.selectedSubjectId) ? state.selectedSubjectId : null,
  };
  writeState(nextState);
  return getStudentFlowSnapshot();
}

export function selectSubject(subjectId) {
  const state = readState();
  const exam = getExamById(state.selectedExamId);
  if (!exam) {
    return getStudentFlowSnapshot();
  }

  const subject = exam.subjects.find((item) => item.id === subjectId);
  if (!subject) {
    return getStudentFlowSnapshot();
  }

  writeState({
    ...state,
    selectedSubjectId: subject.id,
  });
  return getStudentFlowSnapshot();
}

export function getEligibility(examId, subjectId) {
  const state = readState();
  const subject = getSubjectById(examId, subjectId);
  if (!subject) {
    return { canStart: false, paymentRequired: false, free: false, message: "Choose a valid subject before starting." };
  }

  if (
    state.activeAttempt?.status === "active" &&
    state.activeAttempt.examId === examId &&
    state.activeAttempt.subjectId === subjectId
  ) {
    return { canStart: true, paymentRequired: false, free: state.activeAttempt.accessMode === "free", resume: true, message: "An in-progress test is available to resume." };
  }

  const entitlement = state.entitlements[getEntitlementKey(examId, subjectId)] ?? { freeUsed: false, paidCredits: 0 };
  if (!entitlement.freeUsed) {
    return { canStart: true, paymentRequired: false, free: true, amount: PAYMENT_AMOUNT, message: "Your first attempt for this exam and subject is free." };
  }
  if (entitlement.paidCredits > 0) {
    return { canStart: true, paymentRequired: false, free: false, paid: true, credits: entitlement.paidCredits, amount: PAYMENT_AMOUNT, message: `${entitlement.paidCredits} paid retest credit available.` };
  }
  return { canStart: false, paymentRequired: true, free: false, amount: PAYMENT_AMOUNT, message: `Your free attempt is used. Pay Rs. ${PAYMENT_AMOUNT} to unlock the next test.` };
}

export function startAttempt() {
  const snapshot = getStudentFlowSnapshot();
  const exam = snapshot.selectedExam;
  const subject = snapshot.selectedSubject;

  if (!exam || !subject) {
    throw new Error("Select an exam and subject before starting the test.");
  }

  const state = readState();
  if (
    state.activeAttempt?.status === "active" &&
    state.activeAttempt.examId === exam.id &&
    state.activeAttempt.subjectId === subject.id
  ) {
    return state.activeAttempt;
  }

  const eligibility = getEligibility(exam.id, subject.id);
  if (!eligibility.canStart || eligibility.paymentRequired) {
    throw new Error(eligibility.message);
  }

  const questionPool = shuffle(buildQuestionPool(subject)).slice(0, 30);
  if (questionPool.length < 30) {
    throw new Error("Not enough questions are available for this subject yet.");
  }

  const entitlementKey = getEntitlementKey(exam.id, subject.id);
  const entitlement = state.entitlements[entitlementKey] ?? { freeUsed: false, paidCredits: 0 };
  const accessMode = entitlement.freeUsed ? "paid" : "free";

  const attempt = {
    id: `attempt-${Date.now()}`,
    examId: exam.id,
    examLabel: exam.label,
    subjectId: subject.id,
    subjectLabel: subject.label,
    accessMode,
    startedAt: new Date().toISOString(),
    lastSavedAt: new Date().toISOString(),
    status: "active",
    answers: {},
    questions: questionPool,
  };

  writeState({
    ...state,
    activeAttempt: attempt,
    entitlements: {
      ...state.entitlements,
      [entitlementKey]:
        accessMode === "free"
          ? { ...entitlement, freeUsed: true }
          : { ...entitlement, paidCredits: Math.max(0, entitlement.paidCredits - 1) },
    },
  });

  return attempt;
}

export function getActiveAttempt() {
  return readState().activeAttempt;
}

export function saveAnswer(attemptId, questionId, optionId) {
  const state = readState();
  if (!state.activeAttempt || state.activeAttempt.id !== attemptId) {
    throw new Error("This test session is no longer active.");
  }

  const nextAttempt = {
    ...state.activeAttempt,
    answers: {
      ...state.activeAttempt.answers,
      [questionId]: optionId,
    },
    lastSavedAt: new Date().toISOString(),
  };

  writeState({
    ...state,
    activeAttempt: nextAttempt,
  });

  return nextAttempt;
}

export function submitAttempt(attemptId) {
  const state = readState();
  const attempt = state.activeAttempt;
  if (!attempt || attempt.id !== attemptId) {
    throw new Error("This test could not be submitted. Please retry.");
  }

  const summary = attempt.questions.reduce(
    (accumulator, question) => {
      const answer = attempt.answers[question.id];
      if (!answer) {
        accumulator.unanswered += 1;
        accumulator.topicMisses[question.topicKey] = (accumulator.topicMisses[question.topicKey] ?? 0) + 1;
        return accumulator;
      }
      if (answer === question.correctOptionId) {
        accumulator.correct += 1;
        return accumulator;
      }
      accumulator.wrong += 1;
      accumulator.topicMisses[question.topicKey] = (accumulator.topicMisses[question.topicKey] ?? 0) + 1;
      return accumulator;
    },
    { correct: 0, wrong: 0, unanswered: 0, topicMisses: {} },
  );

  const weakTopics = Object.entries(summary.topicMisses)
    .map(([topicKey, misses]) => {
      const topic = getSubjectById(attempt.examId, attempt.subjectId)?.topics.find((item) => item.key === topicKey);
      return topic ? { key: topic.key, label: topic.label, misses } : null;
    })
    .filter(Boolean)
    .sort((left, right) => right.misses - left.misses)
    .slice(0, 5);

  const total = attempt.questions.length;
  const report = {
    id: `report-${Date.now()}`,
    examId: attempt.examId,
    examLabel: attempt.examLabel,
    subjectId: attempt.subjectId,
    subjectLabel: attempt.subjectLabel,
    total,
    correct: summary.correct,
    wrong: summary.wrong,
    unanswered: summary.unanswered,
    score: summary.correct,
    percentage: Math.round((summary.correct / total) * 100),
    weakTopics,
    submittedAt: new Date().toISOString(),
    accessMode: attempt.accessMode,
  };

  writeState({
    ...state,
    activeAttempt: null,
    reports: [report, ...state.reports],
  });

  return report;
}

export function getLatestReport() {
  return readState().reports[0] ?? null;
}

export function getReportById(reportId) {
  if (!reportId) {
    return getLatestReport();
  }
  return readState().reports.find((report) => report.id === reportId) ?? null;
}

export function getLearningContent(reportId) {
  const report = getReportById(reportId);
  if (!report) {
    return [];
  }

  const subject = getSubjectById(report.examId, report.subjectId);
  if (!subject) {
    return [];
  }

  return report.weakTopics
    .map((topicSummary) => {
      const topic = subject.topics.find((item) => item.key === topicSummary.key);
      if (!topic) {
        return null;
      }
      return {
        key: topic.key,
        title: `${topic.label} recovery guide`,
        summary: `Focus this review on ${topic.concept} for ${report.examLabel} ${report.subjectLabel}.`,
        bullets: [
          `Core reset: rebuild the topic around ${topic.concept}.`,
          `Practice move: ${topic.fix}.`,
          `Improvement signal: ${topic.signal}.`,
        ],
        misses: topicSummary.misses,
      };
    })
    .filter(Boolean);
}

export function purchaseRetest(examId, subjectId) {
  const state = readState();
  const exam = getExamById(examId);
  const subject = getSubjectById(examId, subjectId);
  if (!exam || !subject) {
    throw new Error("Choose an exam and subject before payment.");
  }

  const entitlementKey = getEntitlementKey(examId, subjectId);
  const entitlement = state.entitlements[entitlementKey] ?? { freeUsed: false, paidCredits: 0 };

  writeState({
    ...state,
    entitlements: {
      ...state.entitlements,
      [entitlementKey]: {
        ...entitlement,
        paidCredits: entitlement.paidCredits + 1,
      },
    },
  });

  return {
    exam,
    subject,
    amount: PAYMENT_AMOUNT,
    status: "success",
    message: `Payment received. One retest credit is now available for ${subject.label}.`,
  };
}

export function resetSelectionFromReport(report) {
  if (!report) {
    return getStudentFlowSnapshot();
  }
  const state = readState();
  writeState({
    ...state,
    selectedExamId: report.examId,
    selectedSubjectId: report.subjectId,
  });
  return getStudentFlowSnapshot();
}

export function getPaymentAmount() {
  return PAYMENT_AMOUNT;
}
