/*:
 * @target MV
 * @plugindesc 在屏幕上方显示获得物品/武器/防具/金币的提示（含可选描述） v1.1.1 for MV
 * @author xlanwux
 *
 * @param Y Offset @type number @default 12
 * @param Max Visible @type number @default 3
 * @param Line Height @type number @default 32
 * @param Duration @type number @default 90
 * @param Fade In @type number @default 12
 * @param Fade Out @type number @default 18
 * @param Font Size @type number @default 20
 * @param Use Window Skin @type boolean @on 窗口皮肤 @off 透明 @default true
 * @param Gold Word @type string @default 金币
 * @param Show Description @type boolean @on 显示 @off 不显示 @default true
 * @param Desc Font Size @type number @min 10 @default 18
 * @param Desc Max Lines @type number @min 1 @max 3 @default 2
 * @param Desc Max Width @type number @min 120 @default 560
 * @param Desc Ellipsis @type string @default …
 * @help 获得物品/武器/防具/金币时，在屏幕上方显示提示；可选显示描述（自动换行/省略）。
 */
(function() {
  "use strict";
  var P = PluginManager.parameters('ItemToastMV');
  var Y_OFFSET   = Number(P['Y Offset']   || 12);
  var MAX_VISIBLE= Number(P['Max Visible']|| 3);
  var LINE_H     = Number(P['Line Height']|| 32);
  var DURATION   = Number(P['Duration']   || 90);
  var FADE_IN    = Number(P['Fade In']    || 12);
  var FADE_OUT   = Number(P['Fade Out']   || 18);
  var FONT_SIZE  = Number(P['Font Size']  || 20);
  var USE_WINDOW = (P['Use Window Skin'] === 'true');
  var GOLD_WORD  = String(P['Gold Word'] || '金币');

  var SHOW_DESC  = (P['Show Description'] === 'true');
  var DESC_FS    = Number(P['Desc Font Size'] || 18);
  var DESC_MAX_LINES = Number(P['Desc Max Lines'] || 2);
  var DESC_MAX_W = Number(P['Desc Max Width'] || 560);
  var DESC_ELLIP = String(P['Desc Ellipsis'] || '…');

  function wrapTextByWidth(win, text, maxWidth, maxLines, fs) {
    if (!text) return [];
    var t = (text + '').replace(/\r/g, '').replace(/\n/g, ' ');
    var chars = t.split('');
    var saved = win.contents.fontSize;
    win.contents.fontSize = fs;
    var line = '', lines = [];
    for (var i = 0; i < chars.length; i++) {
      var test = line + chars[i];
      if (win.textWidth(test) > maxWidth) {
        if (line.length === 0) lines.push(chars[i]);
        else { lines.push(line); line = chars[i]; }
      } else line = test;
      if (lines.length === maxLines) {
        while (win.textWidth(line + DESC_ELLIP) > maxWidth && line.length > 0) {
          line = line.slice(0, -1);
        }
        lines[maxLines - 1] = line + (line ? DESC_ELLIP : '');
        win.contents.fontSize = saved; return lines;
      }
    }
    if (line) lines.push(line);
    win.contents.fontSize = saved;
    return lines.slice(0, maxLines);
  }

  function systemColorOf(win) {
    // MV 没有 ColorManager，MZ 才有；做兼容
    if (typeof ColorManager !== 'undefined' && ColorManager.systemColor) {
      return ColorManager.systemColor();
    }
    return win.systemColor();
  }

  class ToastWindow extends Window_Base {
    initialize(y, headText, iconIndex, descText) {
      var width = Graphics.width;
      var baseH = LINE_H + 8;
      super.initialize(0, y, width, baseH);
      this.opacity = USE_WINDOW ? 192 : 0;
      this.backOpacity = USE_WINDOW ? 160 : 0;

      this._headText = headText;
      this._icon = iconIndex || 0;
      this._descText = SHOW_DESC ? (descText || '') : '';
      this._descLines = [];

      this.contents.fontSize = FONT_SIZE;
      this._timer = 0;
      this._phase = 'in';
      this._targetY = y;

      this._recomputeHeight();
      this.refresh();
    }
    _recomputeHeight() {
      var padX = this.padding + 12;
      var iconW = this._icon > 0 ? Window_Base._iconWidth + 6 : 0;
      var maxW = Math.min(this.contentsWidth() - 24 - iconW, DESC_MAX_W);
      this._descLines = this._descText ? wrapTextByWidth(this, this._descText, maxW, DESC_MAX_LINES, DESC_FS) : [];
      var descH = this._descLines.length > 0 ? (this.lineHeightDesc() * this._descLines.length + 4) : 0;
      var totalH = LINE_H + 8 + descH;
      var newH = Math.max(totalH, LINE_H + 8);
      if (this.height !== newH) { this.height = newH; this.createContents(); }
    }
    lineHeightDesc() { return Math.round(DESC_FS + 4); }
    refresh() {
      this.contents.clear();
      var padX = 12;
      var x = padX;

      this.contents.fontSize = FONT_SIZE;
      if (this._icon > 0) {
        var iy = Math.floor((LINE_H - Window_Base._iconHeight) / 2);
        this.drawIcon(this._icon, x, iy);
        x += Window_Base._iconWidth + 6;
      }
      this.changeTextColor(systemColorOf(this));
      this.drawText(this._headText, x, 0, this.contentsWidth() - x - 12, 'left');
      this.changeTextColor(this.normalColor());

      if (this._descLines.length > 0) {
        this.contents.fontSize = DESC_FS;
        var startY = LINE_H;
        var textX = (this._icon > 0 ? (padX + Window_Base._iconWidth + 6) : padX);
        var maxW = Math.min(this.contentsWidth() - textX - 12, DESC_MAX_W);
        for (var i = 0; i < this._descLines.length; i++) {
          this.drawText(this._descLines[i], textX, startY + i * this.lineHeightDesc(), maxW, 'left');
        }
      }
    }
    update() {
      Window_Base.prototype.update.call(this);
      this._timer++;
      if (this._phase === 'in') {
        this.opacity = Math.min(this.opacity + Math.ceil(255 / FADE_IN), USE_WINDOW ? 192 : 255);
        this.contentsOpacity = Math.min(this.contentsOpacity + Math.ceil(255 / FADE_IN), 255);
        if (this._timer >= FADE_IN) { this._phase = 'hold'; this._timer = 0; }
      } else if (this._phase === 'hold') {
        if (this._timer >= DURATION) { this._phase = 'out'; this._timer = 0; }
      } else if (this._phase === 'out') {
        this.opacity = Math.max(this.opacity - Math.ceil(255 / FADE_OUT), 0);
        this.contentsOpacity = Math.max(this.contentsOpacity - Math.ceil(255 / FADE_OUT), 0);
        if (this._timer >= FADE_OUT) { if (this.parent) this.parent.removeChild(this); this._dead = true; }
      }
      var dy = this._targetY - this.y;
      if (Math.abs(dy) > 1) this.y += dy * 0.2; else this.y = this._targetY;
    }
    setTargetY(y) { this._targetY = y; }
    isDead() { return !!this._dead; }
  }

  var ToastManager = {
    _queue: [],
    _windows: [],
    ensureOnScene: function(scene){ if (!scene || !scene.addWindow) return; this._scene = scene; },
    push: function(headText, iconIndex, descText){ this._queue.push({headText: headText, iconIndex: iconIndex, descText: descText}); },
    update: function(){
      if (!this._scene) return;
      this._windows = this._windows.filter(function(w){ return !w.isDead(); });
      while (this._windows.length < MAX_VISIBLE && this._queue.length > 0) {
        var idx = this._windows.length;
        var y = Y_OFFSET + idx * (LINE_H + 6);
        var entry = this._queue.shift();
        var win = new ToastWindow(y, entry.headText, entry.iconIndex, entry.descText);
        this._scene.addWindow(win);
        this._windows.push(win);
      }
      for (var i = 0; i < this._windows.length; i++) {
        var y2 = Y_OFFSET + i * (LINE_H + 6);
        this._windows[i].setTargetY(y2);
      }
      for (var j = 0; j < this._windows.length; j++) this._windows[j].update();
    }
  };

  var _Scene_Map_update = Scene_Map.prototype.update;
  Scene_Map.prototype.update = function() {
    _Scene_Map_update.call(this);
    ToastManager.ensureOnScene(this);
    ToastManager.update();
  };
  var _Scene_Battle_update = Scene_Battle.prototype.update;
  Scene_Battle.prototype.update = function() {
    _Scene_Battle_update.call(this);
    ToastManager.ensureOnScene(this);
    ToastManager.update();
  };

  function displayNameFor(item){ return item ? (item.name || '') : ''; }
  function iconFor(item){ return item ? (item.iconIndex || 0) : 0; }
  function descFor(item){ return item ? (item.description || '') : ''; }

  var _Game_Party_gainItem = Game_Party.prototype.gainItem;
  Game_Party.prototype.gainItem = function(item, amount, includeEquip) {
    _Game_Party_gainItem.call(this, item, amount, includeEquip);
    if (item && amount > 0) {
      var head = '+' + amount + ' ' + displayNameFor(item);
      ToastManager.push(head, iconFor(item), descFor(item));
    }
  };

  var _Game_Party_gainGold = Game_Party.prototype.gainGold;
  Game_Party.prototype.gainGold = function(amount) {
    _Game_Party_gainGold.call(this, amount);
    if (amount > 0) {
      var head = '+' + amount + ' ' + GOLD_WORD;
      ToastManager.push(head, 314, '');
    }
  };
})();
