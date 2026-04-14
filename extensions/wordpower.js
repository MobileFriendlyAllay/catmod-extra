/*
  -Word Power-
  This extension was created by MobileFriendlyAllay (https://scratch.mit.edu/users/mobilefriendlyallay) and imported to CatMod (https://mobilefriendlyallay.github.io/catmod/editor.html)
*/
(function(Scratch) {
  'use strict';

  class WordPowerExtension {
    constructor() {
      this.mainDictionary = [];
      this.customDictionary = [];
      this.loaded = false;
      this._loadDictionary();
    }

    async _loadDictionary() {
      try {
        const response = await fetch('https://raw.githubusercontent.com/first20hours/google-10000-english/refs/heads/master/google-10000-english-no-swears.txt');
        const text = await response.text();
        this.mainDictionary = text.split('\n').map(word => word.trim().toLowerCase()).filter(word => word.length > 0);
        this.loaded = true;
      } catch (e) {
        console.error('Failed to load dictionary:', e);
      }
    }

    getInfo() {
      return {
        id: 'wordPower',
        name: 'Word Power',
        color1: '#4a90e2',
        blocks: [
          {
            opcode: 'getSuggestions',
            blockType: Scratch.BlockType.REPORTER,
            text: 'suggestions for [WORD]',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'exampl' } }
          },
          '---',
          {
            opcode: 'canAutocorrect',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'can autocorrect [WORD]?',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'hellp' } }
          },
          {
            opcode: 'getAutocorrect',
            blockType: Scratch.BlockType.REPORTER,
            text: 'autocorrect [WORD]',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'hellp' } }
          },
          '---',
          {
            opcode: 'getLastWord',
            blockType: Scratch.BlockType.REPORTER,
            text: 'last word of sentence [TEXT]',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello, world!' } }
          },
          {
            opcode: 'removeLastWord',
            blockType: Scratch.BlockType.REPORTER,
            text: 'remove last word from sentence [TEXT]',
            arguments: { TEXT: { type: Scratch.ArgumentType.STRING, defaultValue: 'Hello, world!' } }
          },
          '---',
          {
            opcode: 'addToCustom',
            blockType: Scratch.BlockType.COMMAND,
            text: 'add [WORD] to custom dictionary',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'PenguinMod' } }
          },
          {
            opcode: 'addListToCustom',
            blockType: Scratch.BlockType.COMMAND,
            text: 'add array [ARRAY] to custom dictionary',
            arguments: { ARRAY: { type: Scratch.ArgumentType.STRING, defaultValue: '["apple", "banana"]' } }
          },
          {
            opcode: 'getCustomDict',
            blockType: Scratch.BlockType.REPORTER,
            text: 'custom dictionary array'
          },
          {
            opcode: 'removeFromCustom',
            blockType: Scratch.BlockType.COMMAND,
            text: 'remove [WORD] from custom dictionary',
            arguments: { WORD: { type: Scratch.ArgumentType.STRING, defaultValue: 'apple' } }
          },
          {
            opcode: 'clearCustom',
            blockType: Scratch.BlockType.COMMAND,
            text: 'clear custom dictionary'
          }
        ]
      };
    }

    _applyCase(original, target) {
      if (original === original.toUpperCase()) return target.toUpperCase();
      if (original[0] === original[0].toUpperCase()) {
        return target.charAt(0).toUpperCase() + target.slice(1).toLowerCase();
      }
      return target.toLowerCase();
    }

    _levenshtein(a, b) {
      const matrix = [];
      for (let i = 0; i <= b.length; i++) matrix[i] = [i];
      for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
      for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
          if (b.charAt(i - 1) === a.charAt(j - 1)) {
            matrix[i][j] = matrix[i - 1][j - 1];
          } else {
            matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
          }
        }
      }
      return matrix[b.length][a.length];
    }

    _getFullDict() {
      return [...new Set([...this.mainDictionary, ...this.customDictionary])];
    }

    // New Sentence Helpers
    getLastWord(args) {
      const text = String(args.TEXT).trim();
      if (!text) return "";
      const words = text.split(/\s+/);
      // Remove trailing punctuation from the word for dictionary lookup
      return words[words.length - 1].replace(/[.,!?;:]+$/, "");
    }

    removeLastWord(args) {
      const text = String(args.TEXT).trim();
      if (!text) return "";
      const words = text.split(/\s+/);
      if (words.length <= 1) return "";
      words.pop();
      return words.join(" ");
    }

    getSuggestions(args) {
      const input = String(args.WORD).toLowerCase();
      if (!input) return "[]";
      const matches = this._getFullDict().filter(w => w.startsWith(input));
      return JSON.stringify(matches.slice(0, 50).map(m => this._applyCase(String(args.WORD), m)));
    }

    canAutocorrect(args) {
      const input = String(args.WORD).toLowerCase();
      const fullDict = this._getFullDict();
      if (fullDict.includes(input)) return false;
      return this._findBestMatch(input) !== null;
    }

    getAutocorrect(args) {
      const input = String(args.WORD).toLowerCase();
      const fullDict = this._getFullDict();
      if (fullDict.includes(input)) return args.WORD;
      const bestMatch = this._findBestMatch(input);
      return bestMatch ? this._applyCase(String(args.WORD), bestMatch) : args.WORD;
    }

    _findBestMatch(input) {
      if (input.length < 2) return null;
      const fullDict = this._getFullDict();
      let bestWord = null;
      let minDistance = 3; 

      for (const word of fullDict) {
        if (Math.abs(word.length - input.length) > 2) continue;
        const distance = this._levenshtein(input, word);
        if (distance < minDistance) {
          minDistance = distance;
          bestWord = word;
        }
        if (minDistance === 1) break; 
      }
      return bestWord;
    }

    addToCustom(args) {
      const word = String(args.WORD).toLowerCase().trim();
      if (word && !this.customDictionary.includes(word)) this.customDictionary.push(word);
    }

    addListToCustom(args) {
      try {
        const list = JSON.parse(args.ARRAY);
        if (Array.isArray(list)) list.forEach(item => this.addToCustom({ WORD: item }));
      } catch (e) {}
    }

    getCustomDict() { return JSON.stringify(this.customDictionary); }

    removeFromCustom(args) {
      const word = String(args.WORD).toLowerCase().trim();
      this.customDictionary = this.customDictionary.filter(w => w !== word);
    }

    clearCustom() {
      if (confirm("Are you sure you want to clear your custom dictionary?")) this.customDictionary = [];
    }
  }

  Scratch.extensions.register(new WordPowerExtension());
})(Scratch);
