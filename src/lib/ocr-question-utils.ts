import type { OcrExtractedQuestion } from '@/lib/ocr-api';
import type { OptionKey } from '@/types/question-library';
import { OPTION_KEYS } from '@/types/question-library';

const ARABIC_OPTION_KEYS: Record<string, OptionKey> = {
  أ: 'A',
  ا: 'A',
  ب: 'B',
  ج: 'C',
  د: 'D',
};

export function optionKeyFromLabel(label: string, index: number): OptionKey | null {
  const normalized = label.trim().replace(/[).:،]/g, '');
  if (OPTION_KEYS.includes(normalized as OptionKey)) {
    return normalized as OptionKey;
  }
  return ARABIC_OPTION_KEYS[normalized] ?? OPTION_KEYS[index] ?? null;
}

export function correctKeyFromQuestion(question: OcrExtractedQuestion): OptionKey | null {
  const byIndex = question.correct_answer_index;
  if (
    byIndex != null &&
    Number.isInteger(byIndex) &&
    byIndex >= 0 &&
    byIndex < OPTION_KEYS.length
  ) {
    return OPTION_KEYS[byIndex];
  }

  const correct = question.correct_answer?.trim();
  if (!correct) return null;

  const direct = optionKeyFromLabel(correct, -1);
  if (direct) return direct;

  const optionIndex = question.options.findIndex(
    (option) =>
      option.label?.trim() === correct || option.text.trim() === correct
  );
  return optionIndex >= 0 ? OPTION_KEYS[optionIndex] : null;
}

export function normalizeOcrOptions(question: OcrExtractedQuestion) {
  return OPTION_KEYS.map((option_key, index) => {
    const found =
      question.options.find(
        (option, optionIndex) =>
          optionKeyFromLabel(option.label ?? '', optionIndex) === option_key
      ) ?? question.options[index];

    return {
      option_key,
      option_text: found?.text.trim() ?? '',
    };
  });
}

export function buildPromptText(question: OcrExtractedQuestion) {
  const prompt = question.question_text.trim();
  const imageLines = (question.question_images ?? [])
    .filter((image) => image.image_blob)
    .slice(1)
    .map(
      (image, index) =>
        `صورة إضافية ${index + 1}: ${image.short_description ?? 'صورة مرتبطة بالسؤال'}`
    );

  return imageLines.length
    ? `${prompt}\n\n${imageLines.join('\n')}`
    : prompt;
}

export function primaryQuestionImage(question: OcrExtractedQuestion) {
  return question.question_images?.find((image) => image.image_blob);
}

export function isPdfFile(file: File | null) {
  if (!file) return false;
  return file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
}

export function isImageFile(file: File) {
  return (
    file.type.startsWith('image/') ||
    /\.(png|jpe?g|webp|gif|avif|bmp|tiff?)$/i.test(file.name)
  );
}

export function selectedFilesLabel(files: File[]) {
  if (files.length === 0) return 'اختر PDF واحد أو حتى 8 صور من الجهاز';
  if (files.length === 1) return files[0].name;
  return `${files.length} صور مختارة: ${files.map((file) => file.name).join('، ')}`;
}

export function canSaveOcrQuestion(question: OcrExtractedQuestion) {
  const options = normalizeOcrOptions(question);
  return (
    question.question_text.trim().length > 0 &&
    options.length === 4 &&
    options.every((option) => option.option_text.trim().length > 0)
  );
}
