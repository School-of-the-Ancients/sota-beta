export const extractInlineImageData = (response: any): string | null => {
  const parts = response?.candidates?.[0]?.content?.parts;
  if (Array.isArray(parts)) {
    for (const part of parts) {
      const inlineData = part?.inlineData?.data;
      if (inlineData) {
        return inlineData;
      }
    }
  }

  const legacyBytes = response?.generatedImages?.[0]?.image?.imageBytes;
  if (legacyBytes) {
    return legacyBytes;
  }

  return null;
};
