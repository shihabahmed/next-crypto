// Assume you have an uploaded audio file (e.g., from an input element)
const convertToAudioData = async (file: any) => {
  const audioBuffer = await readFileAsArrayBuffer(file);
  const arrayBuffer = await file.arrayBuffer();
  // const audioData = await readAudioData(arrayBuffer);

  const audioContext = new AudioContext();
  const audioData = await audioContext.decodeAudioData(audioBuffer);

  return {
    lastModified: file.lastModified,
    lastModifiedDate: file.lastModifiedDate,
    name: file.name,
    size: file.size,
    type: file.type,
    audioData,
    arrayBuffer
  };
};

const readFileAsArrayBuffer = async (file: File): Promise<ArrayBuffer> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => resolve(event.target?.result as ArrayBuffer);
    reader.onerror = (error) => reject(error);
    reader.readAsArrayBuffer(file);
  });

export default convertToAudioData;
