import convertToAudioData from '@/helper/audio';
// import { exportCryptoKey, rsa } from '@/helper/key';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';

import { generateRSAKeyPair, encryptStringRsa, decryptStringRsa } from '@/helper/rsa-crypto';

const inter = Inter({ subsets: ['latin'] });

export const _Home_OLD = () => {
  const [keyPair, setKeyPair] = useState({ publicKey: '', privateKey: '' });
  const [audioData, setAudioData] = useState<any>();
  const [encryptedData, setEncryptedData] = useState<any>();

  const handleFileUpload = async (event: any) => {
    const file = event.target.files[0];
    if (!file) return;

    try {
      const _audioData = await convertToAudioData(file);
      setAudioData(_audioData);
      // Now you can use the audioData for encryption or other processing
    } catch (error) {
      console.error('Error converting audio:', error);
    }
  };

  const generateKeys = async () => {
    const _keyPair = await generateRSAKeyPair();
    setKeyPair(_keyPair);
  };

  useEffect(() => {
    generateKeys();
  }, []);

  const exportKeyPair = () => {
    if (keyPair.privateKey) {
      downloadPemFile(keyPair.privateKey, 'next_crypto_private.pem');
    }
    if (keyPair.publicKey) {
      downloadPemFile(keyPair.publicKey, 'next_crypto_public.pem');
    }
  };

  const downloadPemFile = (content: string, fileName: string) => {
    const link = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const changeFilePemPrivate = (files: FileList) => {
    const file = files[0];
    if (!file) {
      return;
    }
    if (file.size > 1024 * 1024 * 50) {
      return alert('文件太大');
    }
    const reader = new FileReader();
    reader.onload = async function () {
      const privateKey = reader.result as string;
      setKeyPair({
        ...keyPair,
        privateKey: privateKey
      });
    };
    reader.readAsText(file);
  };

  // Usage example
  const encrypt = async () => {
    try {
      const _encryptedData = await encryptStringRsa(audioData.arrayBuffer, keyPair.publicKey);
      setEncryptedData(_encryptedData);
      // saveFile(_encryptedData, audioData.name + '_encrypted');
    } catch (err) {
      alert('Encryption failed.');
      console.error(err);
    }
  };

  const decrypt = async () => {
    try {
      const decryptedData = await decryptStringRsa(encryptedData, keyPair.privateKey);

      console.dir(audioData.arrayBuffer);
      console.dir(decryptedData);
      // saveFile(decryptedData, audioData.name, audioData.type);
    } catch (err) {
      alert('Decryption failed.');
      console.error(err);
    }

    // const decryptedKey = await decryptStringRsa(encryptedKey, rsaKeyPair.privateKey);
    // console.log('decrypt: ',decryptedKey)
    // ----------------------------------------------------------
    // const decryptedData = await decryptAudio(keyPair.privateKey, encryptedData);
    // console.log('Decrypted: ', decryptedData);

    // // const audioContext = new AudioContext();
    // // const audioBuffer = await audioContext.decodeAudioData(decryptedData as ArrayBuffer);
    // const decryptedArrayBuffer = new Uint8Array(decryptedData as ArrayBuffer);
    // console.log('AudioBuffer:', decryptedArrayBuffer);
  };

  const saveFile = (data: any, fileName: string, fileType?: string) => {
    const tempEl = document.createElement('a');
    document.body.appendChild(tempEl);
    const blob = fileType ? new Blob([data], { type: fileType }) : new Blob([data]);
    const url = window.URL.createObjectURL(blob);
    tempEl.href = url;
    tempEl.download = fileName;
    tempEl.click();
    window.URL.revokeObjectURL(url);
  };

  // const decryptedAudio = await decryptAudio(privateKey, encryptedAudio);
  // Play or process the decrypted audio

  return (
    <main className={`flex min-h-screen flex-col items-center p-24 ${inter.className}`}>
      <div className="border border-gray-400 rounded-md p-2">
        <input type="file" name="audio" id="" onChange={handleFileUpload} />
        {/* <input
          type="file"
          name="audioTest"
          id=""
          onChange={(event) => {
            test(event);
          }}
        /> */}
      </div>
      <div className="flex justify-center gap-8 mt-4">
        <button className="bg-blue-500 text-white px-4 py-2 rounded-md" onClick={exportKeyPair}>
          Export Key Pair
        </button>
        <label htmlFor="dropzone-file-pem-private" className="cursor-pointer bg-orange-600 text-white px-4 py-2 rounded-md">
          Import Private Key
          <input id="dropzone-file-pem-private" type="file" className="hidden" onChange={(e) => e.target.files && changeFilePemPrivate(e.target.files)} />
        </label>
      </div>
      <div className="flex justify-center gap-8 mt-4">
        <button className="bg-gray-500 text-white px-4 py-2 rounded-md" onClick={encrypt}>
          Encrypt
        </button>
        <button className="bg-green-600 text-white px-4 py-2 rounded-md" onClick={decrypt}>
          Decrypt
        </button>
      </div>
    </main>
  );
};
