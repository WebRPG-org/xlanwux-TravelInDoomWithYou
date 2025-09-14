/*:
 * @plugindesc 给人物添加孤独值、连接度属性
 * @author xlanwux
 */
(function() {

  const _Game_Actor_setup = Game_Actor.prototype.setup;
  Game_Actor.prototype.setup = function(actorId) {
    _Game_Actor_setup.call(this, actorId);
    this._loneliness = 30; // 初始孤独值
    this._bond = 0;       // 初始连接度
  };

  // 孤独值
  Game_Actor.prototype.loneliness = function() {
    return this._loneliness || 0;
  };
  Game_Actor.prototype.setLoneliness = function(value) {
    this._loneliness = Math.max(0, Math.min(100, value));
  };
  Game_Actor.prototype.maxLoneliness = function() {
    return 100;
  };

  // 连接度
  Game_Actor.prototype.bond = function() {
    return this._bond || 0;
  };
  Game_Actor.prototype.setBond = function(value) {
    this._bond = Math.max(0, Math.min(100, value));
  };
  Game_Actor.prototype.maxBond = function() {
    return 100;
  };

})();
