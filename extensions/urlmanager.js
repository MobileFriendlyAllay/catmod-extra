class URLExtension {
  constructor() {
    this.blobMap = new Map();
  }

  getInfo() {
    return {
      id: 'urlManager',
      name: 'URL & Data Manager',
      blocks: [
        {
          opcode: 'encodeURL',
          blockType: 'reporter',
          text: 'encode [TEXT] for URL',
          arguments: {
            TEXT: { type: 'string', defaultValue: 'hello world' }
          }
        },
        '---',
        {
          opcode: 'compressDataURI',
          blockType: 'reporter',
          text: 'compress data URI [URI]',
          arguments: {
            URI: { type: 'string', defaultValue: 'data:image/png;base64...' }
          }
        },
        {
          opcode: 'decompressDataURI',
          blockType: 'reporter',
          text: 'decompress data URI [DATA]',
          arguments: {
            DATA: { type: 'string', defaultValue: 'image/png;base64...A 1G A' }
          }
        },
        '---',
        {
          opcode: 'createBlobFromText',
          blockType: 'command',
          text: 'create [MIME] blob [NAME] from text [DATA]',
          arguments: {
            MIME: {
              type: 'string',
              menu: 'TEXT_TYPES',
              defaultValue: 'text/html'
            },
            NAME: { type: 'string', defaultValue: 'myPage' },
            DATA: { type: 'string', defaultValue: '<h1>Hello</h1>' }
          }
        },
        {
          opcode: 'createBlobFromFullURI',
          blockType: 'command',
          text: 'create binary blob [NAME] from data uri [URI]',
          arguments: {
            NAME: { type: 'string', defaultValue: 'myImage' },
            URI: { type: 'string', defaultValue: 'data:image/png;base64,iVBOR...' }
          }
        },
        {
          opcode: 'getBlob',
          blockType: 'reporter',
          text: 'get blob url for [NAME]',
          arguments: {
            NAME: { type: 'string', defaultValue: 'myImage' }
          }
        },
        {
          opcode: 'deleteBlob',
          blockType: 'command',
          text: 'delete blob [NAME]',
          arguments: {
            NAME: { type: 'string', defaultValue: 'myImage' }
          }
        }
      ],
      menus: {
        TEXT_TYPES: {
          acceptReporters: true,
          items: [
            { text: 'HTML', value: 'text/html' },
            { text: 'Plain Text', value: 'text/plain' },
            { text: 'CSS', value: 'text/css' },
            { text: 'JavaScript', value: 'text/javascript' },
            { text: 'JSON', value: 'application/json' },
            { text: 'SVG', value: 'image/svg+xml' }
          ]
        }
      }
    };
  }

  /* --- URL & COMPRESSION --- */

  encodeURL(args) {
    return encodeURIComponent(args.TEXT);
  }

  _toBase64(num) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
    let result = "";
    while (num > 0) {
      result = chars[num % 64] + result;
      num = Math.floor(num / 64);
    }
    return result || "0";
  }

  _fromBase64(str) {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz+/";
    let result = 0;
    for (let i = 0; i < str.length; i++) {
      result = result * 64 + chars.indexOf(str[i]);
    }
    return result;
  }

  compressDataURI(args) {
    let str = String(args.URI);
    const comma = str.indexOf(',');
    const prefix = comma !== -1 ? str.substring(0, comma + 1) : "";
    let data = comma !== -1 ? str.substring(comma + 1) : str;

    let compressed = "";
    let i = 0;
    while (i < data.length) {
      let char = data[i];
      let count = 1;
      while (i + count < data.length && data[i + count] === char) count++;
      if (count >= 5) {
        compressed += char + " " + this._toBase64(count) + " ";
      } else {
        compressed += char.repeat(count);
      }
      i += count;
    }
    return prefix + compressed;
  }

  decompressDataURI(args) {
    let str = String(args.DATA);
    const comma = str.indexOf(',');
    const prefix = comma !== -1 ? str.substring(0, comma + 1) : "";
    let data = comma !== -1 ? str.substring(comma + 1) : str;

    let result = "";
    let i = 0;
    while (i < data.length) {
      if (data[i+1] === " ") {
        let char = data[i];
        let nextSpace = data.indexOf(" ", i + 2);
        if (nextSpace !== -1) {
          let b64 = data.substring(i + 2, nextSpace);
          let count = this._fromBase64(b64);
          result += char.repeat(count);
          i = nextSpace + 1;
          continue;
        }
      }
      result += data[i];
      i++;
    }
    return prefix + result;
  }

  /* --- BLOB MANAGEMENT --- */

  createBlobFromText(args) {
    const name = String(args.NAME);
    let content = String(args.DATA);
    const mime = String(args.MIME);

    if (this.blobMap.has(name)) URL.revokeObjectURL(this.blobMap.get(name));

    // AUTO-ENCODE LOGIC: 
    // If it's already encoded (contains % but no raw tags), we decode it.
    // If it's raw HTML (contains < >), we use it as is because the Blob constructor
    // handles raw text better than Data URIs do anyway!
    try {
        if (content.includes('%') && !content.includes('<')) {
            content = decodeURIComponent(content);
        }
    } catch (e) {
        // Fallback to raw if decoding fails
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    this.blobMap.set(name, url);
  }

  createBlobFromFullURI(args) {
    const name = String(args.NAME);
    const uri = String(args.URI);
    if (this.blobMap.has(name)) URL.revokeObjectURL(this.blobMap.get(name));

    try {
      const parts = uri.split(',');
      if (parts.length < 2) return;

      const metadata = parts[0];
      const content = parts[1];
      const mimeMatch = metadata.match(/:(.*?)(;|$)/);
      const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';

      const binary = atob(content);
      const array = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        array[i] = binary.charCodeAt(i);
      }
      const blob = new Blob([array], { type: mime });
      this.blobMap.set(name, URL.createObjectURL(blob));
    } catch (e) {
      console.error("URI Blob failed:", e);
    }
  }

  getBlob(args) {
    return this.blobMap.get(String(args.NAME)) || "";
  }

  deleteBlob(args) {
    const name = String(args.NAME);
    if (this.blobMap.has(name)) {
      URL.revokeObjectURL(this.blobMap.get(name));
      this.blobMap.delete(name);
    }
  }
}

Scratch.extensions.register(new URLExtension());
