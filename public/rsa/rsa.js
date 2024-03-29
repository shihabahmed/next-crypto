// Public Key Cryptography with Web Cryptography API
//
// Copyright 2014 Info Tech, Inc.
// Provided under the MIT license.
// See LICENSE file for details.

// Will create a random key pair for public-key encryption and
// decryption. A file can be selected and then encrypted or
// decrypted with that key pair.

document.addEventListener('DOMContentLoaded', function () {
  'use strict';

  // Fix Apple prefix if needed
  if (window.crypto && !window.crypto.subtle && window.crypto.webkitSubtle) {
    window.crypto.subtle = window.crypto.webkitSubtle; // Won't work if subtle already exists
  }

  if (!window.crypto || !window.crypto.subtle) {
    alert('Your current browser does not support the Web Cryptography API! This page will not work.');
    return;
  }

  var keyPair; // Used by several handlers later

  createAndSaveAKeyPair()
    .then(function () {
      // Only enable the cryptographic operation buttons if a key pair can be created
      document.getElementById('dropzone-file-pem-public').addEventListener('change', importPublicKeyFile);
      document.getElementById('dropzone-file-pem-private').addEventListener('change', importPrivateKeyFile);
      document.getElementById('downloadKeys').addEventListener('click', exportKeyPair);
      document.getElementById('encrypt').addEventListener('click', encryptTheFile);
      document.getElementById('decrypt').addEventListener('click', decryptTheFile);
    })
    .catch(function (err) {
      alert('Could not create a keyPair or enable buttons: ' + err.message);
    });

  // Key pair creation:

  function createAndSaveAKeyPair() {
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
      .then(function (key) {
        keyPair = key;
        return key;
      });
  }

  function _arrayBufferToBase64(arrayBuffer) {
    const byteArray = new Uint8Array(arrayBuffer);
    let byteString = '';
    for (let i = 0; i < byteArray.byteLength; i++) {
      byteString += String.fromCharCode(byteArray[i]);
    }
    const b64 = window.btoa(byteString);

    return b64;
  }

  function addNewLines(str) {
    let finalString = '';
    while (str.length > 0) {
      finalString += str.substring(0, 64) + '\n';
      str = str.substring(64);
    }

    return finalString;
  }

  function toPem(privateKey, keyType) {
    const b64 = addNewLines(_arrayBufferToBase64(privateKey));
    const pem = keyType === 'private' ? `-----BEGIN PRIVATE KEY-----\n${b64}-----END PRIVATE KEY-----` : `-----BEGIN PUBLIC KEY-----\n${b64}-----END PUBLIC KEY-----`;

    return pem;
  }

  const exportKeyPair = async () => {
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

  const downloadPemFile = (content, fileName) => {
    const link = document.createElement('a');
    const file = new Blob([content], { type: 'text/plain' });
    link.href = URL.createObjectURL(file);
    link.download = fileName;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  function importPublicKeyFile(e) {
    importPublicKey(e.target.files[0]);
  }

  function importPrivateKeyFile(e) {
    importPrivateKey(e.target.files[0]);
  }

  function str2ab(pem, isPrivate = false) {
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
  }

  function importPrivateKey(file) {
    try {
      const reader = new FileReader();
      reader.onload = async function () {
        // const privateKey = new TextEncoder().encode(reader.result);
        // convert from a binary string to an ArrayBuffer
        const privateKey = str2ab(reader.result, true);
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
  }

  function importPublicKey(file) {
    try {
      const reader = new FileReader();
      reader.onload = async function () {
        // const publicKey = new TextEncoder().encode(reader.result);
        const publicKey = str2ab(reader.result);
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
        console.log(importedKey);
      };
      reader.readAsText(file);
    } catch (error) {
      console.error('Error importing public key:', error);
    }
  }

  // Click handlers to encrypt or decrypt the given file:

  function encryptTheFile() {
    // Click handler. Reads the selected file, then encrypts it to
    // the random key pair's public key. Creates a Blob with the result,
    // and places a link to that Blob in the download-results section.

    var sourceFile = document.getElementById('source-file').files[0];

    var reader = new FileReader();
    reader.onload = processTheFile;
    reader.readAsArrayBuffer(sourceFile);

    // Asynchronous handler:
    function processTheFile() {
      // Load handler for file reader. Needs to reference keyPair from
      // enclosing scope.

      var reader = this; // Was invoked by the reader object
      var plaintext = reader.result;

      encrypt(plaintext, keyPair.publicKey)
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          document.getElementById('download-links').insertAdjacentHTML('beforeEnd', '<li><a download="encrypted.mp3" href="' + url + '">Encrypted file</a></li>');
          // const link = document.createElement('a');
          // link.href = url;
          // link.download = 'encrypted.mp3';
          // link.textContent = 'Encrypted file';
          // // link.click();
          // // URL.revokeObjectURL(link.href);
          // const li = document.createElement('li');
          // li.appendChild(link);
          // document.getElementById('download-links').appendChild(li);
        })
        .catch(function (err) {
          console.log(err);
          alert('Something went wrong encrypting: ' + err.message + '\n' + err.stack);
        });

      function encrypt(plaintext, publicKey) {
        // Returns a Promise that yields a Blob to its
        // then handler. The Blob points to an encrypted
        // representation of the file. The structure of the
        // Blob's content's structure:
        //    16 bit integer length of encrypted session key
        //    encrypted session key
        //    128 bit (16 byte) iv (initialization vector)
        //    AES-CBC encryption of plaintext using session key and iv

        var sessionKey, encryptedFile; // Used in two steps, so saved here for passing

        return window.crypto.subtle
          .generateKey({ name: 'AES-CBC', length: 128 }, true, ['encrypt', 'decrypt'])
          .then(saveSessionKey) // Will be needed later for exportSessionKey
          .then(encryptPlaintext)
          .then(saveEncryptedFile) // Will be needed later for packageResults
          .then(exportSessionKey)
          .then(encryptSessionKey)
          .then(packageResults);

        // The handlers for each then clause:

        function saveSessionKey(key) {
          // Returns the same key that it is provided as its input.
          // Side effect: updates sessionKey in the enclosing scope.
          sessionKey = key;
          return sessionKey;
        }

        function encryptPlaintext(sessionKey) {
          // Returns a Promise that yields an array [iv, ciphertext]
          // that is the result of AES-CBC encrypting the plaintext
          // from the enclosing scope with the sessionKey provided
          // as input.
          //
          // Both the iv (initialization vector) and ciphertext are
          // of type Uint8Array.
          const iv = window.crypto.getRandomValues(new Uint8Array(16));

          return window.crypto.subtle.encrypt({ name: 'AES-CBC', iv: iv }, sessionKey, plaintext).then(function (ciphertext) {
            return [iv, new Uint8Array(ciphertext)];
          });
        }

        function saveEncryptedFile(ivAndCiphertext) {
          // Returns nothing. Side effect: updates encryptedFile in the enclosing scope.
          encryptedFile = ivAndCiphertext;
        }

        function exportSessionKey() {
          // Returns a Promise that yields an ArrayBuffer export of
          // the sessionKey found in the enclosing scope.
          return window.crypto.subtle.exportKey('raw', sessionKey);
        }

        function encryptSessionKey(exportedKey) {
          // Returns a Promise that yields an ArrayBuffer containing
          // the encryption of the exportedKey provided as a parameter,
          // using the publicKey found in an enclosing scope.
          return window.crypto.subtle.encrypt({ name: 'RSA-OAEP' }, publicKey, exportedKey);
        }

        function packageResults(encryptedKey) {
          // Returns a Blob representing the package of
          // the encryptedKey it is provided and the encryptedFile
          // (in an enclosing scope) that was created with the
          // session key.

          var length = new Uint16Array([encryptedKey.byteLength]);
          return new Blob(
            [
              length, // Always a 2 byte unsigned integer
              encryptedKey, // "length" bytes long
              encryptedFile[0], // 16 bytes long initialization vector
              encryptedFile[1] // Remainder is the ciphertext
            ],
            { type: 'application/octet-stream' }
          );
        }
      } // End of encrypt
    } // end of processTheFile
  } // end of encryptTheFile click handler

  function decryptTheFile() {
    // Click handler. Reads the selected file, then decrypts it to
    // the random key pair's private key. Creates a Blob with the result,
    // and places a link to that Blob in the download-results section.

    var sourceFile = document.getElementById('source-file').files[0];

    var reader = new FileReader();
    reader.onload = processTheFile;
    reader.readAsArrayBuffer(sourceFile);

    function processTheFile() {
      // Load handler for file reader. Needs to reference keyPair from
      // enclosing scope.
      var reader = this; // Invoked by the reader object
      var data = reader.result;

      console.clear();
      console.dir(data);

      // First, separate out the relevant pieces from the file.
      const keyLength = new Uint16Array(data, 0, 2)[0]; // First 16 bit integer
      const encryptedKey = new Uint8Array(data, 2, keyLength);
      const iv = new Uint8Array(data, 2 + keyLength, 16);
      const ciphertext = new Uint8Array(data, 2 + keyLength + 16);

      decrypt(ciphertext, iv, encryptedKey, keyPair.privateKey)
        .then(function (blob) {
          var url = URL.createObjectURL(blob);
          document.getElementById('download-links').insertAdjacentHTML('beforeEnd', '<li><a download="decrypted.mp3" href="' + url + '">Decrypted file</a></li>');
          // const link = document.createElement('a');
          // link.href = url;
          // link.download = 'decrypted.mp3';
          // link.textContent = 'Decrypted file';
          // // link.click();
          // // URL.revokeObjectURL(link.href);
          // const li = document.createElement('li');
          // li.appendChild(link);
          // document.getElementById('download-links').appendChild(li);
        })
        .catch(function (err) {
          alert('Something went wrong decrypting: ' + err.message + '\n' + err.stack);
        });

      function decrypt(ciphertext, iv, encryptedSessionKey, privateKey) {
        // Returns a Promise the yields a Blob containing the decrypted ciphertext.

        return decryptKey(encryptedSessionKey, privateKey).then(importSessionKey).then(decryptCiphertext);

        function decryptKey(encryptedKey, privateKey) {
          // Returns a Promise that yields a Uint8Array AES key.
          // encryptedKey is a Uint8Array, privateKey is the privateKey
          // property of a Key key pair.
          return window.crypto.subtle.decrypt({ name: 'RSA-OAEP' }, privateKey, encryptedKey);
        }

        function importSessionKey(keyBytes) {
          // Returns a Promise yielding an AES-CBC Key from the
          // Uint8Array of bytes it is given.
          return window.crypto.subtle.importKey('raw', keyBytes, { name: 'AES-CBC', length: 128 }, true, ['encrypt', 'decrypt']);
        }

        function decryptCiphertext(sessionKey) {
          // Returns a Promise yielding a Blob containing the decryption of ciphertext
          // (from an enclosing scope) using the sessionKey and the iv
          // (initialization vector, from an enclosing scope).
          return window.crypto.subtle.decrypt({ name: 'AES-CBC', iv: iv }, sessionKey, ciphertext).then(function (plaintext) {
            return new Blob([new Uint8Array(plaintext)], { type: 'application/octet-stream' });
          });
        }
      } // end of decrypt
    } // end of processTheFile
  } // end of decryptTheFile
});
