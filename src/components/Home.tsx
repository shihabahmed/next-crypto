import { generateKeyPair, decrypt, encrypt, exportKeyPair, importPrivateKey, importPublicKey } from '@/helper/rsa';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const _Home = () => {
  const [keyPair, setKeyPair] = useState({ publicKey: '', privateKey: '' });
  const [audioData, setAudioData] = useState<any>();
  const [encryptedData, setEncryptedData] = useState<any>();

  useEffect(() => {
    generateKeyPair();
  }, []);

  const importPublicKeyFile = (e: any) => {
    importPublicKey(e.target.files[0]);
  };

  const importPrivateKeyFile = (e: any) => {
    importPrivateKey(e.target.files[0]);
  };

  const encryptFile = (e: any) => {
    if (e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (): void => {
        encrypt(reader.result as ArrayBuffer).then((url: string | void) => {
          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'encrypted.mp3';
            link.click();
            URL.revokeObjectURL(link.href);
          }
        });
      };
      reader.readAsArrayBuffer(e.target.files[0]);
      e.target.value = null;
    }
  };

  const decryptFile = (e: any) => {
    if (e.target.files.length > 0) {
      const reader = new FileReader();
      reader.onload = (): void => {
        decrypt(reader.result as ArrayBuffer).then((url: string | void) => {
          if (url) {
            const link = document.createElement('a');
            link.href = url;
            link.download = 'decrypted.mp3';
            link.click();
            URL.revokeObjectURL(link.href);
          }
        });
      };
      reader.readAsArrayBuffer(e.target.files[0]);
      e.target.value = null;
    }
  };

  return (
    <main className={`flex min-h-screen flex-col items-center p-10 ${inter.className}`}>
      <div className="flex flex-col justify-center text-center gap-4">
        <button id="downloadKeys" className="btn bg-indigo-500" onClick={generateKeyPair}>
          Regenerate Keys
        </button>
        <button id="downloadKeys" className="btn bg-sky-500" onClick={exportKeyPair}>
          Download Keys
        </button>

        <label htmlFor="dropzone-file-pem-public" className="btn cursor-pointer bg-amber-500 mt-6">
          Import Public Key <input id="dropzone-file-pem-public" type="file" onChange={importPublicKeyFile} className="hidden" />{' '}
        </label>
        <label htmlFor="dropzone-file-pem-private" className="btn cursor-pointer bg-orange-500">
          Import Private Key <input id="dropzone-file-pem-private" type="file" onChange={importPrivateKeyFile} className="hidden" />{' '}
        </label>

        <label htmlFor="dropzone-file-encrypt" className="btn cursor-pointer bg-gray-600 mt-6">
          Encrypt File <input id="dropzone-file-encrypt" type="file" onChange={encryptFile} className="hidden" />{' '}
        </label>
        <label htmlFor="dropzone-file-decrypt" className="btn cursor-pointer bg-lime-600">
          Decrypt File <input id="dropzone-file-decrypt" type="file" onChange={decryptFile} className="hidden" />{' '}
        </label>
      </div>
    </main>
  );
};
