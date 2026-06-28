export type AssessedLetter = {
  id: string;
  character: string;
  correct: boolean;
};

export type PronunciationAssessment = {
  score: number;
  transcript: string;
  letters: AssessedLetter[];
};

function normalizeWord(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "");
}

export function assessPronunciation(expected: string, transcript: string): PronunciationAssessment {
  const target = normalizeWord(expected);
  const actual = normalizeWord(transcript);
  const rows = target.length + 1;
  const columns = actual.length + 1;
  const distances = Array.from({ length: rows }, () => Array<number>(columns).fill(0));

  for (let row = 0; row < rows; row += 1) distances[row][0] = row;
  for (let column = 0; column < columns; column += 1) distances[0][column] = column;

  for (let row = 1; row < rows; row += 1) {
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = target[row - 1] === actual[column - 1] ? 0 : 1;
      distances[row][column] = Math.min(
        distances[row - 1][column] + 1,
        distances[row][column - 1] + 1,
        distances[row - 1][column - 1] + substitutionCost,
      );
    }
  }

  const reversedLetters: Omit<AssessedLetter, "id">[] = [];
  let row = target.length;
  let column = actual.length;
  while (row > 0 || column > 0) {
    const sameCharacter = row > 0 && column > 0 && target[row - 1] === actual[column - 1];
    if (sameCharacter && distances[row][column] === distances[row - 1][column - 1]) {
      reversedLetters.push({ character: target[row - 1], correct: true });
      row -= 1;
      column -= 1;
    } else if (row > 0 && column > 0 && distances[row][column] === distances[row - 1][column - 1] + 1) {
      reversedLetters.push({ character: target[row - 1], correct: false });
      row -= 1;
      column -= 1;
    } else if (row > 0 && distances[row][column] === distances[row - 1][column] + 1) {
      reversedLetters.push({ character: target[row - 1], correct: false });
      row -= 1;
    } else {
      column -= 1;
    }
  }

  const distance = distances[target.length][actual.length];
  const longestLength = Math.max(target.length, actual.length, 1);
  return {
    score: Math.max(0, Math.round((1 - distance / longestLength) * 100)),
    transcript,
    letters: reversedLetters
      .reverse()
      .map((letter, index) => ({ ...letter, id: `${index}-${letter.character}` })),
  };
}
