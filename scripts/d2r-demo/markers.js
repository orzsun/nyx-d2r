'use strict';

import { background } from 'gui';
import { UnitTypes } from 'nyx:d2r';

// 颜色格式: 0xAABBGGRR
const COLOR_PLAYER   = 0xFF00FF00; // 绿色
const COLOR_ME       = 0xFF00FFFF; // 黄色 (本地玩家)
const COLOR_MONSTER  = 0xFF0000FF; // 红色 (普通怪物)
const COLOR_ELITE    = 0xFF00A5FF; // 橙色 (精英怪)
const COLOR_BOSS     = 0xFF0000FF; // 纯红 (Boss/暗金)
const COLOR_MISSILE  = 0xFFFFFFFF; // 白色

const RADIUS_PLAYER  = 4;
const RADIUS_MONSTER = 3;
const RADIUS_BOSS    = 6;          // Boss 标记稍大
const RADIUS_MISSILE = 2;

const MARKER_TYPES = new Set([UnitTypes.Player, UnitTypes.Monster, UnitTypes.Missile]);

class Markers {
  constructor(objMgr) {
    this._objMgr = objMgr;
    this._keys = new Set();

    this._onUnitAdded   = (unit, type) => this._handleUnitAdded(unit, type);
    this._onUnitRemoved = (unit, type) => this._handleUnitRemoved(unit, type);

    objMgr.on('unitAdded',   this._onUnitAdded);
    objMgr.on('unitRemoved', this._onUnitRemoved);
  }

  _key(type, id) {
    return `marker-${type}-${id}`;
  }

  _handleUnitAdded(unit, type) {
    if (!MARKER_TYPES.has(type)) return;

    const key = this._key(type, unit.id);
    const textKey = `${key}-name`; // 用于显示名字的 Key
    this._keys.add(key);

    unit.on('update', () => {
      // 如果坐标无效或怪物已死亡，移除标记和文字
      if (unit.automapX < 0 || (type === UnitTypes.Monster && !unit.isAlive)) {
        background.remove(key);
        background.remove(textKey);
        return;
      }

      if (type === UnitTypes.Player) {
        const color = (unit === this._objMgr.me) ? COLOR_ME : COLOR_PLAYER;
        background.addCircleFilled(key, [unit.automapX, unit.automapY], RADIUS_PLAYER, color);
      } else if (type === UnitTypes.Monster) {
        let color = COLOR_MONSTER;
        let radius = RADIUS_MONSTER;
        let nameToDisplay = null;

        const mData = unit.monsterData; // 获取怪物内存数据
        if (mData) {
          // 判断是否为 Boss 或暗金怪 (根据 typeFlag 位掩码)
          if (mData.typeFlag & 0x02 || mData.typeFlag & 0x04) {
            color = COLOR_BOSS;
            radius = RADIUS_BOSS;
            nameToDisplay = "BOSS"; // 基础标记，可进一步解析 txtRecord 获取真名
          } 
          // 判断是否为拥有随机词缀的精英怪
          else if (mData.monUMod && mData.monUMod.some(mod => mod !== 0)) {
            color = COLOR_ELITE;
            radius = RADIUS_PLAYER; // 精英怪稍微大一点
          }
        }

        // 绘制怪物圆点
        background.addCircleFilled(key, [unit.automapX, unit.automapY], radius, color);
        
        // 如果是 Boss，则在坐标旁绘制名字
        if (nameToDisplay) {
          background.addText(textKey, [unit.automapX + 10, unit.automapY - 10], color, nameToDisplay);
        }
      } else {
        background.addCircleFilled(key, [unit.automapX, unit.automapY], RADIUS_MISSILE, COLOR_MISSILE);
      }
    });
  }

  _handleUnitRemoved(unit, type) {
    if (!MARKER_TYPES.has(type)) return;
    const key = this._key(type, unit.id);
    this._keys.delete(key);
    background.remove(key);
    background.remove(`${key}-name`); // 移除对应的名字文本
  }

  destroy() {
    this._objMgr.off('unitAdded',   this._onUnitAdded);
    this._objMgr.off('unitRemoved', this._onUnitRemoved);
    for (const key of this._keys) {
      background.remove(key);
      background.remove(`${key}-name`);
    }
    this._keys.clear();
  }
}

export { Markers };
