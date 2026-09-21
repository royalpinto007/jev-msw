import type {
  ChoiceAnswer,
  JevAnswer,
  JevAnswerInput,
  JevQuestion,
  JevRequest,
  JevResponse,
  JevUsage,
  ScoreAnswer,
} from "./types.js";

const assertProbability = (name: string, value: number): void => {
  if (!Number.isFinite(value) || value < 0 || value > 1)
    throw new Error(`jev-msw ${name} must be between 0 and 1.`);
};
const round = (value: number): number => Number(value.toFixed(12));

function assertDistribution(labels: string[], probabilities: Record<string, number>): void {
  const provided = Object.keys(probabilities);
  if (provided.length !== labels.length || labels.some((label) => !provided.includes(label)))
    throw new Error("jev-msw probabilities must include every incoming criterion exactly once.");
  for (const probability of Object.values(probabilities))
    assertProbability("probability", probability);
  const total = Object.values(probabilities).reduce((sum, probability) => sum + probability, 0);
  if (Math.abs(total - 1) > 1e-9) throw new Error("jev-msw probabilities must sum to 1.");
}

function choiceAnswer(question: JevQuestion, answer: ChoiceAnswer): JevAnswer {
  if (question.type !== "choice" || !question.criteria || Array.isArray(question.criteria))
    throw new Error("jev-msw choice answer requires an incoming choice question.");
  assertProbability("confidence", answer.confidence);
  const labels = Object.keys(question.criteria);
  if (!labels.includes(answer.choice))
    throw new Error(`jev-msw choice "${answer.choice}" is not present in the incoming criteria.`);
  if (answer.probabilities) {
    for (const label of Object.keys(answer.probabilities)) {
      if (!labels.includes(label))
        throw new Error(`jev-msw probability label "${label}" is not present in the criteria.`);
    }
    assertDistribution(labels, answer.probabilities);
  }
  const probabilities =
    answer.probabilities ??
    Object.fromEntries(
      labels.map((label) => [
        label,
        label === answer.choice
          ? labels.length === 1
            ? 1
            : answer.confidence
          : round((1 - answer.confidence) / Math.max(labels.length - 1, 1)),
      ]),
    );
  return { ...answer, probabilities };
}

function scoreAnswer(question: JevQuestion, answer: ScoreAnswer): JevAnswer {
  if (question.type !== "score" || !Array.isArray(question.criteria))
    throw new Error("jev-msw score answer requires an incoming score question.");
  assertProbability("confidence", answer.confidence);
  if (!Number.isFinite(answer.score)) throw new Error("jev-msw score must be a finite number.");
  if (answer.score < 0 || answer.score > question.criteria.length - 1)
    throw new Error("jev-msw score must be within the incoming rubric range.");
  if (answer.probabilities)
    assertDistribution(
      question.criteria.map((_, index) => String(index)),
      answer.probabilities,
    );
  const legend =
    answer.legend ??
    Object.fromEntries(question.criteria.map((entry, index) => [String(index), entry]));
  const indices = question.criteria.map((_, index) => String(index));
  const nearest = String(Math.max(0, Math.min(indices.length - 1, Math.round(answer.score))));
  const probabilities =
    answer.probabilities ??
    Object.fromEntries(
      indices.map((index) => [
        index,
        index === nearest
          ? answer.confidence
          : round((1 - answer.confidence) / Math.max(indices.length - 1, 1)),
      ]),
    );
  return { ...answer, legend, probabilities };
}

export function completeAnswer(question: JevQuestion, answer: JevAnswerInput): JevAnswer {
  if (answer.type === "choice") return choiceAnswer(question, answer);
  if (answer.type === "score") return scoreAnswer(question, answer);
  if (question.type !== "noul")
    throw new Error("jev-msw noul answer requires an incoming noul question.");
  assertProbability("noul", answer.noul);
  return answer;
}

export function completeResponse(
  request: JevRequest,
  response: JevResponse,
): Required<JevResponse> {
  const answers = Object.fromEntries(
    Object.entries(response.answers).map(([name, answer]) => {
      const question = request.questions[name];
      if (!question)
        throw new Error(`jev-msw could not find question "${name}" in the incoming request.`);
      return [name, completeAnswer(question, answer)];
    }),
  );
  const usage: JevUsage = response.usage ?? { input_tokens: 0, output_tokens: 0 };
  return { model: response.model ?? request.model, answers, usage };
}
