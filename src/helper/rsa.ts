import { FC } from 'react';

interface KeyPair {
  publicKey: CryptoKey;
  privateKey: CryptoKey;
}

let keyPair: KeyPair; // Used by several handlers later

export const generateKeyPair = (): Promise<CryptoKeyPair> => {
  // Returns a promise.
  // Takes no input, yields no output to then handler.
  // Side effect: updates keyPair in enclosing scope with new value.

  return window.crypto.subtle
    .generateKey(
      {
        name: 'RSA-OAEP',
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]), // 24 bit representation of 65537
        hash: { name: 'SHA-256' }
      },
      true, // can extract it later if we want
      ['encrypt', 'decrypt']
    )
    .then((keys: CryptoKeyPair) => {
      keyPair = keys;
      return keys;
    });
};

const _arrayBufferToBase64 = (arrayBuffer: ArrayBuffer): string => {
  const byteArray = new Uint8Array(arrayBuffer);
  let byteString = '';
  for (let i = 0; i < byteArray.byteLength; i++) {
    byteString += String.fromCharCode(byteArray[i]);
  }
  const b64 = window.btoa(byteString);

  return b64;
};

const addNewLines = (str: string): string => {
  let finalString = '';
  while (str.length > 0) {
    finalString += str.substring(0, 64) + '\n';
    str = str.substring(64);
  }

  return finalString;
};

const toPem = (privateKey: ArrayBuffer, keyType: 'private' | 'public'): string => {
  const b64 = addNewLines(_arrayBufferToBase64(privateKey));
  const pem = keyType === 'private' ? `-----BEGIN PRIVATE KEY-----\n${b64}-----END PRIVATE KEY-----` : `-----BEGIN PUBLIC KEY-----\n${b64}-----END PUBLIC KEY-----`;

  return pem;
};

export const exportKeyPair = async (): Promise<void> => {
  const keyPairPem = {
    publicKey: '',
    privateKey: ''
  };
  const exportedPrivateKey = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);
  keyPairPem.privateKey = toPem(exportedPrivateKey, 'private');

  const exportedPublicKey = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
  keyPairPem.publicKey = toPem(exportedPublicKey, 'public');

  if (keyPairPem.privateKey) {
    downloadPemFile(keyPairPem.privateKey, 'rsa_private_key.pem');
  }
  if (keyPairPem.publicKey) {
    downloadPemFile(keyPairPem.publicKey, 'rsa_public_key.pem');
  }
};

const downloadPemFile = (content: string, fileName: string): void => {
  const link = document.createElement('a');
  const file = new Blob([content], { type: 'text/plain' });
  link.href = URL.createObjectURL(file);
  link.download = fileName;
  link.click();
  URL.revokeObjectURL(link.href);
};

const str2ab = (pem: string, isPrivate = false): ArrayBuffer => {
  const pemHeader = isPrivate ? '-----BEGIN PRIVATE KEY-----' : '-----BEGIN PUBLIC KEY-----';
  const pemFooter = isPrivate ? '-----END PRIVATE KEY-----' : '-----END PUBLIC KEY-----';

  const pemContents = pem.substring(pemHeader.length, pem.length - pemFooter.length);

  // base64 decode the string to get the binary data
  const str = window.atob(pemContents);

  const buf = new ArrayBuffer(str.length);
  const bufView = new Uint8Array(buf);
  for (let i = 0, strLen = str.length; i < strLen; i++) {
    bufView[i] = str.charCodeAt(i);
  }
  return buf;
};

export const importPrivateKey = (file: File): void => {
  try {
    const reader = new FileReader();
    reader.onload = async function () {
      // const privateKey = new TextEncoder().encode(reader.result);
      // convert from a binary string to an ArrayBuffer
      const privateKey = str2ab(reader.result as string, true);
      const importedKey = await crypto.subtle.importKey(
        'pkcs8', // PKCS#8 format
        privateKey,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false, // not extractable
        ['decrypt']
      );
      keyPair = {
        ...keyPair,
        privateKey: importedKey
      };
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing public key:', error);
  }
};

export const importPublicKey = (file: File): void => {
  try {
    const reader = new FileReader();
    reader.onload = async function () {
      const publicKey = str2ab(reader.result as string);
      const importedKey = await crypto.subtle.importKey(
        'spki', // X.509 SubjectPublicKeyInfo format
        publicKey,
        { name: 'RSA-OAEP', hash: 'SHA-256' },
        false, // not extractable
        ['encrypt']
      );
      keyPair = {
        ...keyPair,
        publicKey: importedKey
      };
    };
    reader.readAsText(file);
  } catch (error) {
    console.error('Error importing public key:', error);
  }
};

// Click handlers to encrypt or decrypt the given file:

export const encrypt = (plainText: ArrayBuffer): Promise<string | void> => {
  const _encrypt = (plainText: ArrayBuffer, publicKey: CryptoKey): Promise<Blob> => {
    // Returns a Promise that yields a Blob to its
    // then handler. The Blob points to an encrypted
    // representation of the file. The structure of the
    // Blob's content's structure:
    //    16 bit integer length of encrypted session key
    //    encrypted session key
    //    128 bit (16 byte) iv (initialization vector)
    //    AES-CBC encryption of plaintext using session key and iv

    let sessionKey: CryptoKey, encryptedFile: [Uint8Array, Uint8Array]; // Used in two steps, so saved here for passing

    // The handlers for each then clause:

    const encryptPlaintext = (cryptoKey: CryptoKey): Promise<[Uint8Array, Uint8Array]> => {
      sessionKey = cryptoKey;
      const iv = window.crypto.getRandomValues(new Uint8Array(16));

      return window.crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, sessionKey, plainText).then((cipherText) => {
        return [iv, new Uint8Array(cipherText)];
      });
    };

    const encryptSessionKey = (ivAndCipherText: [Uint8Array, Uint8Array]): Promise<ArrayBuffer> => {
      // Returns a Promise that yields an ArrayBuffer containing
      // the encryption of the exportedKey provided as a parameter,
      // using the publicKey found in an enclosing scope.
      encryptedFile = ivAndCipherText;
      return window.crypto.subtle.exportKey('raw', sessionKey).then((exportedKey: ArrayBuffer) => {
        return window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, exportedKey);
      });
    };

    const packageResults = (encryptedKey: ArrayBuffer): Blob => {
      // Returns a Blob representing the package of
      // the encryptedKey it is provided and the encryptedFile
      // (in an enclosing scope) that was created with the
      // session key.

      const length = new Uint16Array([encryptedKey.byteLength]);
      return new Blob(
        [
          length, // Always a 2 byte unsigned integer
          encryptedKey, // "length" bytes long
          encryptedFile[0], // 16 bytes long initialization vector
          encryptedFile[1] // Remainder is the ciphertext
        ],
        { type: 'application/octet-stream' }
      );
    };

    return window.crypto.subtle.generateKey({ name: 'AES-CBC', length: 128 }, true, ['encrypt', 'decrypt']).then(encryptPlaintext).then(encryptSessionKey).then(packageResults);
  }; // End of encrypt

  return _encrypt(plainText, keyPair.publicKey)
    .then((blob) => {
      return URL.createObjectURL(blob);
    })
    .catch((err: Error) => {
      console.error('Something went wrong encrypting: ' + err.message + '\n' + err.stack);
      console.error(err);
    });
};

export const decrypt = (data: ArrayBuffer): Promise<string | void> => {
    // First, separate out the relevant pieces from the file.
    const keyLength = new Uint16Array(data, 0, 2)[0]; // First 16 bit integer
    const encryptedKey = new Uint8Array(data, 2, keyLength);
    const iv = new Uint8Array(data, 2 + keyLength, 16);
    const cipherText = new Uint8Array(data, 2 + keyLength + 16);

    const _decrypt = (cipherText: Uint8Array, iv: Uint8Array, encryptedSessionKey: Uint8Array, privateKey: CryptoKey): Promise<Blob> => {
      // Returns a Promise the yields a Blob containing the decrypted cipherText.

      const decryptKey = (encryptedKey: Uint8Array, privateKey: CryptoKey): Promise<CryptoKey> => {
        // Returns a Promise that yields a Uint8Array AES key.
        // encryptedKey is a Uint8Array, privateKey is the privateKey
        // property of a Key key pair.
        return window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedKey).then((keyBytes: ArrayBuffer): Promise<CryptoKey> => {
          // Returns a Promise yielding an AES-CBC Key from the
          // Uint8Array of bytes it is given.
          return window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC', length: 128 }, true, ['encrypt', 'decrypt']);
        });
      }

      const decryptCipherText = (sessionKey: CryptoKey): Promise<Blob> => {
        // Returns a Promise yielding a Blob containing the decryption of cipherText
        // (from an enclosing scope) using the sessionKey and the iv
        // (initialization vector, from an enclosing scope).
        return window.crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, sessionKey, cipherText).then((plainText) => {
          return new Blob([new Uint8Array(plainText)], { type: 'application/octet-stream' });
        });
      }
      
      return decryptKey(encryptedSessionKey, privateKey).then(decryptCipherText);
    }; // end of decrypt

    return _decrypt(cipherText, iv, encryptedKey, keyPair.privateKey)
      .then((blob) => {
        return URL.createObjectURL(blob);
      })
      .catch((err: Error) => {
        alert('Something went wrong decrypting: ' + err.message + '\n' + err.stack);
      });
}; // end of decrypt
