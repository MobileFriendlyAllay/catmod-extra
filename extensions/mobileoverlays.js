/*
  -Mobile Overlays-
  This extension was created by MobileFriendlyAllay (https://scratch.mit.edu/users/mobilefriendlyallay) and imported to CatMod (https://mobilefriendlyallay.github.io/catmod/editor.html)
*/
(function(Scratch) {
  'use strict';

  class UltimateMobileOverlaysV28 {
    constructor() {
      this.container = null;
      this.shiftState = 0; // 0: off, 1: shift, 2: caps
      this.layoutMode = 0; // 0: ABC, 1: 123, 2: #+=
      this.lastShiftTap = 0;
      this.backspaceInterval = null;
      this.joysticks = {
        left: { active: false, angle: 0, distance: 0 },
        right: { active: false, angle: 0, distance: 0 }
      };
      this._createStyles();
    }

    getInfo() {
      return {
        id: 'mobileOverlaysV28',
        name: 'Mobile Overlays',
        color1: '#444444',
        blocks: [
          { opcode: 'showKeyboard', blockType: Scratch.BlockType.COMMAND, text: 'show custom keyboard' },
          { opcode: 'hideKeyboard', blockType: Scratch.BlockType.COMMAND, text: 'hide keyboard' },
          '---',
          {
            opcode: 'showNumpad',
            blockType: Scratch.BlockType.COMMAND,
            text: 'show numpad type [TYPE]',
            arguments: { TYPE: { type: Scratch.BlockType.STRING, menu: 'numpadMenu', defaultValue: 'standard' } }
          },
          { opcode: 'hideNumpad', blockType: Scratch.BlockType.COMMAND, text: 'hide numpad' },
          '---',
          { opcode: 'showGamepad', blockType: Scratch.BlockType.COMMAND, text: 'show [LAYOUT]', arguments: { LAYOUT: { type: Scratch.BlockType.STRING, menu: 'gamepadMenu', defaultValue: 'left & right joysticks & space' } } },
          { opcode: 'hideGamepad', blockType: Scratch.BlockType.COMMAND, text: 'hide gamepad' },
          '---',
          { opcode: 'isShiftActive', blockType: Scratch.BlockType.BOOLEAN, text: 'is mobile shift active?' },
          { opcode: 'isJoystickActive', blockType: Scratch.BlockType.BOOLEAN, text: 'is [SIDE] joystick pressed?', arguments: { SIDE: { type: Scratch.BlockType.STRING, menu: 'sideMenu' } } },
          { opcode: 'getJoystickAngle', blockType: Scratch.BlockType.REPORTER, text: '[SIDE] joystick direction', arguments: { SIDE: { type: Scratch.BlockType.STRING, menu: 'sideMenu' } } },
          { opcode: 'getJoystickDist', blockType: Scratch.BlockType.REPORTER, text: '[SIDE] joystick distance', arguments: { SIDE: { type: Scratch.BlockType.STRING, menu: 'sideMenu' } } }
        ],
        menus: {
          numpadMenu: { items: ['standard', 'supports decimal', 'supports negative', 'negative & decimal'] },
          gamepadMenu: { items: ['left joystick', 'right joystick', 'left & right joysticks', 'left & space', 'right & space', 'left & right joysticks & space'] },
          sideMenu: { items: ['left', 'right'] }
        }
      };
    }

    _createStyles() {
      const existing = document.getElementById('mobile-overlay-style');
      if (existing) existing.remove();
      const style = document.createElement('style');
      style.id = 'mobile-overlay-style';
      style.textContent = `
        .pm-overlay-container {
          position: absolute; bottom: 0; left: 0; width: 100%; height: 45%;
          background: rgba(12, 12, 12, 0.98); backdrop-filter: blur(15px);
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          z-index: 10000; font-family: sans-serif; box-sizing: border-box; padding: 5px; border-top: 2px solid #444;
        }
        .pm-kbd-row { display: flex; justify-content: center; width: 100%; margin: 2px 0; }
        .pm-kbd-key {
          background: #2a2a2a; color: #fff; border: 1px solid #444; border-radius: 8px;
          margin: 2px; height: 52px; min-width: 35px; flex-grow: 1; flex-basis: 0;
          display: flex; align-items: center; justify-content: center;
          font-weight: 600; font-size: 19px; cursor: pointer; user-select: none;
          box-shadow: 0 3px 0 #000; transition: background 0.1s;
        }
        .pm-kbd-key:active { transform: translateY(2px); box-shadow: none; background: #3d3d3d; }
        .pm-kbd-key.shift-1 { background: #007aff; border-color: #0a84ff; }
        .pm-kbd-key.shift-2 { background: #5856d6; border-color: #5e5ce6; text-decoration: underline; }
        .pm-kbd-key.special { background: #444; font-size: 15px; }
        .pm-gamepad-container { position: absolute; bottom: 0; left: 0; width: 100%; height: 280px; z-index: 10000; pointer-events: none; }
        .pm-joystick-wrapper { position: absolute; bottom: 40px; pointer-events: auto; }
        .pm-joystick-left { left: 40px; }
        .pm-joystick-right { right: 40px; }
        .pm-space-wrapper { position: absolute; bottom: 40px; left: 50%; transform: translateX(-50%); pointer-events: auto; }
        .pm-joystick-base { width: 170px; height: 170px; background: rgba(255,255,255,0.05); border: 2px solid #555; border-radius: 50%; position: relative; }
        .pm-joystick-handle { width: 75px; height: 75px; background: #f2f2f7; border-radius: 50%; position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); pointer-events: none; box-shadow: 0 4px 10px rgba(0,0,0,0.5); }
        .pm-space-btn { background: #1c1c1e; color: #fff; border: 2px solid #3a3a3c; border-radius: 14px; width: 190px; height: 80px; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 22px; box-shadow: 0 4px 0 #000; }
        .pm-close-btn { position: absolute; top: -45px; right: 12px; background: #ff3b30; color: white; border-radius: 6px; padding: 6px 18px; font-weight: bold; cursor: pointer; pointer-events: auto; font-size: 14px; }
      `;
      document.head.appendChild(style);
    }

    _triggerKey(char, down = true) {
      const isShifted = this.shiftState > 0;
      const event = new KeyboardEvent(down ? 'keydown' : 'keyup', {
        key: char,
        shiftKey: isShifted,
        bubbles: true,
        cancelable: true
      });
      document.dispatchEvent(event);
      window.dispatchEvent(event);
    }

    _startBackspace() {
      this._triggerKey('Backspace', true);
      setTimeout(() => this._triggerKey('Backspace', false), 50);
      this.backspaceInterval = setTimeout(() => {
        this.backspaceInterval = setInterval(() => {
          this._triggerKey('Backspace', true);
          setTimeout(() => this._triggerKey('Backspace', false), 50);
        }, 70);
      }, 500);
    }

    _stopBackspace() {
      clearInterval(this.backspaceInterval);
      clearTimeout(this.backspaceInterval);
      this.backspaceInterval = null;
    }

    renderKeyboard() {
      if (!this.container) return;
      this.container.innerHTML = '';
      const close = document.createElement('div');
      close.className = 'pm-close-btn'; close.innerText = 'DONE'; close.onclick = () => this.hideKeyboard();
      this.container.appendChild(close);

      let rows = [];
      if (this.layoutMode === 0) {
        rows = [["q","w","e","r","t","y","u","i","o","p"], ["a","s","d","f","g","h","j","k","l"], ["z","x","c","v","b","n","m"]];
      } else if (this.layoutMode === 1) {
        rows = [["1","2","3","4","5","6","7","8","9","0"], ["-","/",":",";","(",")","$","&","@","\""], [".",",","?","!", "'"]];
      } else {
        rows = [["[","]","{","}","#","%","^","*","+","="], ["_","\\","|","~","<",">","€","£","¥","•"], [".",",","?","!", "'"]];
      }

      rows.forEach((row, i) => {
        const rDiv = document.createElement('div');
        rDiv.className = 'pm-kbd-row';
        row.forEach(key => {
          const char = (this.layoutMode === 0 && this.shiftState > 0) ? key.toUpperCase() : key;
          const k = document.createElement('div');
          k.className = 'pm-kbd-key';
          k.innerText = char;
          k.onpointerdown = (e) => {
            e.preventDefault();
            this._triggerKey(char, true);
            setTimeout(() => this._triggerKey(char, false), 50);
            if (this.layoutMode === 0 && this.shiftState === 1) {
              setTimeout(() => { if (this.shiftState === 1) { this.shiftState = 0; this.renderKeyboard(); } }, 150);
            }
          };
          rDiv.appendChild(k);
        });

        if (i === rows.length - 1) {
          const leftFunc = document.createElement('div');
          leftFunc.className = 'pm-kbd-key special';
          if (this.layoutMode === 0) {
            leftFunc.className = `pm-kbd-key shift-${this.shiftState}`;
            leftFunc.innerText = '⇧';
            leftFunc.onpointerdown = (e) => {
              e.preventDefault();
              const now = Date.now();
              if (now - this.lastShiftTap < 350) { this.shiftState = 2; } else { this.shiftState = (this.shiftState === 0) ? 1 : 0; }
              this.lastShiftTap = now;
              this.renderKeyboard();
            };
          } else {
            leftFunc.innerText = this.layoutMode === 1 ? '#+=' : '123';
            leftFunc.onpointerdown = (e) => {
              e.preventDefault();
              this.layoutMode = this.layoutMode === 1 ? 2 : 1;
              this.renderKeyboard();
            };
          }
          rDiv.prepend(leftFunc);
          
          const bk = document.createElement('div');
          bk.className = 'pm-kbd-key special'; bk.innerText = '⌫';
          bk.onpointerdown = (e) => { e.preventDefault(); this._startBackspace(); };
          bk.onpointerup = () => this._stopBackspace();
          bk.onpointerleave = () => this._stopBackspace();
          rDiv.appendChild(bk);
        }
        this.container.appendChild(rDiv);
      });

      const bottom = document.createElement('div');
      bottom.className = 'pm-kbd-row';
      const tgl = document.createElement('div'); tgl.className = 'pm-kbd-key special'; tgl.innerText = this.layoutMode === 0 ? '123' : 'ABC';
      tgl.onpointerdown = (e) => { e.preventDefault(); this.layoutMode = this.layoutMode === 0 ? 1 : 0; this.renderKeyboard(); };
      const spc = document.createElement('div'); spc.className = 'pm-kbd-key'; spc.style.flexGrow = '5'; spc.innerText = 'SPACE';
      spc.onpointerdown = (e) => { e.preventDefault(); this._triggerKey(' ', true); setTimeout(() => this._triggerKey(' ', false), 50); };
      const ent = document.createElement('div'); ent.className = 'pm-kbd-key special'; ent.innerText = 'ENTER';
      ent.onpointerdown = (e) => { e.preventDefault(); this._triggerKey('Enter', true); setTimeout(() => this._triggerKey('Enter', false), 50); };
      bottom.append(tgl, spc, ent);
      this.container.appendChild(bottom);
    }

    showKeyboard() { this.hideAll(); this.container = document.createElement('div'); this.container.className = 'pm-overlay-container'; document.body.appendChild(this.container); this.renderKeyboard(); }
    isShiftActive() { return this.shiftState > 0; }
    
    showNumpad(args) {
      this.hideAll();
      this.container = document.createElement('div');
      this.container.className = 'pm-overlay-container';
      const close = document.createElement('div'); close.className = 'pm-close-btn'; close.innerText = 'DONE'; close.onclick = () => this.hideNumpad();
      this.container.appendChild(close);
      const layout = [['1','2','3'],['4','5','6'],['7','8','9'],['0']];
      if(args.TYPE.includes('decimal')) layout[3].push('.');
      if(args.TYPE.includes('negative')) layout[3].push('-');
      layout.forEach(row => {
        const rDiv = document.createElement('div'); rDiv.className = 'pm-kbd-row';
        row.forEach(k => {
          const key = document.createElement('div'); key.className = 'pm-kbd-key'; key.innerText = k;
          key.onpointerdown = (e) => { e.preventDefault(); this._triggerKey(k, true); setTimeout(() => this._triggerKey(k, false), 50); };
          rDiv.appendChild(key);
        });
        this.container.appendChild(rDiv);
      });
      const actions = document.createElement('div'); actions.className = 'pm-kbd-row';
      const bsp = document.createElement('div'); bsp.className = 'pm-kbd-key special'; bsp.innerText = '⌫';
      bsp.onpointerdown = (e) => { e.preventDefault(); this._startBackspace(); };
      bsp.onpointerup = () => this._stopBackspace();
      const ent = document.createElement('div'); ent.className = 'pm-kbd-key special'; ent.innerText = 'ENTER';
      ent.onpointerdown = () => { this._triggerKey('Enter'); setTimeout(() => this._triggerKey('Enter', false), 50); };
      actions.append(bsp, ent); this.container.appendChild(actions);
      document.body.appendChild(this.container);
    }

    _createJoystick(side) {
      const wrapper = document.createElement('div'); wrapper.className = `pm-joystick-wrapper pm-joystick-${side}`;
      const base = document.createElement('div'); base.className = 'pm-joystick-base';
      const handle = document.createElement('div'); handle.className = 'pm-joystick-handle';
      base.appendChild(handle); wrapper.appendChild(base);
      const move = (e) => {
        if (e.cancelable) e.preventDefault();
        const rect = base.getBoundingClientRect();
        const touch = e.touches ? e.touches[0] : e;
        let dx = touch.clientX - (rect.left + rect.width/2);
        let dy = touch.clientY - (rect.top + rect.height/2);
        const dist = Math.sqrt(dx*dx + dy*dy);
        const max = rect.width/2;
        if (dist > max) { dx *= max/dist; dy *= max/dist; }
        handle.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
        this.joysticks[side].active = true;
        let ang = Math.atan2(dx, -dy) * (180/Math.PI);
        this.joysticks[side].angle = Math.round(ang < 0 ? ang + 360 : ang);
        this.joysticks[side].distance = Math.min(100, Math.round((dist/max)*100));
      };
      const stop = () => { handle.style.transform='translate(-50%,-50%)'; this.joysticks[side].active=false; this.joysticks[side].distance=0; window.removeEventListener('mousemove', move); window.removeEventListener('mouseup', stop); };
      base.addEventListener('mousedown', (e) => { window.addEventListener('mousemove', move); window.addEventListener('mouseup', stop); move(e); });
      base.addEventListener('touchstart', move, {passive:false}); base.addEventListener('touchmove', move, {passive:false}); base.addEventListener('touchend', stop);
      return wrapper;
    }

    showGamepad(args) {
      this.hideAll(); this.container = document.createElement('div'); this.container.className = 'pm-gamepad-container';
      if (args.LAYOUT.includes('left')) this.container.appendChild(this._createJoystick('left'));
      if (args.LAYOUT.includes('right')) this.container.appendChild(this._createJoystick('right'));
      if (args.LAYOUT.includes('space')) {
        const wrap = document.createElement('div'); wrap.className = 'pm-space-wrapper';
        const btn = document.createElement('div'); btn.className = 'pm-space-btn'; btn.innerText = 'SPACE';
        const press = (e) => { if (e.cancelable) e.preventDefault(); this._triggerKey(' ', true); };
        const release = () => this._triggerKey(' ', false);
        btn.addEventListener('touchstart', press, {passive:false}); btn.addEventListener('touchend', release);
        btn.addEventListener('mousedown', press); window.addEventListener('mouseup', release);
        wrap.appendChild(btn); this.container.appendChild(wrap);
      }
      document.body.appendChild(this.container);
    }
    
    isJoystickActive(args) { return this.joysticks[args.SIDE].active; }
    getJoystickAngle(args) { return this.joysticks[args.SIDE].angle; }
    getJoystickDist(args) { return this.joysticks[args.SIDE].distance; }
    hideAll() { if (this.container) { this.container.remove(); this.container = null; this.joysticks.left.active = false; this.joysticks.right.active = false; this._stopBackspace(); } }
    hideKeyboard() { this.hideAll(); }
    hideNumpad() { this.hideAll(); }
    hideGamepad() { this.hideAll(); }
  }

  Scratch.extensions.register(new UltimateMobileOverlaysV28());
})(Scratch);
