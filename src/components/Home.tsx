import { generateKeyPair, decrypt, encrypt, exportKeyPair, importPrivateKeyFile, importPublicKeyFile } from '@/helper/rsa';
import { Inter } from 'next/font/google';
import { useEffect, useState } from 'react';

const inter = Inter({ subsets: ['latin'] });

export const _Home = () => {
  const [keyPair, setKeyPair] = useState<CryptoKeyPair>();
  const [audioData, setAudioData] = useState<any>();
  const [encryptedData, setEncryptedData] = useState<any>();

  useEffect(() => {
    generateKeyPair();
  }, []);

  const eventHandler = {
    generateKeyPair: () => {
      generateKeyPair().then(keys=> {
        // exportKeyPair(keys);
        setKeyPair(keys);
        // setPrivateKey(keys.privateKey)
        // setPublicKey(keys.publicKey)
      });
    },
    exportKeyPair: () => {
      // privateKey && exportPrivateKey(privateKey);
      // publicKey && exportPrivateKey(publicKey);
      if (keyPair) {
        exportKeyPair(keyPair, true)
      }
    },
    importPublicKeyFile: (e: any) => {
      importPublicKeyFile(e.target.files[0], (key: any) => {
        setKeyPair({...keyPair, ...key});
      });
    },
    importPrivateKeyFile: (e: any) => {
      importPrivateKeyFile(e.target.files[0], (key: any) => {
        setKeyPair({...keyPair, ...key});
      });
    },
    encryptFile: (e: any) => {
      if (e.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (): void => {
          encrypt(reader.result as ArrayBuffer, keyPair?.publicKey).then((url: string | void) => {
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
    },
    decryptFile: (e: any) => {
      if (e.target.files.length > 0) {
        const reader = new FileReader();
        reader.onload = (): void => {
          decrypt(reader.result as ArrayBuffer, keyPair?.privateKey).then((url: string | void) => {
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
    }
  };

  useEffect(eventHandler.generateKeyPair, []);

  useEffect(() => {
    keyPair && typeof keyPair !== 'undefined' && exportKeyPair(keyPair);
  }, [keyPair]);


  return (
    <main className={`flex min-h-screen flex-col items-center p-10 ${inter.className}`}>
      <div className="flex flex-col justify-center text-center gap-4">
        <button id="downloadKeys" className="btn bg-indigo-500" onClick={eventHandler.generateKeyPair}>
          Regenerate Keys
        </button>
        <button id="downloadKeys" className="btn bg-sky-500" onClick={eventHandler.exportKeyPair}>
          Download Keys
        </button>

        <label htmlFor="dropzone-file-pem-public" className="btn cursor-pointer bg-amber-500 mt-6">
          Import Public Key <input id="dropzone-file-pem-public" type="file" onChange={eventHandler.importPublicKeyFile} className="hidden" />{' '}
        </label>
        <label htmlFor="dropzone-file-pem-private" className="btn cursor-pointer bg-orange-500">
          Import Private Key <input id="dropzone-file-pem-private" type="file" onChange={eventHandler.importPrivateKeyFile} className="hidden" />{' '}
        </label>

        <label htmlFor="dropzone-file-encrypt" className="btn cursor-pointer bg-gray-600 mt-6">
          Encrypt File <input id="dropzone-file-encrypt" type="file" onChange={eventHandler.encryptFile} className="hidden" />{' '}
        </label>
        <label htmlFor="dropzone-file-decrypt" className="btn cursor-pointer bg-lime-600">
          Decrypt File <input id="dropzone-file-decrypt" type="file" onChange={eventHandler.decryptFile} className="hidden" />{' '}
        </label>
      </div>
    </main>
  );
};
