(function(Scratch) {
  'use strict';

  class AdvancedClipboard {
    constructor() {
      this.lastItemType = 'none';
      this.lastData = '';
      this.lastStatus = false;
    }

    getInfo() {
      return {
        id: 'advancedClipboard',
        name: 'Advanced Clipboard',
        color1: '#4a90e2',
        blocks: [
          {
            opcode: 'updateClipboard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'update clipboard data'
          },
          {
            opcode: 'writeToClipboard',
            blockType: Scratch.BlockType.COMMAND,
            text: 'copy [DATA] to clipboard as [TYPE]',
            arguments: {
              DATA: {
                type: Scratch.ArgumentType.STRING,
                defaultValue: 'Hello Penguin!'
              },
              TYPE: {
                type: Scratch.ArgumentType.STRING,
                menu: 'typeMenu'
              }
            }
          },
          '---',
          {
            opcode: 'getClipboardData',
            blockType: Scratch.BlockType.REPORTER,
            text: 'clipboard data'
          },
          {
            opcode: 'isText',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is clipboard text?'
          },
          {
            opcode: 'isImage',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is clipboard image?'
          },
          {
            opcode: 'isEmpty',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'is clipboard empty?'
          },
          {
            opcode: 'lastOpSuccess',
            blockType: Scratch.BlockType.BOOLEAN,
            text: 'last operation successful?'
          }
        ],
        menus: {
          typeMenu: {
            acceptReporters: true,
            items: ['text', 'image']
          }
        }
      };
    }

    async updateClipboard() {
      try {
        const items = await navigator.clipboard.read();
        this.lastItemType = 'none';
        this.lastData = '';

        for (const item of items) {
          if (item.types.some(t => t.startsWith('image/'))) {
            const type = item.types.find(t => t.startsWith('image/'));
            const blob = await item.getType(type);
            this.lastData = await this._blobToDataURI(blob);
            this.lastItemType = 'image';
            this.lastStatus = true;
            return; 
          } else if (item.types.includes('text/plain')) {
            const blob = await item.getType('text/plain');
            this.lastData = await blob.text();
            this.lastItemType = 'text';
            this.lastStatus = true;
            return;
          }
        }
        this.lastStatus = false;
      } catch (err) {
        console.error('Failed to read clipboard:', err);
        this.lastStatus = false;
      }
    }

    async writeToClipboard(args) {
      const data = args.DATA;
      const type = args.TYPE;

      try {
        if (type === 'text') {
          await navigator.clipboard.writeText(data);
          this.lastStatus = true;
        } else if (type === 'image') {
          const response = await fetch(data);
          const blob = await response.blob();
          
          // Ensure we are sending a valid ClipboardItem
          const item = new ClipboardItem({ [blob.type]: blob });
          await navigator.clipboard.write([item]);
          this.lastStatus = true;
        }
      } catch (err) {
        console.error('Could not copy to clipboard:', err);
        this.lastStatus = false;
      }
    }

    _blobToDataURI(blob) {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.readAsDataURL(blob);
      });
    }

    getClipboardData() { return this.lastData; }
    isText() { return this.lastItemType === 'text'; }
    isImage() { return this.lastItemType === 'image'; }
    isEmpty() { return this.lastItemType === 'none' || this.lastData === ''; }
    lastOpSuccess() { return this.lastStatus; }
  }

  Scratch.extensions.register(new AdvancedClipboard());
})(Scratch);
