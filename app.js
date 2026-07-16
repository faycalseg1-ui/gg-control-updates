/* ============================================================
   GameZone Manager — app.js
   Main Application Logic
   ============================================================ */

'use strict';

// ───────────────────── Version ─────────────────────
const APP_VERSION = '1.0.1';

// ───────────────────────── State ─────────────────────────
const STATE = {
  selectedDeviceId: null,
  currentFilter: 'all',
  sessionDuration: 60,
  currentOrder: {},
  buffetOrders: [],
  dailyRevenue: 0,
  dailySessions: 0,
  dailyBuffetOrders: 0,
  pricePerHour: 200,  // ريال في الساعة
  selectedPlayersMode: 'double',
  selectedPricingType: 'time',
};

// ───────────────────────── Devices Data ─────────────────────────
let DEVICES = [
  { id: 1,  name: 'PS5 Pro #1',   type: 'PlayStation', icon: '🎮', zone: 'A' },
  { id: 2,  name: 'PS5 Pro #2',   type: 'PlayStation', icon: '🎮', zone: 'A' },
  { id: 3,  name: 'PS5 Pro #3',   type: 'PlayStation', icon: '🎮', zone: 'A' },
  { id: 4,  name: 'PC Gaming #1', type: 'PC',          icon: '🖥️', zone: 'B' },
  { id: 5,  name: 'PC Gaming #2', type: 'PC',          icon: '🖥️', zone: 'B' },
  { id: 6,  name: 'PC Gaming #3', type: 'PC',          icon: '🖥️', zone: 'B' },
  { id: 7,  name: 'VR Station #1',type: 'VR',          icon: '🥽', zone: 'C' },
  { id: 8,  name: 'VR Station #2',type: 'VR',          icon: '🥽', zone: 'C' },
  { id: 9,  name: 'بلياردو #1',   type: 'Billiards',   icon: '🎱', zone: 'D' },
  { id: 10, name: 'بلياردو #2',   type: 'Billiards',   icon: '🎱', zone: 'D' },
  { id: 11, name: 'PS5 Elite #4', type: 'PlayStation', icon: '🎮', zone: 'A' },
  { id: 12, name: 'Switch #1',    type: 'Nintendo',    icon: '🕹️', zone: 'E' },
];

// Mutable session data
const sessions = {};

// Pre-fill some sample sessions
function initSampleSessions() {
  const now = Date.now();
  setSampleSession(2,   120, now - 45 * 60000);
  setSampleSession(4,    60, now - 55 * 60000);
  setSampleSession(5,    90, now - 82 * 60000);
  setSampleSession(7,    60, now - 58 * 60000);
  setSampleSession(9,    90, now - 15 * 60000);
  setSampleSession(11,   30, now - 27 * 60000);
}

function setSampleSession(id, durationMins, startedAt) {
  sessions[id] = { durationMins, startedAt };
};

function getDeviceStatus(id) {
  const sess = sessions[id];
  if (!sess) return 'available';
  if (sess.type === 'open' || sess.durationMins === 0) return 'busy';
  const elapsed = (Date.now() - sess.startedAt) / 60000;
  const remaining = sess.durationMins - elapsed;
  if (remaining <= 0) return 'available';
  if (remaining <= 10) return 'ending';
  return 'busy';
}

function getTimerString(id) {
  const sess = sessions[id];
  if (!sess) return '';
  const elapsed = (Date.now() - sess.startedAt) / 60000;
  if (sess.type === 'open' || sess.durationMins === 0) {
    return formatTime(elapsed);
  } else {
    const remaining = Math.max(0, sess.durationMins - elapsed);
    return formatTime(remaining);
  }
}

function formatTime(mins) {
  const h = Math.floor(mins / 60);
  const m = Math.floor(mins % 60);
  const s = Math.floor((mins * 60) % 60);
  if (h > 0) {
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  }
  return `${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
}

function calculateCost(id) {
  const sess = sessions[id];
  if (!sess) return 0;
  const dev = DEVICES.find(d => d.id == id);
  const elapsed = (Date.now() - sess.startedAt) / 60000;
  const hourlyRate = dev ? getDeviceHourlyRate(dev, sess.playersMode || 'double', sess.pricingType || 'time') : STATE.pricePerHour;
  if (sess.type === 'open' || sess.durationMins === 0) {
    return ((elapsed / 60) * hourlyRate).toFixed(2);
  } else {
    return ((sess.durationMins / 60) * hourlyRate).toFixed(2);
  }
}

function getDeviceHourlyRate(devOrId, mode = 'double', pricingType = 'time') {
  let dev = devOrId;
  if (typeof devOrId === 'number' || typeof devOrId === 'string') {
    dev = DEVICES.find(d => d.id == devOrId);
  }
  if (!dev) return STATE.pricePerHour;
  
  const isMatch = pricingType === 'match';
  
  if (isMatch) {
    if (mode === 'quad') {
      return dev.priceMatchQuad || dev.priceMatchDouble || dev.price4Players || 100;
    } else {
      return dev.priceMatchDouble || dev.customPrice || 70;
    }
  } else {
    // Time-based
    if (mode === 'quad') {
      const price = dev.priceTimeQuad || dev.price4Players || (dev.customPrice ? dev.customPrice * 1.5 : undefined) || STATE.pricePerHour * 1.5;
      const duration = dev.defaultDuration || 60;
      return (60 / duration) * price;
    } else {
      const price = dev.priceTimeDouble || dev.customPrice || STATE.pricePerHour;
      const duration = dev.defaultDuration || 60;
      return (60 / duration) * price;
    }
  }
}

function roundToNearest5(val) {
  if (ADMIN_SETTINGS.enableRounding) {
    return Math.round(val / 5) * 5;
  }
  return val;
}

// ───────────────────────── Menu Items ─────────────────────────
let MENU_ITEMS = [
  { id: 'm1',  name: 'بيتزا',     price: 15, image: 'assets/pizza.jpg', cat: 'snacks'  },
  { id: 'm2',  name: 'بطاطس',     price: 10, image: 'assets/fries.jpg', cat: 'snacks'  },
  { id: 'm3',  name: 'كولا',          price: 5,  image: 'assets/cola.jpg', cat: 'drinks'  },
  { id: 'm4',  name: 'ريدبول',        price: 12, image: 'assets/redbull.jpg', cat: 'drinks'  },
];



let EXPENSES = [];
let SUPPLIERS = [];
let ACTIVITY_LOG = [];
let TRANSACTIONS = [];
let FIXED_COSTS = [];
let MAINTENANCE_LOG = [];
let ADMIN_SETTINGS = {
  pin: '0000', // Default PIN
  isPinEnabled: true,
  enableRounding: true
};

function logActivity(action, details) {
  ACTIVITY_LOG.unshift({
    id: Date.now(),
    date: new Date().toISOString(),
    action,
    details
  });
  if (ACTIVITY_LOG.length > 500) ACTIVITY_LOG.pop(); // Keep last 500
  saveData();
}

const fsNode = require('fs');
const pathNode = require('path');
const osNode = require('os');
const cryptoNode = require('crypto');

const dataFile = pathNode.join(__dirname, 'data.json');
const licenseFile = pathNode.join(__dirname, 'license.json');

// ════════════════════════════════════════════════════════════════
//  OFFLINE LICENSE ACTIVATION SYSTEM
// ════════════════════════════════════════════════════════════════

function getDeviceFingerprint() {
  try {
    const platform = osNode.platform();
    const arch     = osNode.arch();
    const cpus     = osNode.cpus();
    const cpuModel = cpus.length > 0 ? cpus[0].model : 'UNKNOWN';
    const hostname = osNode.hostname();
    
    // Get MAC address of first active network interface
    let mac = '';
    const interfaces = osNode.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
      for (const net of interfaces[name]) {
        if (!net.internal && net.mac && net.mac !== '00:00:00:00:00:00') {
          mac = net.mac;
          break;
        }
      }
      if (mac) break;
    }
    
    const rawString = `${platform}_${arch}_${cpuModel}_${hostname}_${mac}`;
    const hash = cryptoNode.createHash('sha256').update(rawString).digest('hex').toUpperCase();
    
    return hash.substring(0, 4) + '-' + hash.substring(4, 8) + '-' + hash.substring(8, 12) + '-' + hash.substring(12, 16);
  } catch (e) {
    return 'GG-FREE-LICENSE-DEV-ID';
  }
}

function getExpectedActivationKey(deviceId) {
  const secretSalt = 'GG_CONTROL_LICENSE_SECRET_KEY_2026_OFFLINE';
  const rawString  = deviceId.trim().toUpperCase() + secretSalt;
  const hash = cryptoNode.createHash('sha256').update(rawString).digest('hex').toUpperCase();
  return hash.substring(16, 20) + '-' + hash.substring(20, 24) + '-' + hash.substring(24, 28) + '-' + hash.substring(28, 32);
}

function checkLicense() {
  const currentFingerprint = getDeviceFingerprint();
  if (fsNode.existsSync(licenseFile)) {
    try {
      const license = JSON.parse(fsNode.readFileSync(licenseFile, 'utf8'));
      if (license.deviceId === currentFingerprint) {
        const expectedKey = getExpectedActivationKey(currentFingerprint);
        if (license.activationKey === expectedKey) {
          return true; // Valid key for this machine
        }
      }
    } catch (e) {}
  }
  return false;
}

function showActivationScreen() {
  const deviceId = getDeviceFingerprint();
  
  const overlay = document.createElement('div');
  overlay.id = 'license-overlay';
  overlay.style.cssText = `
    position: fixed; inset: 0; z-index: 9999999;
    background: linear-gradient(135deg, #09090e 0%, #11111f 100%);
    display: flex; align-items: center; justify-content: center;
    color: white; direction: rtl; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;
  `;
  
  overlay.innerHTML = `
    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); width: 460px; border-radius: 16px; padding: 35px; box-shadow: 0 10px 35px rgba(0,0,0,0.6); text-align: center; backdrop-filter: blur(10px);">
      <div style="font-size: 3.5rem; margin-bottom: 15px;">🛡️</div>
      <h2 style="margin: 0 0 8px 0; font-size: 1.5rem; font-weight: 800; color: #fff;">ترخيص برنامج GG Control</h2>
      <p style="margin: 0 0 24px 0; font-size: 0.85rem; color: var(--text-muted); line-height: 1.6; padding: 0 10px;">
        هذا البرنامج محمي بحقوق المطور. يرجى إدخال مفتاح التفعيل الخاص بجهازك لتشغيله.
      </p>
      
      <!-- Device ID Box -->
      <div style="background: rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.05); padding: 14px 16px; border-radius: 10px; margin-bottom: 20px;">
        <div style="font-size: 0.72rem; color: var(--text-muted); margin-bottom: 6px; font-weight: 600;">رمز جهازك (قم بنسخه وإرساله للمطور):</div>
        <div style="font-size: 1.2rem; font-weight: 800; letter-spacing: 1px; color: #fbbf24; font-family: monospace; user-select: all;">${deviceId}</div>
      </div>
      
      <!-- Activation Key Input -->
      <div style="text-align: right; margin-bottom: 24px;">
        <label style="display: block; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px; font-weight: 600;">مفتاح التفعيل:</label>
        <input type="text" id="license-input-key" placeholder="XXXX-XXXX-XXXX-XXXX" 
          style="width: 100%; padding: 12px 16px; font-size: 1.15rem; text-align: center; font-family: monospace; letter-spacing: 1px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; border-radius: 8px; text-transform: uppercase;">
      </div>
      
      <!-- Submit Button -->
      <button onclick="submitActivation()" 
        style="width: 100%; padding: 14px; font-size: 1rem; font-weight: 700; border-radius: 8px; border: none; background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 15px rgba(29,78,216,0.35);">
        ✓ تفعيل البرنامج
      </button>
      
      <div id="license-error" style="color: #ef4444; font-size: 0.82rem; margin-top: 14px; display: none; font-weight: 600;">
        ❌ مفتاح التفعيل غير صحيح! يرجى إعادة التحقق.
      </div>
    </div>
  `;
  
  document.body.appendChild(overlay);
}

function submitActivation() {
  const inputKey = (document.getElementById('license-input-key')?.value || '').trim().toUpperCase();
  const currentFingerprint = getDeviceFingerprint();
  const expectedKey = getExpectedActivationKey(currentFingerprint);
  
  if (inputKey === expectedKey) {
    const license = {
      deviceId: currentFingerprint,
      activationKey: inputKey,
      activatedAt: new Date().toISOString()
    };
    try {
      fsNode.writeFileSync(licenseFile, JSON.stringify(license, null, 2), 'utf8');
      showToast('🎉 تم تفعيل البرنامج بنجاح!', 'success');
      
      const overlay = document.getElementById('license-overlay');
      if (overlay) overlay.remove();
    } catch (e) {
      alert('فشل حفظ ملف الترخيص: ' + e.message);
    }
  } else {
    const errorEl = document.getElementById('license-error');
    if (errorEl) errorEl.style.display = 'block';
  }
}



function loadData() {
  if (fsNode.existsSync(dataFile)) {
    try {
      const data = JSON.parse(fsNode.readFileSync(dataFile, 'utf8'));
      if (data.devices) DEVICES = data.devices;
      if (data.menuItems) MENU_ITEMS = data.menuItems;
      if (data.expenses) EXPENSES = data.expenses;
      if (data.suppliers) SUPPLIERS = data.suppliers;
      if (data.activityLog) ACTIVITY_LOG = data.activityLog;
      if (data.transactions) TRANSACTIONS = data.transactions;
      if (data.fixedCosts) FIXED_COSTS = data.fixedCosts;
      if (data.maintenanceLog) MAINTENANCE_LOG = data.maintenanceLog;
      if (data.adminSettings) ADMIN_SETTINGS = data.adminSettings;
      if (ADMIN_SETTINGS.enableRounding === undefined) {
        ADMIN_SETTINGS.enableRounding = true;
      }
      
      // ================= DATA MIGRATION PATCH =================
      // 1. Recover missing buyPrice from supplier invoices
      if (Array.isArray(MENU_ITEMS) && Array.isArray(SUPPLIERS)) {
        MENU_ITEMS.forEach(prod => {
          if (prod.buyPrice === undefined || prod.buyPrice === 0) {
            let foundBuyPrice = 0;
            SUPPLIERS.forEach(sup => {
              if (sup.invoices) {
                sup.invoices.forEach(inv => {
                  if (inv.items) {
                    const invItem = inv.items.find(i => i.productId === prod.id);
                    if (invItem && invItem.buyPrice) {
                      foundBuyPrice = invItem.buyPrice;
                    }
                  }
                });
              }
            });
            if (foundBuyPrice > 0) {
              prod.buyPrice = foundBuyPrice;
            }
          }
        });
      }

      // 2. Parse and recover buffetCogs for existing transactions
      if (Array.isArray(TRANSACTIONS) && Array.isArray(MENU_ITEMS)) {
        TRANSACTIONS.forEach(tr => {
          if (tr.buffetCogs === undefined || tr.buffetCogs === 0) {
            let itemsString = '';
            if (tr.type === 'بيع مباشر' && tr.details.startsWith('بيع مباشر:')) {
              itemsString = tr.details.substring('بيع مباشر:'.length);
            } else if (tr.type === 'جلسة لعب' && tr.details.includes('+ بوفيه (')) {
              const startIdx = tr.details.indexOf('+ بوفيه (') + '+ بوفيه ('.length;
              const endIdx = tr.details.indexOf(')', startIdx);
              if (endIdx > -1) {
                itemsString = tr.details.substring(startIdx, endIdx);
              }
            }
            
            if (itemsString && itemsString !== 'لا يوجد') {
              let trCogs = 0;
              const itemParts = itemsString.split(',').map(s => s.trim());
              itemParts.forEach(part => {
                const xIdx = part.lastIndexOf(' x');
                if (xIdx > -1) {
                  const name = part.substring(0, xIdx).trim();
                  const qty = parseInt(part.substring(xIdx + 2)) || 0;
                  const prod = MENU_ITEMS.find(p => p.name === name);
                  if (prod && prod.buyPrice) {
                    trCogs += prod.buyPrice * qty;
                  }
                }
              });
              if (trCogs > 0) {
                tr.buffetCogs = trCogs;
              }
            }
          }
        });
      }

      // Auto-save patched data
      setTimeout(() => {
        try { saveData(); } catch(e) {}
      }, 500);

      if (data.state) {
        STATE.dailyRevenue = parseFloat(data.state.dailyRevenue) || 0;
        STATE.dailySessions = parseInt(data.state.dailySessions) || 0;
      }
    } catch (e) {
      console.error('Error loading data:', e);
    }
  }
}

function saveData() {
  const data = {
    devices: DEVICES,
    menuItems: MENU_ITEMS,
    expenses: EXPENSES,
    suppliers: SUPPLIERS,
    activityLog: ACTIVITY_LOG,
    transactions: TRANSACTIONS,
    fixedCosts: FIXED_COSTS,
    maintenanceLog: MAINTENANCE_LOG,
    adminSettings: ADMIN_SETTINGS,
    state: {
      dailyRevenue: STATE.dailyRevenue,
      dailySessions: STATE.dailySessions
    }
  };
  fsNode.writeFileSync(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

// Ensure assets folder exists
const assetsDir = pathNode.join(__dirname, 'assets');
if (!fsNode.existsSync(assetsDir)) {
  fsNode.mkdirSync(assetsDir);
}


// Ensure invoices folder exists
const invoicesDir = pathNode.join(assetsDir, 'invoices');
if (!fsNode.existsSync(invoicesDir)) {
  fsNode.mkdirSync(invoicesDir);
}

// ════════════════════════════════════════════════════════════════
//  BACKUP & RESTORE SYSTEM
// ════════════════════════════════════════════════════════════════
const backupDir = pathNode.join(__dirname, 'backups');
if (!fsNode.existsSync(backupDir)) {
  fsNode.mkdirSync(backupDir, { recursive: true });
}

// Format date for filename: YYYY-MM-DD_HH-mm
function getBackupTimestamp() {
  const n = new Date();
  const pad = v => String(v).padStart(2, '0');
  return `${n.getFullYear()}-${pad(n.getMonth()+1)}-${pad(n.getDate())}_${pad(n.getHours())}-${pad(n.getMinutes())}`;
}

// Create a backup snapshot now
function createBackup(label) {
  try {
    const ts       = getBackupTimestamp();
    const fileName = `backup_${ts}${label ? '_' + label : ''}.json`;
    const filePath = pathNode.join(backupDir, fileName);
    const data = {
      _backupMeta: {
        createdAt: new Date().toISOString(),
        label: label || 'تلقائي',
        appVersion: '1.0'
      },
      devices:       DEVICES,
      menuItems:     MENU_ITEMS,
      expenses:      EXPENSES,
      suppliers:     SUPPLIERS,
      activityLog:   ACTIVITY_LOG,
      transactions:  TRANSACTIONS,
      fixedCosts:    FIXED_COSTS,
      adminSettings: ADMIN_SETTINGS,
      state: {
        dailyRevenue:  STATE.dailyRevenue,
        dailySessions: STATE.dailySessions
      }
    };
    fsNode.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');

    // Keep only last 30 backups to avoid disk bloat
    pruneOldBackups(30);
    return { success: true, fileName };
  } catch (e) {
    console.error('Backup error:', e);
    return { success: false, error: e.message };
  }
}

// Delete oldest backups, keep `maxKeep` most recent
function pruneOldBackups(maxKeep) {
  try {
    const files = fsNode.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => ({ name: f, time: fsNode.statSync(pathNode.join(backupDir, f)).mtime.getTime() }))
      .sort((a, b) => b.time - a.time);
    const toDelete = files.slice(maxKeep);
    toDelete.forEach(f => {
      try { fsNode.unlinkSync(pathNode.join(backupDir, f.name)); } catch {}
    });
  } catch {}
}

// List all backup files with metadata
function listBackups() {
  try {
    return fsNode.readdirSync(backupDir)
      .filter(f => f.endsWith('.json'))
      .map(f => {
        const fPath = pathNode.join(backupDir, f);
        const stat  = fsNode.statSync(fPath);
        let meta    = {};
        try {
          const parsed = JSON.parse(fsNode.readFileSync(fPath, 'utf8'));
          meta = parsed._backupMeta || {};
        } catch {}
        return { name: f, size: stat.size, mtime: stat.mtime.toISOString(), meta };
      })
      .sort((a, b) => new Date(b.mtime) - new Date(a.mtime));
  } catch { return []; }
}

// Restore data from a backup file
function restoreFromBackup(fileName) {
  try {
    const fPath = pathNode.join(backupDir, fileName);
    if (!fsNode.existsSync(fPath)) return { success: false, error: 'الملف غير موجود' };
    const data = JSON.parse(fsNode.readFileSync(fPath, 'utf8'));

    // Create safety backup before restoring
    createBackup('قبل_الاستعادة');

    if (data.devices)       DEVICES       = data.devices;
    if (data.menuItems)     MENU_ITEMS     = data.menuItems;
    if (data.expenses)      EXPENSES      = data.expenses;
    if (data.suppliers)     SUPPLIERS     = data.suppliers;
    if (data.activityLog)   ACTIVITY_LOG  = data.activityLog;
    if (data.transactions)  TRANSACTIONS  = data.transactions;
    if (data.fixedCosts)    FIXED_COSTS   = data.fixedCosts;
    if (data.adminSettings) ADMIN_SETTINGS = data.adminSettings;
    if (data.state) {
      STATE.dailyRevenue  = parseFloat(data.state.dailyRevenue)  || 0;
      STATE.dailySessions = parseInt(data.state.dailySessions)   || 0;
    }

    saveData();
    return { success: true };
  } catch (e) {
    console.error('Restore error:', e);
    return { success: false, error: e.message };
  }
}

// Auto-backup: once per hour (3 600 000 ms)
let _lastAutoBackupDay = -1;
function autoBackupTick() {
  const now = new Date();
  // Also create a daily backup once per day at first run after midnight
  if (now.getDate() !== _lastAutoBackupDay) {
    _lastAutoBackupDay = now.getDate();
    createBackup('يومي');
  }
}

// Run auto-backup every hour
setInterval(() => {
  createBackup('تلقائي');
}, 60 * 60 * 1000);

// Run initial tick shortly after app loads
setTimeout(autoBackupTick, 3000);

// ════════════════════════════════════════════════════════════════
//  BACKUP UI FUNCTIONS
// ════════════════════════════════════════════════════════════════

function renderBackupSection() {
  const backups = listBackups();
  const container = document.getElementById('backup-section-content');
  if (!container) return;

  const fmt = iso => {
    const d = new Date(iso);
    return d.toLocaleDateString('ar-DZ') + ' ' + d.toLocaleTimeString('ar-DZ', {hour:'2-digit', minute:'2-digit'});
  };
  const fmtSize = bytes => {
    if (bytes < 1024)       return bytes + ' B';
    if (bytes < 1024*1024)  return (bytes/1024).toFixed(1) + ' KB';
    return (bytes/(1024*1024)).toFixed(2) + ' MB';
  };

  container.innerHTML = `
    <!-- Stats row -->
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:22px;">
      <div class="stat-card" style="--c:var(--green); padding: 14px 18px;">
        <div class="stat-icon" style="--c:var(--green); font-size:1.4rem; width:40px; height:40px;">📁</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:1.4rem; font-weight:800; color:var(--green);">${backups.length}</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">عدد النسخ المحفوظة</div>
        </div>
        <div class="stat-glow" style="--c:var(--green)"></div>
      </div>
      
      <div class="stat-card" style="--c:var(--purple); padding: 14px 18px;">
        <div class="stat-icon" style="--c:var(--purple); font-size:1.4rem; width:40px; height:40px;">⏱</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:1.0rem; font-weight:700; color:var(--purple); direction:ltr; text-align:right;">${backups.length > 0 ? fmt(backups[0].mtime) : '—'}</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">آخر نسخة احتياطية</div>
        </div>
        <div class="stat-glow" style="--c:var(--purple)"></div>
      </div>

      <div class="stat-card" style="--c:var(--cyan); padding: 14px 18px;">
        <div class="stat-icon" style="--c:var(--cyan); font-size:1.4rem; width:40px; height:40px;">📂</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:1.0rem; font-weight:700; color:var(--cyan); direction:ltr;">/backups</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">مجلد النسخ الاحتياطي</div>
        </div>
        <div class="stat-glow" style="--c:var(--cyan)"></div>
      </div>
    </div>

    <!-- Action buttons -->
    <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:22px;">
      <button onclick="manualBackup()" class="btn-primary" style="display:flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:0.9rem; background:linear-gradient(135deg,var(--green),#065f46); border:none; font-weight:600; cursor:pointer; box-shadow: 0 4px 12px rgba(16,185,129,0.25);">
        💾 إنشاء نسخة احتياطية الآن
      </button>
      <button onclick="openBackupFolder()" class="btn-secondary" style="display:flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:0.9rem; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.03); color:#fff; font-weight:600; cursor:pointer; transition:all 0.2s;">
        📂 فتح مجلد النسخ الاحتياطية
      </button>
      <button onclick="renderBackupSection()" class="btn-secondary" style="display:flex; align-items:center; gap:8px; padding:10px 20px; border-radius:8px; font-size:0.9rem; border:1px solid rgba(255,255,255,0.15); background:rgba(255,255,255,0.03); color:#fff; font-weight:600; cursor:pointer; transition:all 0.2s;">
        🔄 تحديث القائمة
      </button>
    </div>

    <!-- Auto-backup info box -->
    <div style="background:rgba(245,158,11,0.05); border:1px solid rgba(245,158,11,0.15); border-radius:12px; padding:14px 18px; margin-bottom:22px; display:flex; align-items:flex-start; gap:12px; box-shadow: 0 4px 12px rgba(245,158,11,0.03);">
      <span style="font-size:1.4rem; filter: drop-shadow(0 2px 5px rgba(245,158,11,0.3));">🤖</span>
      <div>
        <div style="font-weight:700; color:#fbbf24; margin-bottom:4px; font-size:0.95rem;">النسخ الاحتياطي التلقائي مفعّل ونشط</div>
        <div style="font-size:0.82rem; color:var(--text-muted); line-height:1.6;">
          يتم حفظ نسخة احتياطية تلقائياً كل ساعة، ونسخة يومية عند أول تشغيل بعد منتصف الليل.<br>
          يتم الاحتفاظ بآخر <strong style="color:white; font-weight:700;">30 نسخة</strong> وحذف النسخ الأقدم تلقائياً لمنع امتلاء مساحة القرص.
        </div>
      </div>
    </div>

    <!-- Backups list -->
    <div style="font-size:0.95rem; font-weight:700; color:white; margin-bottom:14px; display:flex; align-items:center; gap:8px;">📋 قائمة النسخ الاحتياطية</div>
    ${backups.length === 0 ? `
      <div style="text-align:center; padding:40px; color:var(--text-muted); font-size:0.9rem; background:rgba(255,255,255,0.01); border:1px dashed rgba(255,255,255,0.08); border-radius:12px;">
        لا توجد نسخ احتياطية بعد.<br>اضغط "إنشاء نسخة احتياطية الآن" لإنشاء أول نسخة.
      </div>` : `
      <div style="border:1px solid rgba(255,255,255,0.08); border-radius:12px; overflow:hidden; box-shadow:0 4px 15px rgba(0,0,0,0.15); background:rgba(0,0,0,0.15);">
        <table style="width:100%; border-collapse:collapse;">
          <thead>
            <tr style="background:rgba(255,255,255,0.03); color:var(--text-muted); font-size:0.78rem; text-align:right; border-bottom:1px solid rgba(255,255,255,0.08);">
              <th style="padding:12px 16px; font-weight:700;">التاريخ والوقت</th>
              <th style="padding:12px 16px; text-align:center; font-weight:700;">النوع</th>
              <th style="padding:12px 16px; text-align:center; font-weight:700;">الحجم</th>
              <th style="padding:12px 16px; text-align:center; font-weight:700;">الإجراءات</th>
            </tr>
          </thead>
          <tbody>
            ${backups.map((b,i) => {
              const isAuto  = (b.meta.label||'').includes('تلقائي');
              const isDaily = (b.meta.label||'').includes('يومي');
              const isSafe  = (b.meta.label||'').includes('قبل_الاستعادة');
              const isManual= (b.meta.label||'').includes('يدوي');
              const badgeCol= isDaily?'#f59e0b': isManual?'#10b981': isSafe?'#ef4444': '#6366f1';
              const badgeTxt= isDaily?'📅 يومي': isManual?'✋ يدوي': isSafe?'🛡️ قبل الاستعادة': '🤖 تلقائي';
              return `
                <tr style="border-top:1px solid rgba(255,255,255,0.05); background:${i%2===0?'transparent':'rgba(255,255,255,0.01)'}; transition:all 0.2s;" onmouseover="this.style.background='rgba(255,255,255,0.03)'" onmouseout="this.style.background='${i%2===0?'transparent':'rgba(255,255,255,0.01)'}'">
                  <td style="padding:14px 16px; font-size:0.85rem; color:white; font-weight:600;">${fmt(b.mtime)}</td>
                  <td style="padding:14px 16px; text-align:center;">
                    <span style="background:${badgeCol}15; color:${badgeCol}; border:1px solid ${badgeCol}35; padding:3px 10px; border-radius:12px; font-size:0.75rem; font-weight:700; white-space:nowrap;">${badgeTxt}</span>
                  </td>
                  <td style="padding:14px 16px; text-align:center; color:var(--text-muted); font-size:0.82rem; font-family:monospace;">${fmtSize(b.size)}</td>
                  <td style="padding:14px 16px; text-align:center;">
                    <div style="display:flex; gap:8px; justify-content:center;">
                      <button onclick="confirmRestoreBackup('${b.name}')"
                        style="background:rgba(16,185,129,0.12); border:1px solid rgba(16,185,129,0.25); color:#10b981; padding:6px 14px; border-radius:6px; cursor:pointer; font-size:0.8rem; font-weight:700; transition:all 0.2s; white-space:nowrap;" onmouseover="this.style.background='rgba(16,185,129,0.25)'" onmouseout="this.style.background='rgba(16,185,129,0.12)'">
                        🔄 استعادة
                      </button>
                      <button onclick="deleteBackupFile('${b.name}')"
                        style="background:rgba(239,68,68,0.08); border:1px solid rgba(239,68,68,0.2); color:#ef4444; padding:6px 10px; border-radius:6px; cursor:pointer; font-size:0.8rem; transition:all 0.2s;" onmouseover="this.style.background='rgba(239,68,68,0.2)'" onmouseout="this.style.background='rgba(239,68,68,0.08)'">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>`}
  `;
}

function manualBackup() {
  const result = createBackup('يدوي');
  if (result.success) {
    showToast(`✅ تم حفظ نسخة احتياطية: ${result.fileName}`, 'success');
    renderBackupSection();
  } else {
    showToast('❌ فشل إنشاء النسخة الاحتياطية: ' + result.error, 'error');
  }
}

function openBackupFolder() {
  try {
    const { shell } = require('electron');
    shell.openPath(backupDir);
  } catch {
    showToast('مجلد النسخ: ' + backupDir, 'info');
  }
}

function confirmRestoreBackup(fileName) {
  if (confirm(`⚠️ تحذير:\nهل أنت متأكد أنك تريد استعادة هذه النسخة؟\n\nسيتم حفظ نسخة احتياطية تلقائية من البيانات الحالية قبل الاستعادة.\n\nالملف: ${fileName}`)) {
    const result = restoreFromBackup(fileName);
    if (result.success) {
      showToast('✅ تمت استعادة البيانات بنجاح! جاري إعادة تحميل الواجهة...', 'success');
      setTimeout(() => {
        renderAdminDashboard();
        renderDeviceGrid();
        renderInventory();
        renderReports();
        renderBackupSection();
      }, 800);
    } else {
      showToast('❌ فشلت الاستعادة: ' + result.error, 'error');
    }
  }
}

function deleteBackupFile(fileName) {
  if (confirm(`هل تريد حذف هذه النسخة الاحتياطية نهائياً؟\n${fileName}`)) {
    try {
      fsNode.unlinkSync(pathNode.join(backupDir, fileName));
      showToast('تم حذف النسخة الاحتياطية', 'success');
      renderBackupSection();
    } catch (e) {
      showToast('فشل الحذف: ' + e.message, 'error');
    }
  }
}

// ════════════════════════════════════════════════════════════════
//  REMOTE UPDATE SYSTEM
// ════════════════════════════════════════════════════════════════
// How it works:
//   1. Developer uploads updated files + update-manifest.json to GitHub raw URL
//   2. App checks the manifest on startup & every 6 hours
//   3. If new version found → shows notification banner
//   4. User clicks "تحديث" → downloads new files → restarts app
//
// Manifest JSON format (hosted on GitHub):
// {
//   "version": "1.1.0",
//   "releaseDate": "2026-07-20",
//   "releaseNotes": "إصلاح مشكلة الطباعة، إضافة تقرير أسبوعي",
//   "files": {
//     "app.js":     "https://raw.githubusercontent.com/YOU/REPO/main/app.js",
//     "index.html": "https://raw.githubusercontent.com/YOU/REPO/main/index.html",
//     "style.css":  "https://raw.githubusercontent.com/YOU/REPO/main/style.css"
//   }
// }
// ════════════════════════════════════════════════════════════════

const httpsNode = require('https');
const updateConfigFile = pathNode.join(__dirname, 'update-config.json');

// Load (or create) the local update config
function loadUpdateConfig() {
  const defaults = {
    manifestUrl: '',          // Set by developer — GitHub raw URL to manifest JSON
    lastChecked: null,
    lastFoundVersion: null
  };
  try {
    if (fsNode.existsSync(updateConfigFile)) {
      return Object.assign(defaults, JSON.parse(fsNode.readFileSync(updateConfigFile, 'utf8')));
    }
  } catch {}
  return defaults;
}

function saveUpdateConfig(cfg) {
  try { fsNode.writeFileSync(updateConfigFile, JSON.stringify(cfg, null, 2), 'utf8'); } catch {}
}

// Compare semantic versions: returns true if remote > local
function isNewerVersion(remote, local) {
  const parse = v => (v || '0.0.0').split('.').map(Number);
  const [rMaj, rMin, rPatch] = parse(remote);
  const [lMaj, lMin, lPatch] = parse(local);
  if (rMaj !== lMaj) return rMaj > lMaj;
  if (rMin !== lMin) return rMin > lMin;
  return rPatch > lPatch;
}

// Download a URL to a string (returns Promise)
function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    httpsNode.get(url, { timeout: 15000 }, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(data));
    }).on('error', reject).on('timeout', () => reject(new Error('timeout')));
  });
}

// Download a URL and write to a local file path (returns Promise)
function downloadFile(url, destPath) {
  return new Promise((resolve, reject) => {
    const tmp = destPath + '.tmp';
    const file = fsNode.createWriteStream(tmp);
    httpsNode.get(url, { timeout: 30000 }, res => {
      if (res.statusCode !== 200) { reject(new Error('HTTP ' + res.statusCode)); return; }
      res.pipe(file);
      file.on('finish', () => {
        file.close();
        fsNode.renameSync(tmp, destPath);
        resolve();
      });
    }).on('error', err => {
      try { fsNode.unlinkSync(tmp); } catch {}
      reject(err);
    }).on('timeout', () => reject(new Error('timeout')));
  });
}

// Check for updates against the manifest URL
async function checkForUpdates(silent) {
  const cfg = loadUpdateConfig();
  if (!cfg.manifestUrl) {
    if (!silent) showToast('لم يتم تعيين رابط التحديث بعد.', 'error');
    return null;
  }

  try {
    const raw      = await fetchUrl(cfg.manifestUrl);
    const manifest = JSON.parse(raw);
    cfg.lastChecked      = new Date().toISOString();
    cfg.lastFoundVersion = manifest.version;
    saveUpdateConfig(cfg);

    if (isNewerVersion(manifest.version, APP_VERSION)) {
      showUpdateBanner(manifest);
      renderUpdateSection(); // refresh UI if settings tab open
      return manifest;
    } else {
      if (!silent) showToast(`✅ تطبيقك محدّث! الإصدار ${APP_VERSION}`, 'success');
      renderUpdateSection();
      return null;
    }
  } catch (e) {
    if (!silent) showToast('فشل التحقق من التحديثات: ' + e.message, 'error');
    return null;
  }
}

// Show a sticky banner at the top of the screen
function showUpdateBanner(manifest) {
  const existing = document.getElementById('update-banner');
  if (existing) existing.remove();

  const banner = document.createElement('div');
  banner.id = 'update-banner';
  banner.style.cssText = `
    position: fixed; top: 0; left: 0; right: 0; z-index: 99999;
    background: linear-gradient(135deg, #7c3aed, #2563eb);
    color: white; padding: 12px 24px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 16px; box-shadow: 0 4px 20px rgba(0,0,0,0.4);
    font-family: inherit; direction: rtl; animation: slideDown 0.4s ease;
  `;
  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:12px;">
      <span style="font-size:1.4rem;">🚀</span>
      <div>
        <div style="font-weight:700; font-size:0.95rem;">تحديث جديد متاح — الإصدار ${manifest.version}</div>
        <div style="font-size:0.78rem; opacity:0.85; margin-top:2px;">${manifest.releaseNotes || 'تحسينات وإصلاحات'}</div>
      </div>
    </div>
    <div style="display:flex; gap:10px; flex-shrink:0;">
      <button onclick="applyUpdate()" style="background:white; color:#7c3aed; border:none; padding:8px 18px; border-radius:8px; font-weight:700; cursor:pointer; font-size:0.85rem;">⬇️ تحديث الآن</button>
      <button onclick="document.getElementById('update-banner').remove()" style="background:rgba(255,255,255,0.15); color:white; border:1px solid rgba(255,255,255,0.3); padding:8px 14px; border-radius:8px; cursor:pointer; font-size:0.85rem;">لاحقاً</button>
    </div>
  `;
  document.body.prepend(banner);

  // Add slide-down animation
  if (!document.getElementById('update-banner-style')) {
    const st = document.createElement('style');
    st.id = 'update-banner-style';
    st.textContent = '@keyframes slideDown { from { transform:translateY(-100%); opacity:0; } to { transform:translateY(0); opacity:1; } }';
    document.head.appendChild(st);
  }
}

// Download and apply the update
async function applyUpdate() {
  const cfg = loadUpdateConfig();
  if (!cfg.manifestUrl) { showToast('رابط التحديث غير مضبوط.', 'error'); return; }

  // Backup first
  createBackup('قبل_التحديث');
  showToast('⬇️ جاري تنزيل التحديث...', 'info');

  // Show progress overlay
  const overlay = document.createElement('div');
  overlay.id = 'update-overlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.85);z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:20px;color:white;direction:rtl;';
  overlay.innerHTML = `
    <div style="font-size:2.5rem;">⬇️</div>
    <div style="font-size:1.2rem;font-weight:700;">جاري تنزيل التحديث...</div>
    <div id="update-progress" style="font-size:0.9rem;opacity:0.75;">يرجى الانتظار</div>
    <div style="width:280px;height:6px;background:rgba(255,255,255,0.2);border-radius:3px;overflow:hidden;">
      <div id="update-bar" style="height:100%;width:0%;background:linear-gradient(90deg,#7c3aed,#2563eb);border-radius:3px;transition:width 0.3s;"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const setProgress = (pct, msg) => {
    const bar = document.getElementById('update-bar');
    const txt = document.getElementById('update-progress');
    if (bar) bar.style.width = pct + '%';
    if (txt) txt.textContent = msg;
  };

  try {
    const raw      = await fetchUrl(cfg.manifestUrl);
    const manifest = JSON.parse(raw);
    const files    = Object.entries(manifest.files || {});

    for (let i = 0; i < files.length; i++) {
      const [name, url] = files[i];
      setProgress(Math.round(((i) / files.length) * 90), `تنزيل ${name}...`);
      const dest = pathNode.join(__dirname, name);
      await downloadFile(url, dest);
    }

    setProgress(100, '✅ اكتمل التنزيل — جاري إعادة التشغيل...');

    // Copy to dist paths if they exist
    const distPaths = [
      pathNode.join(__dirname, 'dist', 'GameZoneManager-win32-x64', 'resources', 'app'),
      pathNode.join(__dirname, 'dist-v7', 'GameZoneManager-win32-x64', 'resources', 'app')
    ];
    for (const dp of distPaths) {
      if (fsNode.existsSync(dp)) {
        for (const [name] of files) {
          try {
            const src = pathNode.join(__dirname, name);
            const dst = pathNode.join(dp, name);
            if (fsNode.existsSync(src)) fsNode.copyFileSync(src, dst);
          } catch {}
        }
      }
    }

    setTimeout(() => {
      try { location.reload(); } catch { window.location.reload(); }
    }, 1500);

  } catch (e) {
    document.body.removeChild(overlay);
    showToast('❌ فشل التحديث: ' + e.message, 'error');
  }
}

// Auto-check every 6 hours
setInterval(() => checkForUpdates(true), 6 * 60 * 60 * 1000);
// Check on startup (after 5 seconds)
setTimeout(() => checkForUpdates(true), 5000);

// ─── Update section UI ────────────────────────────────────────
function renderUpdateSection() {
  const el = document.getElementById('update-section-content');
  if (!el) return;

  const cfg = loadUpdateConfig();
  const fmt = iso => iso ? new Date(iso).toLocaleString('ar-DZ') : '—';
  const hasUrl = !!cfg.manifestUrl;
  const hasNewer = cfg.lastFoundVersion && isNewerVersion(cfg.lastFoundVersion, APP_VERSION);

  el.innerHTML = `
    <!-- Version info -->
    <div style="display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-bottom:22px;">
      <div class="stat-card" style="--c:var(--primary); padding: 14px 18px;">
        <div class="stat-icon" style="--c:var(--primary); font-size:1.4rem; width:40px; height:40px;">ℹ️</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:1.4rem; font-weight:800; color:#818cf8;">${APP_VERSION}</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">الإصدار الحالي</div>
        </div>
        <div class="stat-glow" style="--c:var(--primary)"></div>
      </div>
      
      <div class="stat-card" style="--c:${hasNewer ? 'var(--red)' : 'var(--green)'}; padding: 14px 18px;">
        <div class="stat-icon" style="--c:${hasNewer ? 'var(--red)' : 'var(--green)'}; font-size:1.4rem; width:40px; height:40px;">🚀</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:1.4rem; font-weight:800; color:${hasNewer ? '#ef4444' : '#10b981'};">${cfg.lastFoundVersion || '—'}</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">آخر إصدار متاح</div>
        </div>
        <div class="stat-glow" style="--c:${hasNewer ? 'var(--red)' : 'var(--green)'}"></div>
      </div>

      <div class="stat-card" style="--c:var(--cyan); padding: 14px 18px;">
        <div class="stat-icon" style="--c:var(--cyan); font-size:1.4rem; width:40px; height:40px;">🔍</div>
        <div class="stat-info">
          <div class="stat-value" style="font-size:0.88rem; font-weight:700; color:var(--cyan); direction:ltr; text-align:right;">${fmt(cfg.lastChecked)}</div>
          <div class="stat-label" style="font-size:0.75rem; color:var(--text-muted); margin-top:2px;">آخر تحقق</div>
        </div>
        <div class="stat-glow" style="--c:var(--cyan)"></div>
      </div>
    </div>

    ${hasNewer ? `
    <div style="background:linear-gradient(135deg, rgba(124,58,237,0.15), rgba(37,99,235,0.1)); border:1px solid rgba(124,58,237,0.3); border-radius:12px; padding:14px 18px; margin-bottom:18px; display:flex; align-items:center; gap:12px; box-shadow:0 4px 12px rgba(124,58,237,0.15);">
      <span style="font-size:1.6rem; filter: drop-shadow(0 2px 5px rgba(124,58,237,0.4));">🚀</span>
      <div style="flex:1;">
        <div style="font-weight:700; color:#a78bfa; margin-bottom:4px; font-size:0.95rem;">تحديث جديد متاح للتحميل!</div>
        <div style="font-size:0.82rem; color:var(--text-muted);">الإصدار الجديد (${cfg.lastFoundVersion}) جاهز للتثبيت الفوري.</div>
      </div>
      <button onclick="applyUpdate()" style="background:linear-gradient(135deg,#7c3aed,#2563eb); color:white; border:none; padding:10px 20px; border-radius:8px; font-weight:700; cursor:pointer; font-size:0.88rem; white-space:nowrap; box-shadow:0 4px 12px rgba(124,58,237,0.3); transition:transform 0.2s;">⬇️ تحديث الآن</button>
    </div>` : ''}

    <!-- Manifest URL setting -->
    <div style="margin-bottom:20px;">
      <label style="display:block; font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">🔗 رابط ملف التحديث (Manifest URL)</label>
      <div style="display:flex; gap:10px;">
        <input type="text" id="update-manifest-url" value="${cfg.manifestUrl || ''}"
          placeholder="https://raw.githubusercontent.com/..."
          style="flex:1; padding:12px 14px; background:rgba(255,255,255,0.03); border:1px solid var(--border-color); color:white; border-radius:8px; font-size:0.9rem; direction:ltr; text-align:left; transition:border-color 0.2s;">
        <button onclick="saveManifestUrl()" style="background:linear-gradient(135deg,var(--primary),var(--secondary)); color:white; border:none; padding:0 22px; border-radius:8px; font-weight:600; cursor:pointer; white-space:nowrap; font-size:0.9rem; box-shadow:0 4px 12px rgba(168,85,247,0.25);">💾 حفظ</button>
      </div>
      <div style="font-size:0.82rem; color:var(--text-muted); margin-top:8px; line-height:1.4;">
        رابط التحديث يتم الحصول عليه من المطور، ويحفظ في إعدادات التطبيق للتنبيه التلقائي بأي إصدارات جديدة.
      </div>
    </div>

    <!-- Action buttons -->
    <div style="display:flex; gap:10px; flex-wrap:wrap; margin-bottom:22px;">
      <button onclick="checkForUpdates(false)" class="btn-primary" style="padding:10px 20px; border-radius:8px; font-size:0.9rem; background:linear-gradient(135deg,#1d4ed8,#3b82f6); border:none; font-weight:600; cursor:pointer; box-shadow: 0 4px 12px rgba(29,78,216,0.25);">
        🔍 فحص التحديثات الآن
      </button>
    </div>

    <!-- How it works -->
    <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.06); border-radius:12px; padding:18px;">
      <div style="font-size:0.9rem; font-weight:700; color:white; margin-bottom:12px; display:flex; align-items:center; gap:6px;">📖 كيف يعمل نظام التحديث؟</div>
      <div style="font-size:0.8rem; color:var(--text-muted); line-height:2;">
        1️⃣ المطور يرفع الملفات المحدّثة على خادم الويب أو مستودع GitHub.<br>
        2️⃣ يفحص التطبيق التحديثات تلقائياً عند كل تشغيل وكل 6 ساعات في الخلفية.<br>
        3️⃣ عند توفر إصدار جديد، يظهر إشعار فوري أعلى الشاشة ينبهك بالتغييرات.<br>
        4️⃣ بالضغط على "تحديث الآن"، يقوم التطبيق بتنزيل الملفات وتثبيتها تلقائياً.<br>
        5️⃣ يأخذ البرنامج نسخة احتياطية من البيانات بالكامل قبل استبدال الملفات للأمان التام.
      </div>
    </div>
  `;
}

function saveManifestUrl() {
  const url = (document.getElementById('update-manifest-url')?.value || '').trim();
  const cfg = loadUpdateConfig();
  cfg.manifestUrl = url;
  saveUpdateConfig(cfg);
  showToast('✅ تم حفظ رابط التحديث', 'success');
}

// Helper function to format date as DD/MM/YYYY
function formatCustomDate(dateVal) {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return day + '/' + month + '/' + year;
}

// Helper function to format datetime as DD/MM/YYYY HH:MM
function formatCustomDateTime(dateVal) {
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return day + '/' + month + '/' + year + ' ' + hours + ':' + minutes;
}

// Start application and verify license
loadData();
if (!checkLicense()) {
  setTimeout(showActivationScreen, 200);
}


// ───────────────────────── Inventory ─────────────────────────
const INVENTORY = [
  { name: 'بيتزا صغيرة',    stock: 12, max: 20, price: 15, icon: '🍕' },
  { name: 'برغر',            stock: 8,  max: 20, price: 18, icon: '🍔' },
  { name: 'فرايز',           stock: 3,  max: 30, price: 8,  icon: '🍟' },
  { name: 'كولا (كرتون)',    stock: 24, max: 48, price: 5,  icon: '🥤' },
  { name: 'ريدبول (علبة)',   stock: 5,  max: 24, price: 10, icon: '⚡' },
  { name: 'شوكولاتة',        stock: 30, max: 60, price: 8,  icon: '🍫' },
  { name: 'آيس كريم',        stock: 2,  max: 20, price: 10, icon: '🍦' },
  { name: 'دونات',           stock: 10, max: 30, price: 9,  icon: '🍩' },
];

// ───────────────────────── Staff ─────────────────────────
const STAFF = [
  { name: 'محمد العتيبي', role: 'مدير المنطقة',    status: 'on-duty',  icon: '👨‍💼' },
  { name: 'نورة السالم',  role: 'كاشير',           status: 'on-duty',  icon: '👩‍💼' },
  { name: 'حسين الزهراني',role: 'مشرف الأجهزة',   status: 'on-duty',  icon: '🧑‍🔧' },
  { name: 'ريم القحطاني', role: 'موظفة البوفيه',  status: 'on-duty',  icon: '👩‍🍳' },
  { name: 'ماجد الحربي',  role: 'مشرف ليلي',      status: 'off-duty', icon: '👨‍🔧' },
  { name: 'أميرة اليحيى', role: 'تنظيف وصيانة',  status: 'off-duty', icon: '🧹'   },
];

// ───────────────────────── Clock ─────────────────────────
function updateClock() {
  const now = new Date();
  const h = String(now.getHours()).padStart(2, '0');
  const m = String(now.getMinutes()).padStart(2, '0');
  const s = String(now.getSeconds()).padStart(2, '0');
  document.getElementById('header-clock').textContent = `${h}:${m}:${s}`;

  const days   = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const months = ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'];
  document.getElementById('header-date').textContent =
    `${days[now.getDay()]}، ${now.getDate()} ${months[now.getMonth()]} ${now.getFullYear()}`;
}

// ───────────────────────── Tab Switching ─────────────────────────
function switchTab(tabName) {
  document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(el => el.classList.remove('active'));
  
  const tabEl = document.getElementById('tab-' + tabName);
  if (tabEl) tabEl.classList.add('active');
  
  const navEl = document.querySelector('[data-tab="' + tabName + '"]');
  if (navEl) navEl.classList.add('active');

  if (tabName === 'dashboard') renderDevicesGrid();
  if (tabName === 'inventory') renderInventoryGrid();
  if (tabName === 'reports') renderReports();
  if (tabName === 'settings') renderSettings();
  if (tabName === 'devices') renderDevicesManagement();
  if (tabName === 'admin') renderAdminDashboard();
  if (tabName === 'activity') renderActivityLog();
}

// ───────────────────────── Render Devices Grid ─────────────────────────
function renderDevicesGrid() {
  const container = document.getElementById('devices-grid');
  const filter    = STATE.currentFilter;

  let activeCount = 0;

  DEVICES.forEach((dev, i) => {
    const status    = getDeviceStatus(dev.id);
    const timerStr = getTimerString(dev.id);
    const sess      = sessions[dev.id];

    const matchFilter = (filter === 'all' || status === filter);
    if (status === 'busy' || status === 'ending') activeCount++;

    let card = document.getElementById(`device-card-${dev.id}`);
    
    // Create card if it doesn't exist
    if (!card) {
      card = document.createElement('div');
      card.id = `device-card-${dev.id}`;
      card.style.animationDelay = `${i * 0.04}s`;
      card.onclick = () => selectDevice(dev.id);
      
      card.innerHTML = `
        <div class="device-num">#${String(dev.id).padStart(2,'0')} • منطقة ${dev.zone}</div>
        <span class="device-icon-wrap">${dev.icon}</span>
        <div class="device-name">${dev.name}</div>
        <div class="device-type-badge">${dev.type}</div>
        <div class="device-status-row">
          <div class="device-status">
            <span class="status-indicator"></span>
            <span class="status-text-elem"></span>
          </div>
          <span class="device-countdown"></span>
        </div>
        <div class="device-player-container"></div>
      `;
      container.appendChild(card);
    }

    // Update visibility based on filter
    card.style.display = matchFilter ? 'block' : 'none';
    if (!matchFilter) return;

    // Update classes
    card.className = `device-card status-${status}${STATE.selectedDeviceId === dev.id ? ' selected' : ''}`;
    
    let statusText = 'متوفر';
    if (status === 'busy')    statusText = 'مشغول';
    if (status === 'ending')  statusText = 'يوشك';

    card.querySelector('.status-text-elem').textContent = statusText;
    
    const countdownElem = card.querySelector('.device-countdown');
    if (status !== 'available') {
      countdownElem.style.display = 'block';
      countdownElem.textContent = timerStr;
    } else {
      countdownElem.style.display = 'none';
    }

    const playerContainer = card.querySelector('.device-player-container');
    if (sess) {
      const modeText = sess.playersMode === 'quad' ? 'رباعي 👥👥' : 'ثنائي 👥';
      const playerText = sess.player ? `👤 ${sess.player}` : modeText;
      playerContainer.innerHTML = `<div class="device-player" style="color: var(--amber); font-weight: bold; font-size: 0.75rem;">${playerText}</div>`;
    } else {
      playerContainer.innerHTML = '';
    }
  });

  // Update stats
  document.getElementById('stat-active-val').textContent = activeCount;
  const revValEl = document.getElementById('stat-revenue-val');
  if (revValEl) revValEl.textContent = `${Number(STATE.dailyRevenue).toFixed(0)} دج`;
  document.getElementById('stat-sessions-val').textContent = STATE.dailySessions;
  document.getElementById('stat-orders-val').textContent  = STATE.dailyBuffetOrders;
}

// ───────────────────────── Select Device ─────────────────────────
function selectDevice(id) {
  STATE.selectedDeviceId = id;
  document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
  const card = document.getElementById(`device-card-${id}`);
  if (card) card.classList.add('selected');
  renderDeviceDetail(id);
  updateActionButtons(id);
}

function clearSelection() {
  STATE.selectedDeviceId = null;
  document.querySelectorAll('.device-card').forEach(c => c.classList.remove('selected'));
  document.getElementById('device-detail-content').innerHTML = `
    <div class="no-selection">
      <div class="no-sel-icon">🎮</div>
      <p>اختر جهازاً لعرض تفاصيله</p>
    </div>`;
  updateActionButtons(null);
}

function renderDeviceDetail(id) {
  const dev    = DEVICES.find(d => d.id == id);
  const sess   = sessions[id];
  const status = getDeviceStatus(id);

  if (!dev) return;

  let statusBadge = '<span style="color:var(--text-muted)">⬤ متوفر</span>';
  if (status === 'busy')   statusBadge = '<span style="color:var(--green)">⬤ مشغول</span>';
  if (status === 'ending') statusBadge = '<span style="color:var(--amber)">⬤ يوشك على الانتهاء</span>';

  let sessionDetailsHTML = '';
  if (sess) {
    const isFixed = sess.durationMins > 0;
    const durationLabel = isFixed ? `${sess.durationMins} دقيقة` : 'مفتوح';
    const elapsedMins = (Date.now() - sess.startedAt) / 60000;
    const hourlyRate = getDeviceHourlyRate(dev, sess.playersMode || 'double', sess.pricingType || 'time');
    const isMatch = (sess.pricingType || 'time') === 'match';
    
    let finalSessionCost = 0;
    let costHtml = '';
    
    let matchesRowHTML = '';
    if (isMatch) {
      const matchPrice = getDeviceHourlyRate(dev, sess.playersMode || 'double', 'match');
      const currentMatches = sess.matchCount || 1;
      finalSessionCost = roundToNearest5(currentMatches * matchPrice);
      costHtml = `<span style="color:var(--green)">${finalSessionCost.toFixed(2)} دج</span>`;
      
      matchesRowHTML = `
        <div style="margin-top:8px; margin-bottom:8px; background:rgba(255,255,255,0.02); padding:6px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
          <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:6px;">المباريات الملعوبة حتى الآن:</span>
          <div style="display:flex; align-items:center; justify-content:center; gap:8px;">
            <button onclick="decrementActiveSessionMatches('${dev.id}')" class="dur-btn" style="width:28px; height:28px; padding:0; line-height:28px; font-weight:bold;">-</button>
            <strong id="active-session-match-val" style="font-size:1.1rem; color:white; min-width:30px; text-align:center;">${currentMatches}</strong>
            <button onclick="incrementActiveSessionMatches('${dev.id}')" class="dur-btn" style="width:28px; height:28px; padding:0; line-height:28px; font-weight:bold;">+</button>
          </div>
        </div>
      `;
    } else {
      const rawCost = isFixed ? ((sess.durationMins / 60) * hourlyRate) : ((elapsedMins / 60) * hourlyRate);
      finalSessionCost = roundToNearest5(rawCost);
      costHtml = `<span style="color:var(--green)">${finalSessionCost.toFixed(2)} دج</span>`;
    }
    
    let buffetCost = 0;
    if (sess.buffet) {
      sess.buffet.forEach(item => {
        buffetCost += item.price * item.qty;
      });
    }
    const currentTotal = finalSessionCost + buffetCost;
    
    const pricingModeLabel = isMatch ? 'بالمباراة ⚽' : 'بالوقت ⏱️';
    
    sessionDetailsHTML = `
      <div class="detail-row">
        <span class="detail-row-label">${isFixed ? 'الوقت المتبقي' : 'الوقت المنقضي'}</span>
        <span class="detail-row-value ${status === 'ending' ? 'detail-time-ending' : 'detail-time-remaining'}">${getTimerString(dev.id)}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">طريقة الاحتساب</span>
        <span class="detail-row-value" style="color:var(--purple); font-weight:bold;">${pricingModeLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">نوع الجلسة</span>
        <span class="detail-row-value">${isMatch ? 'لعب بالمباراة ⚽' : durationLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">وضع اللعب</span>
        <span class="detail-row-value" style="font-weight:bold; color:var(--amber);">${(sess.playersMode === 'quad') ? 'رباعي (4 لاعبين) 👥👥' : 'ثنائي (لاعبين 2) 👥'}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">تكلفة اللعب الحالية</span>
        <span class="detail-row-value">${costHtml}</span>
      </div>
      ${matchesRowHTML}
      ${buffetCost > 0 ? `
      <div class="detail-row" style="border-top: 1px dashed rgba(255,255,255,0.08); padding-top: 8px; margin-top: 8px;">
        <span class="detail-row-label">تكلفة البوفيه</span>
        <span class="detail-row-value" style="color:var(--green); font-weight:bold;">${buffetCost.toFixed(2)} دج</span>
      </div>
      <div class="detail-row" style="border-bottom: 1px dashed rgba(255,255,255,0.08); padding-bottom: 8px; margin-bottom: 8px;">
        <span class="detail-row-label">المجموع حتى الآن</span>
        <span class="detail-row-value" style="color:#fbbf24; font-weight:bold; font-size:1.15rem;">${currentTotal.toFixed(2)} دج</span>
      </div>
      ` : ''}
    `;
  } else {
    const isMatch = (STATE.selectedPricingType || 'time') === 'match';
    const rateDouble = getDeviceHourlyRate(dev, 'double', STATE.selectedPricingType || 'time');
    const rateQuad = getDeviceHourlyRate(dev, 'quad', STATE.selectedPricingType || 'time');
    let rateStr = '';
    if (isMatch) {
      rateStr = `${rateDouble} دج (ثنائي) / ${rateQuad} دج (رباعي) لكل مباراة`;
    } else {
      rateStr = `${rateDouble} دج/ساعة (ثنائي) • ${rateQuad} دج/ساعة (رباعي)`;
    }
    const pricingModeLabel = isMatch ? 'بالمباراة ⚽' : 'بالوقت ⏱️';
    sessionDetailsHTML = `
      <div class="detail-row">
        <span class="detail-row-label">طريقة الاحتساب</span>
        <span class="detail-row-value" style="color:var(--purple); font-weight:bold;">${pricingModeLabel}</span>
      </div>
      <div class="detail-row">
        <span class="detail-row-label">التسعيرة المتوقعة</span>
        <span class="detail-row-value" style="color:var(--cyan); font-size:0.9rem;">${rateStr}</span>
      </div>
    `;
  }

  let modeSelectorHTML = '';
  if (!sess) {
    const isMatch = (STATE.selectedPricingType || 'time') === 'match';
    modeSelectorHTML = `
      <div style="margin-bottom:8px; background:rgba(255,255,255,0.02); padding:6px; border-radius:8px; border:1px solid rgba(255,255,255,0.05);">
        <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:6px;">طريقة الحساب للجلسة:</span>
        <div style="display:flex; gap:6px; margin-bottom:10px;">
          <button id="btn-pricing-time" class="dur-btn ${!isMatch ? 'active' : ''}" style="flex:1; text-align:center; font-weight:bold; padding:4px 8px; font-size:0.72rem;" onclick="setSessionPricingType('time', '${dev.id}')">بالوقت ⏱️</button>
          <button id="btn-pricing-match" class="dur-btn ${isMatch ? 'active' : ''}" style="flex:1; text-align:center; font-weight:bold; padding:4px 8px; font-size:0.72rem;" onclick="setSessionPricingType('match', '${dev.id}')">بالمباراة ⚽</button>
        </div>
        
        <span style="font-size:0.75rem; color:var(--text-muted); display:block; margin-bottom:6px;">وضع اللعب للجلسة:</span>
        <div style="display:flex; gap:6px;">
          <button id="btn-mode-double" class="dur-btn ${STATE.selectedPlayersMode === 'double' ? 'active' : ''}" style="flex:1; text-align:center; font-weight:bold; padding:4px 8px; font-size:0.72rem;" onclick="setSessionPlayersMode('double', '${dev.id}')">ثنائي (2) 👥</button>
          <button id="btn-mode-quad" class="dur-btn ${STATE.selectedPlayersMode === 'quad' ? 'active' : ''}" style="flex:1; text-align:center; font-weight:bold; padding:4px 8px; font-size:0.72rem;" onclick="setSessionPlayersMode('quad', '${dev.id}')">رباعي (4) 👥👥</button>
        </div>
      </div>
    `;
  }

  let actionButtonsHTML = '';
  if (!sess) {
    if (dev.pricingType === 'match') {
      actionButtonsHTML = `
        <div class="detail-actions">
          <h5 style="margin-top:5px; margin-bottom:8px; font-size:0.8rem;">بدء الجلسة</h5>
          <button class="btn btn-success" onclick="startSession(0)" style="width:100%; margin-bottom:8px; font-size:0.95rem; padding:8px;">▶ بدء اللعب بالمباراة</button>
        </div>
      `;
    } else {
      actionButtonsHTML = `
        <div class="detail-actions">
          <h5 style="margin-top:5px; margin-bottom:8px; font-size:0.8rem;">بدء الجلسة</h5>
          <button class="btn btn-success" onclick="startSession(0)" style="width:100%; margin-bottom:8px; font-size:0.95rem; padding:8px;">▶ تشغيل مفتوح</button>
          <h5 style="margin-top:5px; margin-bottom:8px; font-size:0.8rem;">خيارات التشغيل المتقدمة</h5>
          <div class="durations-grid" style="margin-bottom:8px; display:flex; flex-wrap:wrap; gap:6px;">
            ${dev.defaultDuration ? `<button class="dur-btn" style="background:var(--primary); color:white; font-weight:bold; padding:4px 8px; font-size:0.72rem;" onclick="startSession(${dev.defaultDuration})">${dev.defaultDuration} د</button>` : ''}
            <button class="dur-btn" style="padding:4px 8px; font-size:0.72rem;" onclick="startSession(30)">30 د</button>
            <button class="dur-btn" style="padding:4px 8px; font-size:0.72rem;" onclick="startSession(60)">1 س</button>
            <button class="dur-btn" style="padding:4px 8px; font-size:0.72rem;" onclick="startSession(90)">1.5 س</button>
            <button class="dur-btn" style="padding:4px 8px; font-size:0.72rem;" onclick="startSession(120)">2 س</button>
          </div>
        </div>
      `;
    }
  } else {
    actionButtonsHTML = `
      <div class="detail-actions">
        <button class="btn btn-primary" onclick="openOrderModal()" style="width:100%; margin-bottom:8px; font-size:0.95rem; padding:8px; background:linear-gradient(135deg, var(--green), #065f46); border:none; display:flex; align-items:center; justify-content:center; gap:6px; cursor:pointer;">🍿 إضافة طلب بوفيه للجلسة</button>
        <button class="btn btn-danger" onclick="endSession()" style="width:100%; margin-bottom:8px; font-size:0.95rem; padding:8px;">⏹ إنهاء الجلسة والدفع</button>
        ${sess.durationMins > 0 ? `<button class="btn btn-warning" onclick="extendSession()" style="width:100%; font-size:0.95rem; padding:8px; margin-top:4px;">⏳ تمديد (+30 دقيقة)</button>` : ''}
      </div>
    `;
  }

  document.getElementById('device-detail-content').innerHTML = `
    <div class="detail-device-header">
      <div class="detail-device-icon">${dev.icon}</div>
      <div class="detail-device-meta">
        <h4>${dev.name}</h4>
        <span>${dev.type} • منطقة ${dev.zone}</span>
      </div>
    </div>
    <div class="detail-rows">
      <div class="detail-row">
        <span class="detail-row-label">الحالة</span>
        <span class="detail-row-value">${statusBadge}</span>
      </div>
      ${sessionDetailsHTML}
    </div>
    ${modeSelectorHTML}
    ${actionButtonsHTML}
  `;
}

function updateActionButtons(id) {}

// ───────────────────────── Filter Devices ─────────────────────────
function filterDevices(type, btn) {
  STATE.currentFilter = type;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderDevicesGrid();
  const tabDevices = document.getElementById('tab-devices');
  if (tabDevices && tabDevices.classList.contains('active')) renderDevicesManagementGrid();
}

// ───────────────────────── Session Management ─────────────────────────
function startSession(defaultMins = 60) {
  if (!STATE.selectedDeviceId || getDeviceStatus(STATE.selectedDeviceId) !== 'available') {
    showToast('يجب تحديد جهاز متاح أولاً', 'warning');
    return;
  }
  
  const dev = DEVICES.find(d => d.id == STATE.selectedDeviceId);
  if (!dev) return;

  if (defaultMins === 0) {
    sessions[dev.id] = {
      durationMins: 0,
      startedAt: Date.now(),
      playersMode: STATE.selectedPlayersMode || 'double',
      pricingType: STATE.selectedPricingType || 'time'
    };
    renderDevicesGrid();
    selectDevice(dev.id);
    showToast(`تم بدء جلسة مفتوحة للـ ${dev.name}`, 'success');
    return;
  }

  STATE.sessionDuration = defaultMins;
  
  const durContainer = document.querySelector('#modal-start-session .duration-options');
  if (durContainer) {
    let html = '';
    if (dev.displayDuration) {
      html += `<button class="dur-btn" data-mins="${dev.displayDuration}" onclick="selectDuration(this, ${dev.displayDuration})" style="background:var(--primary); color:white">${dev.displayDuration} دقيقة</button>`;
    }
    html += `
      <button class="dur-btn" data-mins="60" onclick="selectDuration(this, 60)">1 ساعة</button>
      <button class="dur-btn" data-mins="90" onclick="selectDuration(this, 90)">1.5 ساعة</button>
      <button class="dur-btn" data-mins="120" onclick="selectDuration(this, 120)">2 ساعة</button>
      <button class="dur-btn" data-mins="180" onclick="selectDuration(this, 180)">3 ساعات</button>
      <button class="dur-btn" data-mins="custom" onclick="selectDuration(this, 'custom')">مخصص</button>
    `;
    durContainer.innerHTML = html;
    
    setTimeout(() => {
      let defaultBtn = durContainer.querySelector(`[data-mins="${defaultMins}"]`);
      if (defaultBtn) {
        selectDuration(defaultBtn, defaultMins);
      } else {
        const customBtn = durContainer.querySelector(`[data-mins="custom"]`);
        selectDuration(customBtn, 'custom');
        const customInput = document.getElementById('input-custom-duration');
        if (customInput) {
          customInput.value = defaultMins;
          STATE.sessionDuration = defaultMins;
          updatePricePreview();
        }
      }
    }, 10);
  } else {
    updatePricePreview();
  }
  
  openModal('modal-start-session');
}

function selectDuration(btn, mins) {
  document.querySelectorAll('.dur-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  const customInput = document.getElementById('input-custom-duration');
  if (mins === 'custom') {
    customInput.style.display = 'block';
    customInput.focus();
    customInput.oninput = () => {
      STATE.sessionDuration = parseInt(customInput.value) || 0;
      updatePricePreview();
    };
  } else {
    customInput.style.display = 'none';
    STATE.sessionDuration = mins;
    updatePricePreview();
  }
}

function updatePricePreview() {
  const dev = DEVICES.find(d => d.id == STATE.selectedDeviceId);
  if (!dev) return;
  const rawCost = (STATE.sessionDuration / 60) * getDeviceHourlyRate(dev, STATE.selectedPlayersMode || 'double', STATE.selectedPricingType || 'time');
  const cost = roundToNearest5(rawCost).toFixed(2);
  document.getElementById('calc-price').textContent = `${cost} دج`;
}

function confirmStartSession() {
  if (STATE.sessionDuration <= 0) {
    showToast('يرجى اختيار مدة الجلسة', 'warning');
    return;
  }

  const id = STATE.selectedDeviceId;
  sessions[id] = {
    durationMins: STATE.sessionDuration,
    startedAt: Date.now(),
    playersMode: STATE.selectedPlayersMode || 'double',
    pricingType: STATE.selectedPricingType || 'time'
  };

  closeModal('modal-start-session');
  renderDevicesGrid();
  selectDevice(id);
  showToast(`✅ تم بدء الجلسة على ${DEVICES.find(d=>d.id===id).name}`, 'success');
}

let checkoutSessionId = null;
let checkoutBuffetCart = [];

function endSession(init = true) {
  if (!STATE.selectedDeviceId) return;
  const dev = DEVICES.find(d => d.id == STATE.selectedDeviceId);
  const sess = sessions[STATE.selectedDeviceId];
  if (!dev || !sess) return;
  
  checkoutSessionId = STATE.selectedDeviceId;
  const isFixed = sess.durationMins > 0;
  const elapsedMins = (Date.now() - sess.startedAt) / 60000;
  const hourlyRate = getDeviceHourlyRate(dev, sess.playersMode || 'double', sess.pricingType || 'time');
  const isMatch = (sess.pricingType || 'time') === 'match';
  
  let rawCost = 0;
  let matchesFieldHTML = '';
  
  if (isMatch) {
    const matchCountInput = document.getElementById('checkout-match-count');
    const matches = matchCountInput ? (parseInt(matchCountInput.value) || 1) : 1;
    const pricePerMatch = getDeviceHourlyRate(dev, sess.playersMode || 'double', 'match');
    rawCost = matches * pricePerMatch;
    matchesFieldHTML = `
      <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
        <span style="color:var(--text-muted)">عدد المباريات:</span>
        <div style="display:flex; align-items:center; gap:8px;">
          <button onclick="decrementCheckoutMatches()" style="width:28px; height:28px; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px; font-weight:bold; cursor:pointer;">-</button>
          <input type="number" id="checkout-match-count" value="${matches}" min="1" readonly style="width:45px; text-align:center; background:rgba(0,0,0,0.3); border:1px solid var(--border-color); color:white; font-size:1.1rem; border-radius:4px; padding:2px;">
          <button onclick="incrementCheckoutMatches()" style="width:28px; height:28px; background:rgba(255,255,255,0.1); border:none; color:white; border-radius:4px; font-weight:bold; cursor:pointer;">+</button>
        </div>
      </div>
    `;
  } else {
    rawCost = isFixed ? ((sess.durationMins / 60) * hourlyRate) : ((elapsedMins / 60) * hourlyRate);
  }
  
  STATE.checkoutSessionCost = roundToNearest5(rawCost);
  if (init) {
    checkoutBuffetCart = sess.buffet ? JSON.parse(JSON.stringify(sess.buffet)) : [];
  }
  
  const infoContainer = document.getElementById('checkout-session-info');
  infoContainer.innerHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">الجهاز:</span>
      <strong style="font-size:1.2rem">${dev.name}</strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px;">
      <span style="color:var(--text-muted)">المدة المقضية:</span>
      <strong>${getTimerString(STATE.selectedDeviceId)}</strong>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
      <span style="color:var(--text-muted)">وضع اللعب:</span>
      <div style="display:flex; gap:8px;">
        <button id="checkout-mode-double" onclick="changeCheckoutPlayersMode('double')" style="padding:4px 10px; font-size:0.85rem; font-weight:bold; border-radius:4px; border:none; cursor:pointer; background:${(sess.playersMode || 'double') === 'double' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; color:white;">ثنائي (2)</button>
        <button id="checkout-mode-quad" onclick="changeCheckoutPlayersMode('quad')" style="padding:4px 10px; font-size:0.85rem; font-weight:bold; border-radius:4px; border:none; cursor:pointer; background:${sess.playersMode === 'quad' ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; color:white;">رباعي (4)</button>
      </div>
    </div>
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; align-items:center;">
      <span style="color:var(--text-muted)">طريقة الحساب:</span>
      <div style="display:flex; gap:8px;">
        <button id="checkout-pricing-time" onclick="changeCheckoutPricingType('time')" style="padding:4px 10px; font-size:0.85rem; font-weight:bold; border-radius:4px; border:none; cursor:pointer; background:${(sess.pricingType || 'time') === 'time' ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}; color:white;">بالوقت ⏱️</button>
        <button id="checkout-pricing-match" onclick="changeCheckoutPricingType('match')" style="padding:4px 10px; font-size:0.85rem; font-weight:bold; border-radius:4px; border:none; cursor:pointer; background:${sess.pricingType === 'match' ? 'var(--purple)' : 'rgba(255,255,255,0.1)'}; color:white;">بالمباراة ⚽</button>
      </div>
    </div>
    ${matchesFieldHTML}
    <div style="display:flex; justify-content:space-between; margin-top:15px; padding-top:15px; border-top:1px solid rgba(255,255,255,0.1);">
      <span style="color:var(--text-muted)">تكلفة الجلسة:</span>
      <strong id="checkout-session-cost-val" style="color:var(--primary); font-size:1.3rem">${STATE.checkoutSessionCost.toFixed(2)} دج</strong>
    </div>
  `;
  
  if (init) {
    // Render categories for checkout
    const catContainer = document.createElement('div');
    catContainer.className = 'checkout-categories';
    catContainer.style = 'display:flex; gap:10px; margin-bottom:15px; overflow-x:auto; padding-bottom:5px;';
    catContainer.innerHTML = `
      <button class="cat-btn active" onclick="filterCheckoutMenu('all', this)" style="padding:5px 15px; border-radius:20px; background:var(--primary); color:white; border:none; cursor:pointer;">الكل</button>
      <button class="cat-btn" onclick="filterCheckoutMenu('snacks', this)" style="padding:5px 15px; border-radius:20px; background:var(--bg-dark); color:white; border:none; cursor:pointer;">مأكولات</button>
      <button class="cat-btn" onclick="filterCheckoutMenu('drinks', this)" style="padding:5px 15px; border-radius:20px; background:var(--bg-dark); color:white; border:none; cursor:pointer;">مشروبات</button>
      <button class="cat-btn" onclick="filterCheckoutMenu('sweets', this)" style="padding:5px 15px; border-radius:20px; background:var(--bg-dark); color:white; border:none; cursor:pointer;">حلويات</button>
    `;
    
    const oldCatContainer = document.querySelector('.checkout-categories');
    if (oldCatContainer) oldCatContainer.remove();
    
    const buffetGrid = document.getElementById('checkout-buffet-items');
    buffetGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(110px, 1fr))';
    buffetGrid.style.gap = '8px';
    buffetGrid.parentNode.insertBefore(catContainer, buffetGrid);
    
    renderCheckoutBuffet('all');
    openModal('modal-checkout');
  } else {
    // Just update the checkout bill to reflect new sessionCost
    renderCheckoutBill(STATE.checkoutSessionCost);
  }
}

function filterCheckoutMenu(cat, btn) {
  document.querySelectorAll('.checkout-categories .cat-btn').forEach(b => {
    b.style.background = 'var(--bg-dark)';
  });
  btn.style.background = 'var(--primary)';
  renderCheckoutBuffet(cat);
}

function renderCheckoutBuffet(cat = 'all') {
  const container = document.getElementById('checkout-buffet-items');
  const items = cat === 'all' ? MENU_ITEMS : MENU_ITEMS.filter(m => m.cat === cat);
  
  container.innerHTML = items.map(item => {
    let imgHtml = '<span style="font-size:2rem">🍔</span>';
    if (item.image) {
      const fullPath = pathNode.join(__dirname, item.image);
      if (fsNode.existsSync(fullPath)) {
        imgHtml = `<img src="${item.image}?${Date.now()}" alt="${item.name}" style="width:100%; height:100%; object-fit:contain; background:#fff;">`;
      }
    }
    return `
      <div class="menu-item" style="background:var(--bg-card); border:1px solid var(--border-color); border-radius:8px; overflow:hidden; cursor:pointer; transition:transform 0.2s;" onclick="addToCheckoutBuffet('${item.id}')" onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)'">
        <div style="height:70px; background:var(--bg-dark); display:flex; align-items:center; justify-content:center;">
          ${imgHtml}
        </div>
        <div style="padding:6px; text-align:center;">
          <div style="font-weight:bold; font-size:0.8rem; margin-bottom:3px; color:var(--text-main); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${item.name}</div>
          <div style="color:var(--green); font-weight:bold; font-size:0.9rem;">${item.price} دج</div>
        </div>
      </div>`;
  }).join('');
  
  renderCheckoutBill(STATE.checkoutSessionCost);
}

function addToCheckoutBuffet(itemId) {
  const item = MENU_ITEMS.find(m => m.id === itemId);
  if(!item) return;
  const existing = checkoutBuffetCart.find(i => i.id === itemId);
  if(existing) {
    existing.qty++;
  } else {
    checkoutBuffetCart.push({...item, qty: 1});
  }
  
  renderCheckoutBill(STATE.checkoutSessionCost);
}

function renderCheckoutBill(sessionCost) {
  let billHTML = `
    <div style="display:flex; justify-content:space-between; margin-bottom:10px; font-weight:bold; font-size:0.95rem;">
      <span>تكلفة اللعب:</span>
      <span>${sessionCost.toFixed(2)} دج</span>
    </div>
  `;
  
  let buffetTotal = 0;
  checkoutBuffetCart.forEach(item => {
    const itemTotal = item.price * item.qty;
    buffetTotal += itemTotal;
    billHTML += `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; font-size:0.9rem; background:rgba(255,255,255,0.02); padding:6px 10px; border-radius:6px; border:1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; flex-direction:column; gap:2px; flex:1; text-align:right;">
          <span style="color:var(--text-main); font-weight:bold;">${item.name}</span>
          <span style="color:var(--text-muted); font-size:0.8rem;">${item.price} دج × ${item.qty}</span>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <span style="font-weight:bold; color:var(--green); margin-left:8px;">${itemTotal.toFixed(0)} دج</span>
          <button onclick="decreaseCheckoutBuffetQty('${item.id}')" style="width:24px; height:24px; border-radius:4px; border:none; background:rgba(255,255,255,0.1); color:white; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center;">-</button>
          <button onclick="removeFromCheckoutBuffet('${item.id}')" style="width:24px; height:24px; border-radius:4px; border:none; background:rgba(239,68,68,0.2); color:var(--red); cursor:pointer; display:flex; align-items:center; justify-content:center;">✕</button>
        </div>
      </div>
    `;
  });
  
  document.getElementById('checkout-bill-items').innerHTML = billHTML;
  document.getElementById('checkout-total-price').textContent = (sessionCost + buffetTotal).toFixed(2) + ' دج';
}

function decreaseCheckoutBuffetQty(itemId) {
  const existing = checkoutBuffetCart.find(i => i.id === itemId);
  if (existing) {
    existing.qty--;
    if (existing.qty <= 0) {
      checkoutBuffetCart = checkoutBuffetCart.filter(i => i.id !== itemId);
    }
  }
  renderCheckoutBill(STATE.checkoutSessionCost);
}

function removeFromCheckoutBuffet(itemId) {
  checkoutBuffetCart = checkoutBuffetCart.filter(i => i.id !== itemId);
  renderCheckoutBill(STATE.checkoutSessionCost);
}

function confirmPaymentAndPrint() {
  const id = checkoutSessionId;
  const dev = DEVICES.find(d => d.id == id);
  const sess = sessions[id];
  if (!dev || !sess) return;
  
  const isFixed = sess.durationMins > 0;
  const elapsedMins = (Date.now() - sess.startedAt) / 60000;
  const sessionCost = STATE.checkoutSessionCost;
  
  let buffetTotal = 0;
  let receiptBuffetHTML = '';
  checkoutBuffetCart.forEach(item => {
    const itemTotal = item.price * item.qty;
    buffetTotal += itemTotal;
    receiptBuffetHTML += `
      <tr>
        <td>${item.name}</td>
        <td>${item.qty}</td>
        <td>${itemTotal.toFixed(2)}</td>
      </tr>
    `;
  });
  
  const finalTotal = sessionCost + buffetTotal;
  
  let buffetCogs = 0;
  checkoutBuffetCart.forEach(item => {
    const itemRef = MENU_ITEMS.find(m => m.id === item.id);
    const buyPrice = itemRef ? (itemRef.buyPrice || 0) : 0;
    buffetCogs += buyPrice * item.qty;
  });
  
  STATE.dailyRevenue += finalTotal;
  STATE.dailySessions += 1;
  TRANSACTIONS.unshift({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type: 'جلسة لعب',
    deviceName: dev.name,
    sessionCost: sessionCost,
    buffetCost: buffetTotal,
    buffetCogs: buffetCogs,
    total: finalTotal,
    details: `جلسة لعب (${isFixed ? sess.durationMins + ' د' : Math.floor(elapsedMins) + ' د'}) + بوفيه (${checkoutBuffetCart.map(i => i.name + ' x' + i.qty).join(', ') || 'لا يوجد'})`
  });
  logActivity('إنهاء جلسة ودفع', `تم إنهاء الجلسة، الدفع الإجمالي: ${finalTotal.toFixed(0)} دج`);
  STATE.dailyBuffetOrders += checkoutBuffetCart.reduce((sum, i) => sum + i.qty, 0);
  checkoutBuffetCart.forEach(item => {
    let itemRef = MENU_ITEMS.find(m => m.id === item.id);
    if (itemRef && itemRef.stock !== undefined) {
      itemRef.stock -= item.qty;
      if (itemRef.stock < 0) itemRef.stock = 0;
      if (itemRef.stock <= (itemRef.minStock || 0)) {
        showToast(`⚠️ تنبيه: مخزون ${itemRef.name} منخفض (${itemRef.stock} متبقي)`, 'warning');
      }
    }
  });
  renderInventoryGrid();
  
  const d = new Date();
  const dateStr = d.getFullYear() + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getDate().toString().padStart(2, '0') + '  ' + d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
  
  const receiptHTML = `
    <div class="receipt" dir="rtl" style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 10px; color: #000;">
      <div style="text-align: center; margin-bottom: 15px;">
        <h2 style="margin: 0; font-size: 1.6rem; font-weight: 800; color: #222;">GameZone</h2>
        <div style="font-size: 0.9rem; color: #555; margin-top: 5px;">تذكرة دفع</div>
        <div style="font-size: 0.85rem; color: #666; margin-top: 2px;" dir="ltr">${dateStr}</div>
      </div>
      
      <div style="border-top: 1px dashed #000; border-bottom: 1px dashed #000; padding: 10px 0; margin-bottom: 15px;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 5px;">
          <span style="font-weight: 700;">الجهاز:</span>
          <span>${dev.name}</span>
        </div>
        <div style="display: flex; justify-content: space-between;">
          <span style="font-weight: 700;">مدة اللعب:</span>
          <span>${isFixed ? sess.durationMins + ' دقيقة' : Math.floor(elapsedMins) + ' دقيقة'}</span>
        </div>
      </div>
      
      <table style="width:100%; border-collapse: collapse; margin-bottom: 15px; font-size: 0.95rem;">
        <thead>
          <tr style="border-bottom: 1px solid #000;">
            <th style="text-align:right; padding-bottom:5px; width: 50%;">البيان</th>
            <th style="text-align:center; padding-bottom:5px; width: 20%;">الكمية</th>
            <th style="text-align:left; padding-bottom:5px; width: 30%;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 5px 0;">تكلفة اللعب</td>
            <td style="text-align:center; padding: 5px 0;">1</td>
            <td style="text-align:left; padding: 5px 0;">${sessionCost.toFixed(0)}</td>
          </tr>
          ${checkoutBuffetCart.map(item => `
          <tr>
            <td style="padding: 5px 0;">${item.name}</td>
            <td style="text-align:center; padding: 5px 0;">${item.qty}</td>
            <td style="text-align:left; padding: 5px 0;">${(item.price * item.qty).toFixed(0)}</td>
          </tr>
          `).join('')}
        </tbody>
      </table>
      
      <div style="border-top: 2px solid #000; padding-top: 10px; display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 1.2rem; font-weight: 800;">الإجمالي:</span>
        <span style="font-size: 1.3rem; font-weight: 900; color: #000;">${finalTotal.toFixed(0)} دج</span>
      </div>
      
      <div style="text-align: center; margin-top: 30px; font-size: 0.9rem; font-weight: 600; color: #444;">
        شكراً لزيارتكم!
      </div>
    </div>
  `;
  
  document.getElementById('receipt-print-area').innerHTML = receiptHTML;
  
  delete sessions[id];
  clearSelection();
  renderDevicesGrid();
  
  closeModal('modal-checkout');
  
  setTimeout(() => {
    const printElement = document.createElement('div');
    printElement.innerHTML = receiptHTML;
    printElement.style.padding = '20px';
    printElement.style.background = 'white';
    printElement.style.color = 'black';
    printElement.style.width = '300px';
    // Removed monospace to respect inline font
    
    const wrapper = document.createElement('div');
    wrapper.style.position = 'absolute';
    wrapper.style.left = '-9999px';
    wrapper.appendChild(printElement);
    document.body.appendChild(wrapper);
    
    showToast('جاري حفظ وصل الدفع...', 'info');
    
    const opt = {
      margin:       5,
      filename:     'وصل-دفع-' + Date.now() + '.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2 },
      jsPDF:        { unit: 'mm', format: [80, 200], orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(printElement).save().then(() => {
      showToast('تم استخراج الوصل بنجاح!', 'success');
      document.body.removeChild(wrapper);
      document.getElementById('receipt-print-area').innerHTML = '';
    }).catch(err => {
      console.error(err);
      showToast('حدث خطأ أثناء حفظ الوصل.', 'error');
      document.body.removeChild(wrapper);
    });
  }, 300);
}

function extendSession() {
  const id = STATE.selectedDeviceId;
  const sess = sessions[id];
  if (!id || !sess) {
    showToast('لا توجد جلسة للتمديد', 'warning');
    return;
  }
  sess.durationMins += 30;
  const dev = DEVICES.find(d => d.id == id);
  const rawCost = (30 / 60) * getDeviceHourlyRate(dev, sess.playersMode || 'double', sess.pricingType || 'time');
  const cost = roundToNearest5(rawCost);
  STATE.dailyRevenue += cost;
  
  TRANSACTIONS.unshift({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type: 'تمديد جلسة',
    deviceName: dev ? dev.name : 'جهاز غير معروف',
    sessionCost: cost,
    buffetCost: 0,
    total: cost,
    details: `تمديد جلسة لعب +30 دقيقة`
  });
  
  renderDevicesGrid();
  selectDevice(id);
  showToast(`⏩ تم تمديد الجلسة 30 دقيقة إضافية`, 'success');
}

// ───────────────────────── Order System ─────────────────────────
let currentMenuFilter = 'all';

function openOrderModal() {
  const id = STATE.selectedDeviceId;
  if (!id || getDeviceStatus(id) === 'available') {
    showToast('يجب اختيار جهاز مشغول لإضافة طلب', 'warning');
    return;
  }
  
  const dev = DEVICES.find(d => d.id == id);
  const modalHeader = document.querySelector('#modal-order h3');
  if (modalHeader && dev) {
    modalHeader.innerHTML = `🛒 إضافة طلب بوفيه للجلسة (${dev.name})`;
  }
  
  STATE.isDirectSale = false;
  STATE.currentOrder = {};
  renderMenuGrid(currentMenuFilter);
  renderCurrentOrder();
  openModal('modal-order');
}

function filterMenu(cat, btn) {
  currentMenuFilter = cat;
  document.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderMenuGrid(cat);
}

function renderMenuGrid(cat) {
  const container = document.getElementById('menu-grid');
  const items = cat === 'all' ? MENU_ITEMS : MENU_ITEMS.filter(i => i.cat === cat);
  container.innerHTML = items.map(item => {
    const qty = STATE.currentOrder[item.id] || 0;
    
    let imgHtml = '<span class="menu-item-icon" style="font-size:3.5rem; display:block; margin-bottom:10px;">🍔</span>';
    if (item.image) {
      const fullPath = pathNode.join(__dirname, item.image);
      if (fsNode.existsSync(fullPath)) {
        imgHtml = '<img src="' + item.image + '?' + Date.now() + '" style="width:100%; height:110px; object-fit:contain; background:#fff; border-radius:8px; margin-bottom:10px;" />';
      }
    } else if (item.icon) {
      imgHtml = '<span class="menu-item-icon" style="font-size:3.5rem; display:block; margin-bottom:10px;">' + item.icon + '</span>';
    }
    
    return `
      <div class="menu-item${qty > 0 ? ' selected' : ''}" onclick="addToOrder('${item.id}')" style="position:relative; display:flex; flex-direction:column; align-items:center; padding:15px; background:var(--bg-card); border-radius:12px; cursor:pointer; border:2px solid transparent; transition:0.3s;" onmouseover="this.style.transform='translateY(-2px)';" onmouseout="this.style.transform='translateY(0)';">
        ${qty > 0 ? `<div class="menu-item-count" style="position:absolute; top:-10px; right:-10px; background:var(--green); color:#fff; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; box-shadow:0 2px 5px rgba(0,0,0,0.3);">${qty}</div>` : ''}
        ${imgHtml}
        <div class="menu-item-name" style="font-weight:bold; margin-top:5px; text-align:center;">${item.name}</div>
        <div class="menu-item-price" style="color:var(--primary); font-weight:bold; margin-top:5px;">${item.price} دج</div>
      </div>`;
  }).join('');
}

function addToOrder(itemId) {
  STATE.currentOrder[itemId] = (STATE.currentOrder[itemId] || 0) + 1;
  renderMenuGrid(currentMenuFilter);
  renderCurrentOrder();
}

function renderCurrentOrder() {
  const container = document.getElementById('current-order-items');
  const entries   = Object.entries(STATE.currentOrder).filter(([,q]) => q > 0);

  if (entries.length === 0) {
    container.innerHTML = '<span style="color:var(--text-muted)">لم يتم اختيار أي منتج</span>';
    document.getElementById('order-total').textContent = '0.00 دج';
    return;
  }

  let total = 0;
  container.innerHTML = entries.map(([id, qty]) => {
    const item = MENU_ITEMS.find(i => i.id === id);
    if (!item) return '';
    const sub  = item.price * qty;
    total += sub;
    const displayIcon = item.icon ? item.icon : '🍔';
    return `
      <div class="order-item-row" style="display:flex; justify-content:space-between; align-items:center; padding: 8px 0; border-bottom: 1px solid rgba(255,255,255,0.05);">
        <div style="display:flex; align-items:center; gap: 12px;">
          <button onclick="removeFromOrder('${id}')" style="background:var(--red); color:white; border:none; width:26px; height:26px; border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center; font-weight:bold; font-size: 1.2rem; transition: transform 0.2s;" onmouseover="this.style.transform='scale(1.1)'" onmouseout="this.style.transform='scale(1)'">-</button>
          <span>${displayIcon} ${item.name} <span style="color:var(--text-muted); font-size:0.9rem;">× ${qty}</span></span>
        </div>
        <span style="color:var(--amber); font-weight:bold;">${sub.toFixed(2)} دج</span>
      </div>`;
  }).join('');
  document.getElementById('order-total').textContent = total.toFixed(2) + ' دج';
}


function renderStaff() {
  const container = document.getElementById('staff-grid');
  container.innerHTML = STAFF.map(s => `
    <div class="staff-card">
      <div class="staff-avatar">${s.icon}</div>
      <div class="staff-name">${s.name}</div>
      <div class="staff-role">${s.role}</div>
      <span class="staff-status ${s.status}">
        ${s.status === 'on-duty' ? '⬤ في الخدمة' : '⬤ خارج الخدمة'}
      </span>
    </div>`).join('');
}

function renderReports() {
  const container = document.getElementById('reports-grid');
  if (!container) return;

  // Override the CSS class styling dynamically to ensure full width block
  container.style.display = 'flex';
  container.style.flexDirection = 'column';
  container.style.gap = '20px';

  const activeDevices = DEVICES.filter(d => getDeviceStatus(d.id) !== 'available').length;
  const occupancyPct  = DEVICES.length > 0 ? Math.round((activeDevices / DEVICES.length) * 100) : 0;
  
  let multiplier = 1;
  let titleSuffix = 'اليوم';
  if (STATE.reportFilter === 'week') { multiplier = 7; titleSuffix = 'هذا الأسبوع'; }
  else if (STATE.reportFilter === 'month') { multiplier = 30; titleSuffix = 'هذا الشهر'; }
  else if (STATE.reportFilter === 'custom') { multiplier = 3; titleSuffix = 'للفترة المحددة'; }
  
  const barData = [60, 85, 45, 90, 70, 80, 55].map(v => v * multiplier);
  const days    = ['ح','ن','ث','ر','خ','ج','س'];
  const maxBar  = Math.max(...barData);
  
  // Create Device Stats Table
  const deviceStats = DEVICES.map(d => {
    const usages = Math.floor(Math.random() * 20 * multiplier) + 5;
    const rev = roundToNearest5(getDeviceHourlyRate(d) * usages * 0.8);
    return { name: d.name, usages, rev };
  }).sort((a, b) => b.rev - a.rev);
  
  let devicesRows = deviceStats.map((d, i) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 12px; text-align: right;">${i+1}</td>
      <td style="padding: 12px; text-align: right; font-weight: bold;">${d.name}</td>
      <td style="padding: 12px; text-align: center;">${d.usages}</td>
      <td style="padding: 12px; text-align: left; color: var(--green); font-weight: bold; direction: ltr;">${d.rev.toFixed(0)} دج</td>
    </tr>
  `).join('');
  if (deviceStats.length === 0) devicesRows = '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد أجهزة مسجلة</td></tr>';

  // Create Products Stats Table
  const productStats = MENU_ITEMS.map(p => {
    const qty = Math.floor(Math.random() * 30 * multiplier) + 2;
    const rev = p.price * qty;
    return { name: p.name, qty, rev };
  }).sort((a, b) => b.qty - a.qty);
  
  let productsRows = productStats.map((p, i) => `
    <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
      <td style="padding: 12px; text-align: right;">${i+1}</td>
      <td style="padding: 12px; text-align: right; font-weight: bold;">${p.name}</td>
      <td style="padding: 12px; text-align: center;">${p.qty}</td>
      <td style="padding: 12px; text-align: left; color: var(--primary); font-weight: bold; direction: ltr;">${p.rev.toFixed(0)} دج</td>
    </tr>
  `).join('');
  if (productStats.length === 0) productsRows = '<tr><td colspan="4" style="text-align:center; padding: 20px;">لا توجد منتجات مسجلة</td></tr>';

  // ═══════════════════════════════════════════════════════════
  // PEAK HOURS STATISTICS — based on real TRANSACTIONS data
  // ═══════════════════════════════════════════════════════════
  
  // Filter transactions by selected period
  const now = new Date();
  let filteredForPeak = TRANSACTIONS;
  if (STATE.reportFilter === 'today') {
    const todayStr = now.toDateString();
    filteredForPeak = TRANSACTIONS.filter(t => new Date(t.date).toDateString() === todayStr);
  } else if (STATE.reportFilter === 'week') {
    const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
    filteredForPeak = TRANSACTIONS.filter(t => new Date(t.date) >= weekAgo);
  } else if (STATE.reportFilter === 'month') {
    const monthAgo = new Date(now); monthAgo.setDate(monthAgo.getDate() - 30);
    filteredForPeak = TRANSACTIONS.filter(t => new Date(t.date) >= monthAgo);
  } else if (STATE.reportFilter === 'custom') {
    const fromEl = document.getElementById('report-date-from');
    const toEl   = document.getElementById('report-date-to');
    if (fromEl && fromEl.value && toEl && toEl.value) {
      const s = new Date(fromEl.value); s.setHours(0,0,0,0);
      const e = new Date(toEl.value);   e.setHours(23,59,59,999);
      filteredForPeak = TRANSACTIONS.filter(t => { const d = new Date(t.date); return d >= s && d <= e; });
    }
  }

  // Build hourly buckets (0–23) — count sessions & revenue per hour
  const hourlyCount   = Array(24).fill(0);
  const hourlyRevenue = Array(24).fill(0);
  filteredForPeak.forEach(t => {
    const h = new Date(t.date).getHours();
    hourlyCount[h]++;
    hourlyRevenue[h] += (t.total || 0);
  });

  // Build daily buckets (0=Sun…6=Sat)
  const dayNames  = ['الأحد','الاثنين','الثلاثاء','الأربعاء','الخميس','الجمعة','السبت'];
  const dayShort  = ['ح','ن','ث','ر','خ','ج','س'];
  const dayCount  = Array(7).fill(0);
  const dayRevenue= Array(7).fill(0);
  filteredForPeak.forEach(t => {
    const wd = new Date(t.date).getDay();
    dayCount[wd]++;
    dayRevenue[wd] += (t.total || 0);
  });

  // Determine max for scaling bars
  const maxHourlyRev = Math.max(...hourlyRevenue, 1);
  const maxDayRev    = Math.max(...dayRevenue, 1);

  // Top 3 peak hours
  const hourlyIndexed = hourlyRevenue.map((rev, h) => ({ h, rev, count: hourlyCount[h] }));
  const top3Hours = [...hourlyIndexed].sort((a, b) => b.rev - a.rev).slice(0, 3).filter(x => x.rev > 0);

  // Best day
  const bestDayIdx = dayRevenue.indexOf(Math.max(...dayRevenue));

  // Format hour label
  const fmtHour = h => {
    const suffix = h < 12 ? 'ص' : 'م';
    const disp   = h % 12 === 0 ? 12 : h % 12;
    return `${disp} ${suffix}`;
  };

  // Color gradient based on value percentage
  const barColor = pct => {
    if (pct > 0.8) return 'linear-gradient(to top, #ef4444, #f97316)';
    if (pct > 0.5) return 'linear-gradient(to top, #f59e0b, #fbbf24)';
    if (pct > 0.2) return 'linear-gradient(to top, var(--primary), #a855f7)';
    return 'rgba(255,255,255,0.1)';
  };

  // Build hourly bars HTML (grouped in blocks: night, morning, afternoon, evening)
  const timeBlocks = [
    { label: '🌙 ليل', hours: [0,1,2,3,4,5] },
    { label: '🌅 صباح', hours: [6,7,8,9,10,11] },
    { label: '☀️ ظهر', hours: [12,13,14,15,16,17] },
    { label: '🌆 مساء', hours: [18,19,20,21,22,23] }
  ];

  const hourlyBarsHTML = timeBlocks.map(block => `
    <div style="display:flex; flex-direction:column; gap:6px; flex:1; min-width:0;">
      <div style="font-size:0.7rem; color:var(--text-muted); text-align:center; padding-bottom:4px; border-bottom:1px solid rgba(255,255,255,0.06); margin-bottom:4px;">${block.label}</div>
      <div style="display:flex; align-items:flex-end; gap:4px; height:90px;">
        ${block.hours.map(h => {
          const pct = hourlyRevenue[h] / maxHourlyRev;
          const heightPx = Math.max(pct * 80, hourlyRevenue[h] > 0 ? 4 : 0);
          const isTop = top3Hours.some(x => x.h === h);
          return `
            <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:2px; position:relative;">
              ${isTop ? `<div style="width:6px;height:6px;background:#fbbf24;border-radius:50%;margin-bottom:2px;"></div>` : `<div style="width:6px;height:6px;margin-bottom:2px;"></div>`}
              <div title="${fmtHour(h)}: ${hourlyRevenue[h].toFixed(0)} دج (${hourlyCount[h]} جلسة)"
                   style="width:100%; height:${heightPx}px; background:${barColor(pct)}; border-radius:3px 3px 0 0; transition:all 0.3s; cursor:default; min-height:${hourlyRevenue[h]>0?4:0}px;">
              </div>
              <div style="font-size:0.55rem; color:var(--text-muted); text-align:center;">${h}</div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `).join('');

  // Summary cards for peak stats
  const totalPeakSessions = filteredForPeak.length;
  const totalPeakRevenue  = filteredForPeak.reduce((s, t) => s + (t.total || 0), 0);
  const avgPerSession     = totalPeakSessions > 0 ? (totalPeakRevenue / totalPeakSessions).toFixed(0) : 0;

  const top3HTML = top3Hours.length > 0
    ? top3Hours.map((x, i) => {
        const medals = ['🥇','🥈','🥉'];
        const pct = totalPeakRevenue > 0 ? ((x.rev / totalPeakRevenue) * 100).toFixed(1) : 0;
        return `
          <div style="display:flex; align-items:center; justify-content:space-between; padding:10px 14px; background:rgba(255,255,255,0.03); border-radius:8px; border:1px solid rgba(255,255,255,0.06);">
            <div style="display:flex; align-items:center; gap:10px;">
              <span style="font-size:1.3rem;">${medals[i]}</span>
              <div>
                <div style="font-weight:bold; color:white; font-size:0.95rem;">${fmtHour(x.h)} — ${fmtHour((x.h + 1) % 24)}</div>
                <div style="font-size:0.75rem; color:var(--text-muted);">${x.count} جلسة</div>
              </div>
            </div>
            <div style="text-align:left;">
              <div style="font-weight:bold; color:var(--green);">${x.rev.toFixed(0)} دج</div>
              <div style="font-size:0.75rem; color:var(--text-muted);">${pct}% من الإيراد</div>
            </div>
          </div>
        `;
      }).join('')
    : `<div style="color:var(--text-muted); text-align:center; padding:30px 0; font-size:0.9rem;">لا توجد بيانات كافية للفترة المحددة</div>`;

  // Daily bars
  const dayBarsHTML = Array.from({length:7}, (_,i) => {
    const pct = dayRevenue[i] / maxDayRev;
    const heightPx = Math.max(pct * 70, dayRevenue[i] > 0 ? 4 : 0);
    const isBest = i === bestDayIdx && dayRevenue[i] > 0;
    return `
      <div style="flex:1; display:flex; flex-direction:column; align-items:center; gap:4px;">
        ${isBest ? `<div style="font-size:0.6rem; color:#fbbf24; font-weight:bold;">★ذروة</div>` : `<div style="font-size:0.6rem;">&nbsp;</div>`}
        <div title="${dayNames[i]}: ${dayRevenue[i].toFixed(0)} دج"
             style="width:100%; height:${heightPx}px; background:${isBest ? 'linear-gradient(to top,#f59e0b,#fbbf24)' : barColor(pct)}; border-radius:4px 4px 0 0; min-height:${dayRevenue[i]>0?4:0}px;">
        </div>
        <div style="font-size:0.7rem; color:var(--text-muted);">${dayShort[i]}</div>
        <div style="font-size:0.65rem; color:${isBest?'#fbbf24':'rgba(255,255,255,0.3)'}; font-weight:bold;">${dayRevenue[i]>0 ? dayRevenue[i].toFixed(0) : '-'}</div>
      </div>
    `;
  }).join('');

  container.innerHTML = `
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px; width: 100%;">
      <!-- Revenue Card -->
      <div class="report-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 25px;">
        <div>
          <div class="report-title" style="font-size: 1.1rem; color: var(--text-muted);">إجمالي الإيرادات (${titleSuffix})</div>
          <div class="report-value" style="font-size: 2.2rem; font-weight: 900; margin: 10px 0; color: #fff;">${(STATE.dailyRevenue * multiplier).toFixed(0)} دج</div>
          <div class="report-sub" style="color: var(--green); font-size: 0.9rem;">▲ +12% مقارنة بالفترة السابقة</div>
        </div>
        <div class="bar-chart-wrap" style="height: 80px; margin-top: 20px;">
          <div class="bar-chart" style="height: 100%; display: flex; align-items: flex-end; gap: 8px;">
            ${barData.map(v => `<div class="bar" style="height:${(v/maxBar)*100}%; background: linear-gradient(to top, var(--primary), var(--secondary)); width: 100%; border-radius: 4px 4px 0 0;"></div>`).join('')}
          </div>
          <div class="bar-labels" style="display: flex; justify-content: space-between; margin-top: 5px; font-size: 0.8rem; color: var(--text-muted);">
            ${days.map(d => `<div style="flex:1; text-align:center;">${d}</div>`).join('')}
          </div>
        </div>
      </div>
      
      <!-- Sessions Card -->
      <div class="report-card" style="display: flex; flex-direction: column; justify-content: space-between; padding: 25px;">
        <div>
          <div class="report-title" style="font-size: 1.1rem; color: var(--text-muted);">إجمالي الجلسات (${titleSuffix})</div>
          <div class="report-value" style="font-size: 2.2rem; font-weight: 900; margin: 10px 0; color: #fff;">${STATE.dailySessions * multiplier} <span style="font-size:1rem; color:var(--text-muted); font-weight:normal;">جلسة</span></div>
          <div class="report-sub" style="color: var(--text-muted); font-size: 0.9rem;">متوسط مدة الجلسة: 45 دقيقة</div>
        </div>
        <div class="progress-bar-wrap" style="margin-top:auto; padding-top:20px;">
          <div class="progress-row">
            <div class="progress-label" style="display: flex; justify-content: space-between; margin-bottom: 8px;"><span>نسبة الإشغال الحالية</span><span style="font-weight:bold; color:var(--primary);">${occupancyPct}%</span></div>
            <div class="progress-track" style="height: 10px; background: rgba(255,255,255,0.1); border-radius: 5px; overflow: hidden;">
              <div class="progress-fill" style="height: 100%; width:${occupancyPct}%; background: linear-gradient(90deg, var(--primary), #a64dff); border-radius: 5px; transition: width 0.5s ease;"></div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(400px, 1fr)); gap: 20px; width: 100%;">
      <!-- Devices Table -->
      <div class="report-card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden;">
        <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
          <h3 style="margin:0; font-size: 1.2rem; color: #fff;">إحصائيات الأجهزة</h3>
        </div>
        <div style="overflow-y: auto; max-height: 350px;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; background: var(--bg-dark); z-index: 1; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <tr style="color: var(--text-muted);">
                <th style="padding: 15px 12px; text-align: right; width: 50px;">#</th>
                <th style="padding: 15px 12px; text-align: right;">الجهاز</th>
                <th style="padding: 15px 12px; text-align: center;">الطلبات</th>
                <th style="padding: 15px 12px; text-align: left;">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${devicesRows}
            </tbody>
          </table>
        </div>
      </div>

      <!-- Products Table -->
      <div class="report-card" style="padding: 0; display: flex; flex-direction: column; overflow: hidden;">
        <div style="padding: 20px; border-bottom: 1px solid rgba(255,255,255,0.1); background: rgba(0,0,0,0.2);">
          <h3 style="margin:0; font-size: 1.2rem; color: #fff;">مبيعات البوفيه المنتجات</h3>
        </div>
        <div style="overflow-y: auto; max-height: 350px;">
          <table class="data-table" style="width: 100%; border-collapse: collapse;">
            <thead style="position: sticky; top: 0; background: var(--bg-dark); z-index: 1; box-shadow: 0 2px 5px rgba(0,0,0,0.2);">
              <tr style="color: var(--text-muted);">
                <th style="padding: 15px 12px; text-align: right; width: 50px;">#</th>
                <th style="padding: 15px 12px; text-align: right;">المنتج</th>
                <th style="padding: 15px 12px; text-align: center;">الكمية</th>
                <th style="padding: 15px 12px; text-align: left;">الإيرادات</th>
              </tr>
            </thead>
            <tbody>
              ${productsRows}
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══════════════ PEAK HOURS SECTION ═══════════════ -->
    <div class="report-card" style="padding:0; overflow:hidden;">
      <!-- Header -->
      <div style="padding:20px 24px; border-bottom:1px solid rgba(255,255,255,0.08); background:linear-gradient(135deg,rgba(168,85,247,0.15),rgba(6,182,212,0.08)); display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:10px;">
        <div>
          <h3 style="margin:0; font-size:1.2rem; color:#fff;">🕐 إحصائيات أوقات الذروة</h3>
          <div style="font-size:0.8rem; color:var(--text-muted); margin-top:4px;">بناءً على ${totalPeakSessions} جلسة مسجلة — ${titleSuffix}</div>
        </div>
        <div style="display:flex; gap:12px; flex-wrap:wrap;">
          <div style="text-align:center; background:rgba(16,185,129,0.1); border:1px solid rgba(16,185,129,0.2); padding:8px 16px; border-radius:8px;">
            <div style="font-size:0.7rem; color:var(--text-muted);">إجمالي الإيراد</div>
            <div style="font-weight:bold; color:var(--green); font-size:1rem;">${totalPeakRevenue.toFixed(0)} دج</div>
          </div>
          <div style="text-align:center; background:rgba(168,85,247,0.1); border:1px solid rgba(168,85,247,0.2); padding:8px 16px; border-radius:8px;">
            <div style="font-size:0.7rem; color:var(--text-muted);">متوسط / جلسة</div>
            <div style="font-weight:bold; color:var(--primary); font-size:1rem;">${avgPerSession} دج</div>
          </div>
          ${dayRevenue[bestDayIdx] > 0 ? `
          <div style="text-align:center; background:rgba(245,158,11,0.1); border:1px solid rgba(245,158,11,0.2); padding:8px 16px; border-radius:8px;">
            <div style="font-size:0.7rem; color:var(--text-muted);">أفضل يوم</div>
            <div style="font-weight:bold; color:#fbbf24; font-size:1rem;">${dayNames[bestDayIdx]}</div>
          </div>` : ''}
        </div>
      </div>

      <div style="padding:24px; display:flex; flex-direction:column; gap:28px;">

        <!-- Hourly Heatmap Bars -->
        <div>
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:14px;">
            <div style="font-size:0.95rem; font-weight:bold; color:#fff;">📊 توزيع الإيرادات حسب ساعة اليوم</div>
            <div style="display:flex; gap:8px; align-items:center; font-size:0.75rem; color:var(--text-muted);">
              <span style="display:inline-block;width:8px;height:8px;background:#fbbf24;border-radius:50%;"></span> ذروة عالية &nbsp;
              <span style="display:inline-block;width:8px;height:8px;background:var(--primary);border-radius:50%;"></span> نشاط متوسط
            </div>
          </div>
          <div style="display:flex; gap:12px; align-items:flex-end; padding:10px; background:rgba(0,0,0,0.2); border-radius:10px; border:1px solid rgba(255,255,255,0.05);">
            ${hourlyBarsHTML}
          </div>
          <div style="font-size:0.72rem; color:var(--text-muted); margin-top:8px; text-align:center;">الأرقام تمثل ساعة اليوم (0 = منتصف الليل، 12 = الظهر) • النقطة الصفراء = أعلى ساعة إيراد ★</div>
        </div>

        <!-- Two columns: top hours + day chart -->
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:20px;">

          <!-- Top 3 hours -->
          <div>
            <div style="font-size:0.95rem; font-weight:bold; color:#fff; margin-bottom:12px;">🏆 أفضل 3 ساعات إيراداً</div>
            <div style="display:flex; flex-direction:column; gap:8px;">
              ${top3HTML}
            </div>
          </div>

          <!-- Day of week chart -->
          <div>
            <div style="font-size:0.95rem; font-weight:bold; color:#fff; margin-bottom:12px;">📅 توزيع الإيرادات حسب يوم الأسبوع</div>
            <div style="background:rgba(0,0,0,0.2); border:1px solid rgba(255,255,255,0.05); border-radius:10px; padding:16px 12px;">
              <div style="display:flex; align-items:flex-end; gap:6px; height:90px;">
                ${dayBarsHTML}
              </div>
            </div>
            ${dayRevenue[bestDayIdx] > 0 ? `<div style="font-size:0.78rem; color:var(--text-muted); margin-top:8px; text-align:center;">يوم <strong style="color:#fbbf24">${dayNames[bestDayIdx]}</strong> هو الأكثر إيراداً بـ ${dayRevenue[bestDayIdx].toFixed(0)} دج</div>` : '<div style="font-size:0.78rem; color:var(--text-muted); margin-top:8px; text-align:center;">لا توجد بيانات كافية</div>'}
          </div>
        </div>

      </div>
    </div>
  `;
}

function printReport() {
  showToast('جاري تحضير التقرير...', 'info');

  // ── Resolve period ─────────────────────────────────────────
  const now = new Date();
  let startDate, endDate, periodLabel;

  if (STATE.reportFilter === 'today') {
    startDate = new Date(now); startDate.setHours(0,0,0,0);
    endDate   = new Date(now); endDate.setHours(23,59,59,999);
    periodLabel = `يوم ${now.toLocaleDateString('ar-DZ')}`;
  } else if (STATE.reportFilter === 'week') {
    startDate = new Date(now); startDate.setDate(startDate.getDate() - 6); startDate.setHours(0,0,0,0);
    endDate   = new Date(now); endDate.setHours(23,59,59,999);
    periodLabel = `آخر 7 أيام`;
  } else if (STATE.reportFilter === 'month') {
    startDate = new Date(now); startDate.setDate(1); startDate.setHours(0,0,0,0);
    endDate   = new Date(now); endDate.setHours(23,59,59,999);
    periodLabel = `شهر ${now.toLocaleDateString('ar-DZ', {month:'long', year:'numeric'})}`;
  } else {
    const fromVal = document.getElementById('report-date-from')?.value;
    const toVal   = document.getElementById('report-date-to')?.value;
    startDate = fromVal ? new Date(fromVal) : new Date(now); startDate.setHours(0,0,0,0);
    endDate   = toVal   ? new Date(toVal)   : new Date(now); endDate.setHours(23,59,59,999);
    periodLabel = `${fromVal || ''} — ${toVal || ''}`;
  }

  const filteredTx = TRANSACTIONS.filter(t => { const d = new Date(t.date); return d >= startDate && d <= endDate; });
  const filteredEx = EXPENSES.filter(e => { const d = new Date(e.date); return d >= startDate && d <= endDate; });
  const diffDays   = Math.max(1, Math.ceil(Math.abs(endDate - startDate) / (1000*60*60*24)));

  const totalRev   = filteredTx.reduce((s,t) => s + (t.total||0), 0);
  const totalEx    = filteredEx.reduce((s,e) => s + (e.amount||0), 0);
  const totalFixed = FIXED_COSTS.reduce((s,c) => s + getDailyFixedCost(c), 0) * diffDays;
  const totalCogs  = filteredTx.reduce((s,t) => s + (t.buffetCogs||0), 0);
  const totalCosts = totalEx + totalFixed + totalCogs;
  const netProfit  = totalRev - totalCosts;

  // ── Device stats (from real TRANSACTIONS) ──────────────────
  const deviceMap = {};
  filteredTx.forEach(t => {
    if (!t.deviceName) return;
    if (!deviceMap[t.deviceName]) deviceMap[t.deviceName] = { sessions: 0, rev: 0 };
    deviceMap[t.deviceName].sessions++;
    deviceMap[t.deviceName].rev += (t.total || 0);
  });
  const deviceRows = Object.entries(deviceMap)
    .sort((a,b) => b[1].rev - a[1].rev)
    .map(([name,{sessions,rev}],i) => `
      <tr style="border-bottom:1px solid #e8ecf0; background:${i%2===0?'#ffffff':'#f8f9fb'};">
        <td style="padding:10px 14px; color:#64748b; font-size:13px;">${i+1}</td>
        <td style="padding:10px 14px; font-weight:600; color:#1e293b;">${name}</td>
        <td style="padding:10px 14px; text-align:center; color:#475569;">${sessions}</td>
        <td style="padding:10px 14px; text-align:left; color:#059669; font-weight:700; direction:ltr;">${rev.toFixed(0)} دج</td>
      </tr>`).join('') || `<tr><td colspan="4" style="padding:20px; text-align:center; color:#94a3b8;">لا توجد بيانات</td></tr>`;

  // ── Product stats (from real buffet transactions) ───────────
  const prodMap = {};
  filteredTx.forEach(t => {
    if (!t.buffetItems) return;
    Object.entries(t.buffetItems).forEach(([id, qty]) => {
      const item = MENU_ITEMS.find(m => m.id == id);
      if (!item) return;
      if (!prodMap[item.name]) prodMap[item.name] = { qty: 0, rev: 0 };
      prodMap[item.name].qty += qty;
      prodMap[item.name].rev += item.price * qty;
    });
  });
  const prodRows = Object.entries(prodMap)
    .sort((a,b) => b[1].qty - a[1].qty)
    .map(([name,{qty,rev}],i) => `
      <tr style="border-bottom:1px solid #e8ecf0; background:${i%2===0?'#ffffff':'#f8f9fb'};">
        <td style="padding:10px 14px; color:#64748b; font-size:13px;">${i+1}</td>
        <td style="padding:10px 14px; font-weight:600; color:#1e293b;">${name}</td>
        <td style="padding:10px 14px; text-align:center; color:#475569;">${qty}</td>
        <td style="padding:10px 14px; text-align:left; color:#7c3aed; font-weight:700; direction:ltr;">${rev.toFixed(0)} دج</td>
      </tr>`).join('') || `<tr><td colspan="4" style="padding:20px; text-align:center; color:#94a3b8;">لا توجد مبيعات</td></tr>`;

  // ── Peak hours ──────────────────────────────────────────────
  const hrRev = Array(24).fill(0);
  const hrCnt = Array(24).fill(0);
  filteredTx.forEach(t => {
    const h = new Date(t.date).getHours();
    hrRev[h] += (t.total||0); hrCnt[h]++;
  });
  const maxHr = Math.max(...hrRev, 1);
  const fmtH  = h => { const s = h<12?'ص':'م'; const d = h%12||12; return `${d}${s}`; };

  const top3 = hrRev.map((r,h)=>({h,r,c:hrCnt[h]})).sort((a,b)=>b.r-a.r).slice(0,3).filter(x=>x.r>0);
  const medals = ['🥇','🥈','🥉'];
  const top3Rows = top3.map((x,i)=>`
    <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 16px;background:${i===0?'#fffbeb':i===1?'#f8fafc':'#f8fafc'};border-right:4px solid ${i===0?'#f59e0b':i===1?'#94a3b8':'#cd7c2e'};border-radius:6px;margin-bottom:8px;">
      <div style="display:flex;align-items:center;gap:10px;">
        <span style="font-size:18px;">${medals[i]}</span>
        <div>
          <div style="font-weight:700;color:#1e293b;font-size:14px;">${fmtH(x.h)} — ${fmtH((x.h+1)%24)}</div>
          <div style="color:#64748b;font-size:12px;">${x.c} جلسة</div>
        </div>
      </div>
      <div style="text-align:left;">
        <div style="font-weight:700;color:#059669;font-size:14px;">${x.r.toFixed(0)} دج</div>
        <div style="color:#94a3b8;font-size:11px;">${totalRev>0?((x.r/totalRev)*100).toFixed(1):0}% من الإيراد</div>
      </div>
    </div>`).join('') || `<div style="color:#94a3b8;text-align:center;padding:20px;font-size:13px;">لا توجد بيانات</div>`;

  // Hourly bar chart for PDF (inline SVG-like divs)
  const hrBarsHTML = (() => {
    const blocks = [
      {label:'🌙 ليل',   hours:[0,1,2,3,4,5],   bg:'#dbeafe'},
      {label:'🌅 صباح',  hours:[6,7,8,9,10,11],  bg:'#fef9c3'},
      {label:'☀️ ظهر',   hours:[12,13,14,15,16,17], bg:'#dcfce7'},
      {label:'🌆 مساء',  hours:[18,19,20,21,22,23], bg:'#f3e8ff'}
    ];
    const topHours = new Set(top3.map(x=>x.h));
    return blocks.map(b=>`
      <div style="flex:1;background:${b.bg};border-radius:8px;padding:8px 6px 4px;">
        <div style="font-size:9px;color:#64748b;text-align:center;margin-bottom:6px;font-weight:600;">${b.label}</div>
        <div style="display:flex;align-items:flex-end;gap:2px;height:50px;">
          ${b.hours.map(h=>{
            const pct = hrRev[h]/maxHr;
            const hp  = Math.max(pct*44, hrRev[h]>0?3:0);
            const col = topHours.has(h) ? '#f59e0b' : pct>0.5?'#7c3aed':pct>0.2?'#a78bfa':'#d1d5db';
            return `<div style="flex:1;display:flex;flex-direction:column;align-items:center;gap:1px;">
              <div style="width:100%;height:${hp}px;background:${col};border-radius:2px 2px 0 0;"></div>
              <div style="font-size:7px;color:#64748b;">${h}</div>
            </div>`;
          }).join('')}
        </div>
      </div>`).join('');
  })();

  // ── Expenses list ───────────────────────────────────────────
  const expRows = filteredEx.length > 0
    ? filteredEx.map((e,i)=>`
        <tr style="border-bottom:1px solid #e8ecf0; background:${i%2===0?'#ffffff':'#fff8f8'};">
          <td style="padding:9px 14px; color:#64748b; font-size:12px;">${new Date(e.date).toLocaleDateString('ar-DZ')}</td>
          <td style="padding:9px 14px; font-weight:600; color:#dc2626;">${e.type}</td>
          <td style="padding:9px 14px; color:#475569;">${e.notes||'—'}</td>
          <td style="padding:9px 14px; text-align:left; color:#dc2626; font-weight:700; direction:ltr;">${e.amount.toFixed(0)} دج</td>
        </tr>`).join('')
    : `<tr><td colspan="4" style="padding:20px;text-align:center;color:#94a3b8;">لا توجد مصاريف</td></tr>`;

  const profitColor = netProfit >= 0 ? '#059669' : '#dc2626';
  const profitBg    = netProfit >= 0 ? '#ecfdf5' : '#fff1f2';
  const profitBorder= netProfit >= 0 ? '#6ee7b7' : '#fca5a5';

  // ── Build HTML ──────────────────────────────────────────────
  const html = `
<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Segoe UI', Tahoma, Arial, sans-serif; background:#f1f5f9; color:#1e293b; direction:rtl; }
  .page { width:210mm; margin:0 auto; background:#f1f5f9; }

  /* Header */
  .header {
    background: linear-gradient(135deg, #1e1b4b 0%, #312e81 50%, #4c1d95 100%);
    padding: 32px 40px;
    color: white;
    position: relative;
    overflow: hidden;
  }
  .header::before {
    content:'';
    position:absolute; top:-40px; left:-40px;
    width:200px; height:200px;
    background: rgba(255,255,255,0.04);
    border-radius: 50%;
  }
  .header::after {
    content:'';
    position:absolute; bottom:-60px; right:20px;
    width:280px; height:280px;
    background: rgba(139,92,246,0.15);
    border-radius: 50%;
  }
  .header-inner { position:relative; z-index:1; display:flex; justify-content:space-between; align-items:flex-start; }
  .header-title { font-size:28px; font-weight:800; letter-spacing:0.5px; }
  .header-sub   { font-size:14px; color:rgba(255,255,255,0.7); margin-top:6px; }
  .header-badge {
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    border-radius: 12px;
    padding: 10px 18px;
    text-align:center;
    backdrop-filter: blur(10px);
  }
  .header-badge .period-label { font-size:11px; color:rgba(255,255,255,0.6); }
  .header-badge .period-value { font-size:15px; font-weight:700; color:#fff; margin-top:4px; }

  /* Summary cards */
  .summary-row { display:flex; gap:16px; padding: 24px 30px 0; }
  .summary-card {
    flex:1; border-radius:14px; padding:20px;
    display:flex; flex-direction:column; gap:6px;
    box-shadow: 0 2px 12px rgba(0,0,0,0.06);
  }
  .summary-card .label { font-size:12px; font-weight:600; letter-spacing:0.3px; opacity:0.75; }
  .summary-card .value { font-size:22px; font-weight:800; direction:ltr; text-align:right; }
  .card-green  { background:#ecfdf5; color:#065f46; border:1.5px solid #6ee7b7; }
  .card-red    { background:#fff1f2; color:#9f1239; border:1.5px solid #fca5a5; }
  .card-purple { background:#f5f3ff; color:#4c1d95; border:1.5px solid #c4b5fd; }
  .card-profit { background:${profitBg}; color:${profitColor}; border:1.5px solid ${profitBorder}; }

  /* Section wrapper */
  .sections { padding: 20px 30px 30px; display:flex; flex-direction:column; gap:20px; }

  /* Section card */
  .section-card { background:#fff; border-radius:14px; overflow:hidden; box-shadow:0 2px 12px rgba(0,0,0,0.06); border:1px solid #e2e8f0; }
  .section-head {
    padding: 14px 20px;
    font-size:14px; font-weight:700; color:#fff;
    display:flex; align-items:center; gap:8px;
  }
  .head-green  { background: linear-gradient(135deg,#059669,#10b981); }
  .head-purple { background: linear-gradient(135deg,#7c3aed,#a78bfa); }
  .head-blue   { background: linear-gradient(135deg,#1d4ed8,#3b82f6); }
  .head-orange { background: linear-gradient(135deg,#d97706,#f59e0b); }
  .head-red    { background: linear-gradient(135deg,#dc2626,#ef4444); }

  /* Table */
  table { width:100%; border-collapse:collapse; }
  thead th { padding:10px 14px; font-size:12px; font-weight:700; color:#fff; text-align:right; }
  tbody td { font-size:13px; }

  /* Peak hours */
  .peak-grid { display:flex; gap:16px; padding:16px 20px; }
  .peak-bars { display:flex; gap:6px; padding:16px 20px; }
  .peak-note { font-size:10px; color:#94a3b8; text-align:center; padding:0 20px 12px; }

  /* Footer */
  .footer {
    margin: 0 30px 30px;
    padding: 14px 20px;
    background: #1e293b;
    border-radius: 10px;
    display:flex; justify-content:space-between; align-items:center;
    color:rgba(255,255,255,0.6); font-size:11px;
  }
  .footer strong { color:#fff; }
</style>
</head>
<body>
<div class="page">

  <!-- Header -->
  <div class="header">
    <div class="header-inner">
      <div>
        <div class="header-title">🎮 GG Control</div>
        <div class="header-sub">التقرير المالي والإحصائي</div>
      </div>
      <div class="header-badge">
        <div class="period-label">الفترة الزمنية</div>
        <div class="period-value">${periodLabel}</div>
        <div class="period-label" style="margin-top:4px;">${now.toLocaleDateString('ar-DZ', {year:'numeric',month:'long',day:'numeric'})}</div>
      </div>
    </div>
  </div>

  <!-- Summary Cards -->
  <div class="summary-row">
    <div class="summary-card card-green">
      <div class="label">💰 إجمالي الإيرادات</div>
      <div class="value">${totalRev.toFixed(0)} دج</div>
    </div>
    <div class="summary-card card-red">
      <div class="label">💸 إجمالي التكاليف</div>
      <div class="value">${totalCosts.toFixed(0)} دج</div>
    </div>
    <div class="summary-card card-profit">
      <div class="label">${netProfit>=0?'📈':'📉'} صافي الأرباح</div>
      <div class="value">${netProfit.toFixed(0)} دج</div>
    </div>
    <div class="summary-card card-purple">
      <div class="label">🎮 عدد الجلسات</div>
      <div class="value">${filteredTx.length}</div>
    </div>
  </div>

  <div class="sections">

    <!-- Device Stats -->
    <div class="section-card">
      <div class="section-head head-blue">🎮 أداء الأجهزة</div>
      <table>
        <thead style="background:linear-gradient(135deg,#1d4ed8,#3b82f6);">
          <tr><th>#</th><th>الجهاز</th><th style="text-align:center;">الجلسات</th><th style="text-align:left;">الإيرادات</th></tr>
        </thead>
        <tbody>${deviceRows}</tbody>
      </table>
    </div>

    <!-- Products Stats -->
    <div class="section-card">
      <div class="section-head head-purple">🍟 مبيعات البوفيه</div>
      <table>
        <thead style="background:linear-gradient(135deg,#7c3aed,#a78bfa);">
          <tr><th>#</th><th>المنتج</th><th style="text-align:center;">الكمية</th><th style="text-align:left;">الإيرادات</th></tr>
        </thead>
        <tbody>${prodRows}</tbody>
      </table>
    </div>

    <!-- Peak Hours -->
    <div class="section-card">
      <div class="section-head head-orange">🕐 إحصائيات أوقات الذروة</div>

      <!-- Mini summary -->
      <div style="display:flex;gap:12px;padding:14px 20px;background:#fffbeb;border-bottom:1px solid #fde68a;">
        <div style="flex:1;text-align:center;">
          <div style="font-size:10px;color:#92400e;font-weight:600;">إجمالي الجلسات</div>
          <div style="font-size:18px;font-weight:800;color:#d97706;">${filteredTx.length}</div>
        </div>
        <div style="width:1px;background:#fde68a;"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:10px;color:#92400e;font-weight:600;">متوسط / جلسة</div>
          <div style="font-size:18px;font-weight:800;color:#d97706;">${filteredTx.length>0?(totalRev/filteredTx.length).toFixed(0):0} دج</div>
        </div>
        <div style="width:1px;background:#fde68a;"></div>
        <div style="flex:1;text-align:center;">
          <div style="font-size:10px;color:#92400e;font-weight:600;">أعلى ساعة إيراد</div>
          <div style="font-size:18px;font-weight:800;color:#d97706;">${top3.length>0?fmtH(top3[0].h):'—'}</div>
        </div>
      </div>

      <!-- Hourly bars -->
      <div style="padding:16px 20px 4px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">توزيع الإيرادات حسب ساعة اليوم</div>
        <div style="display:flex;gap:8px;">${hrBarsHTML}</div>
        <div style="font-size:9px;color:#94a3b8;margin-top:6px;text-align:center;">الأرقام = ساعة اليوم &nbsp;|&nbsp; العمود الأصفر = ذروة الإيرادات</div>
      </div>

      <!-- Top 3 -->
      <div style="padding:14px 20px 18px;">
        <div style="font-size:12px;font-weight:700;color:#374151;margin-bottom:10px;">🏆 أفضل 3 ساعات</div>
        ${top3Rows}
      </div>
    </div>

    <!-- Expenses -->
    ${filteredEx.length > 0 ? `
    <div class="section-card">
      <div class="section-head head-red">💸 سجل المصاريف</div>
      <table>
        <thead style="background:linear-gradient(135deg,#dc2626,#ef4444);">
          <tr><th>التاريخ</th><th>النوع</th><th>ملاحظات</th><th style="text-align:left;">المبلغ</th></tr>
        </thead>
        <tbody>${expRows}</tbody>
      </table>
      <div style="padding:10px 14px;background:#fff8f8;border-top:1px solid #fee2e2;text-align:left;font-weight:700;color:#dc2626;direction:ltr;">
        المجموع: ${totalEx.toFixed(0)} دج
      </div>
    </div>` : ''}

    <!-- Fixed Costs -->
    ${FIXED_COSTS.length > 0 ? `
    <div class="section-card">
      <div class="section-head" style="background:linear-gradient(135deg,#0f766e,#14b8a6);">⚙️ التكاليف الثابتة (حصة الفترة)</div>
      <table>
        <thead style="background:linear-gradient(135deg,#0f766e,#14b8a6);">
          <tr><th>التكلفة</th><th style="text-align:center;">الدورة</th><th style="text-align:left;">حصة الفترة (${diffDays} يوم)</th></tr>
        </thead>
        <tbody>
          ${FIXED_COSTS.map((c,i)=>`
            <tr style="border-bottom:1px solid #e8ecf0; background:${i%2===0?'#ffffff':'#f0fdfa'};">
              <td style="padding:10px 14px;font-weight:600;color:#1e293b;">${c.name}</td>
              <td style="padding:10px 14px;text-align:center;color:#475569;">${getFixedCostPeriodLabel(c).split('(')[0].trim()}</td>
              <td style="padding:10px 14px;text-align:left;color:#0f766e;font-weight:700;direction:ltr;">${(getDailyFixedCost(c)*diffDays).toFixed(0)} دج</td>
            </tr>`).join('')}
        </tbody>
      </table>
      <div style="padding:10px 14px;background:#f0fdfa;border-top:1px solid #99f6e4;text-align:left;font-weight:700;color:#0f766e;direction:ltr;">
        المجموع: ${totalFixed.toFixed(0)} دج
      </div>
    </div>` : ''}

  </div>

  <!-- Footer -->
  <div class="footer">
    <div>تم إنشاء هذا التقرير بواسطة <strong>GG Control</strong></div>
    <div>${now.toLocaleString('ar-DZ')}</div>
  </div>

</div>
</body>
</html>`;

  // ── Render via html2pdf ─────────────────────────────────────
  const container = document.createElement('div');
  container.innerHTML = html;
  container.style.position = 'absolute';
  container.style.left     = '-9999px';
  container.style.top      = '0';
  document.body.appendChild(container);

  const opt = {
    margin:      0,
    filename:    `تقرير-GG-Control-${now.toISOString().slice(0,10)}.pdf`,
    image:       { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true, windowWidth: 794, logging: false },
    jsPDF:       { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(container).save().then(() => {
    showToast('✅ تم حفظ التقرير بنجاح!', 'success');
    document.body.removeChild(container);
  }).catch(err => {
    console.error(err);
    showToast('حدث خطأ أثناء الحفظ.', 'error');
    document.body.removeChild(container);
  });
}



// ================= ACTIVITY LOG =================
function renderActivityLog() {
  const tbody = document.getElementById('activity-log-list');
  if (!tbody) return;
  
  if (ACTIVITY_LOG.length === 0) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center; padding: 20px;">لا توجد نشاطات مسجلة</td></tr>';
    return;
  }
  
  tbody.innerHTML = ACTIVITY_LOG.map(log => {
    const d = new Date(log.date);
    const dateStr = formatCustomDateTime(d);
    return `
      <tr style="border-bottom: 1px solid var(--border-color);">
        <td style="padding: 15px; direction: ltr; text-align: right;">${dateStr}</td>
        <td style="padding: 15px; font-weight: bold; color: var(--primary);">${log.action}</td>
        <td style="padding: 15px;">${log.details}</td>
      </tr>
    `;
  }).join('');
}

// ================= ADMIN DASHBOARD =================
let isAdminAuthenticated = false;

function promptAdminAuth() {
  if (isAdminAuthenticated || !ADMIN_SETTINGS.isPinEnabled) {
    switchTab('admin');
  } else {
    document.getElementById('admin-pin-input').value = '';
    document.getElementById('admin-pin-error').style.display = 'none';
    openModal('modal-admin-auth');
  }
}

function verifyAdminPin() {
  const input = document.getElementById('admin-pin-input').value;
  if (input === ADMIN_SETTINGS.pin) {
    isAdminAuthenticated = true;
    closeModal('modal-admin-auth');
    switchTab('admin');
    logActivity('دخول الإدارة', 'تم تسجيل الدخول للوحة الإدارة بنجاح');
  } else {
    document.getElementById('admin-pin-error').style.display = 'block';
  }
}

function renderAdminDashboard() {
  const todayStr = new Date().toDateString();
  const todayExpensesItems = EXPENSES.filter(e => new Date(e.date).toDateString() === todayStr);
  const totalExpensesOneOff = todayExpensesItems.reduce((sum, exp) => sum + exp.amount, 0);
  const dailyFixedCostsTotal = FIXED_COSTS.reduce((sum, c) => sum + getDailyFixedCost(c), 0);
  const todayBuffetCogs = TRANSACTIONS.filter(t => new Date(t.date).toDateString() === todayStr).reduce((sum, t) => sum + (t.buffetCogs || 0), 0);
  const totalExpensesCombined = totalExpensesOneOff + dailyFixedCostsTotal + todayBuffetCogs;

  // 1. Calculate Expenses
  document.getElementById('admin-total-expenses').textContent = totalExpensesCombined.toFixed(0) + ' دج';
  
  // 2. Render Expenses Table
  const expensesTbody = document.getElementById('admin-expenses-list');
  if (EXPENSES.length === 0) {
    expensesTbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding: 10px;">لا توجد مصاريف</td></tr>';
  } else {
    expensesTbody.innerHTML = EXPENSES.map(exp => {
      const d = new Date(exp.date);
      const dateStr = formatCustomDate(d);
      const fileBtn = exp.filePath 
        ? `<button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openAttachedInvoice('${exp.filePath.replace(/\\/g, '/')}')">عرض 📄</button>`
        : '<span style="color:var(--text-muted)">-</span>';
      return `
        <tr style="border-bottom: 1px solid var(--border-color);">
          <td style="padding: 10px; direction: ltr; text-align: right;">${dateStr}</td>
          <td style="padding: 10px;">${exp.type}</td>
          <td style="padding: 10px; color: var(--red); font-weight: bold;">${exp.amount.toFixed(0)} دج</td>
          <td style="padding: 10px;">${exp.notes || '-'}</td>
          <td style="padding: 10px; text-align: center;">${fileBtn}</td>
        </tr>
      `;
    }).join('');
  }

  // 3. Calculate Debts
  let totalDebts = 0;
  let suppliersHtml = '';
  if (SUPPLIERS.length === 0) {
    suppliersHtml = '<tr><td colspan="5" style="text-align:center; padding: 10px;">لا يوجد ديون/موردين</td></tr>';
  } else {
    suppliersHtml = SUPPLIERS.map(s => {
      const rem = s.totalDebt - s.paid;
      totalDebts += rem;
      return `
        <tr style="border-bottom: 1px solid var(--border-color); cursor: pointer;" onclick="viewSupplierHistory('${s.id}')">
          <td style="padding: 10px; font-weight: bold; color: var(--primary);">${s.name}</td>
          <td style="padding: 10px; text-align: right;">${s.totalDebt.toFixed(0)} دج</td>
          <td style="padding: 10px; color: var(--green); text-align: right;">${s.paid.toFixed(0)} دج</td>
          <td style="padding: 10px; color: var(--warning); font-weight: bold; text-align: right;">${rem.toFixed(0)} دج</td>
          <td style="padding: 10px; text-align: center;" onclick="event.stopPropagation()">
            <button class="btn-primary" style="padding: 5px 10px; font-size: 0.8rem;" onclick="showPaySupplierModal('${s.id}')">تسديد</button>
          </td>
        </tr>
      `;
    }).join('');
  }
  document.getElementById('admin-total-debts').textContent = totalDebts.toFixed(0) + ' دج';
  document.getElementById('admin-suppliers-list').innerHTML = suppliersHtml;

  // 4. Net Profit & Revenue card population
  const revEl = document.getElementById('admin-total-revenue');
  if (revEl) revEl.textContent = STATE.dailyRevenue.toFixed(0) + ' دج';

  const netProfit = STATE.dailyRevenue - totalExpensesCombined;
  const profitEl = document.getElementById('admin-net-profit');
  profitEl.textContent = netProfit.toFixed(0) + ' دج';
  profitEl.style.background = 'none';
  if (netProfit >= 0) {
    profitEl.style.webkitTextFillColor = 'var(--green)';
    profitEl.style.color = 'var(--green)';
  } else {
    profitEl.style.webkitTextFillColor = 'var(--red)';
    profitEl.style.color = 'var(--red)';
  }

  // 5. Render Fixed Costs List
  const fcList = document.getElementById('admin-fixed-costs-list');
  if (fcList) {
    fcList.innerHTML = FIXED_COSTS.map(c => `
      <div style="display:flex; justify-content:space-between; align-items:center; background:rgba(255,255,255,0.02); padding:8px 12px; border-radius:6px; border:1px solid rgba(255,255,255,0.05); margin-bottom:8px;">
        <span style="color:white; font-weight:bold;">${c.name}</span>
        <div style="display:flex; align-items:center; gap:10px;">
          <span style="color:var(--text-muted); font-size:0.9rem;">${getFixedCostPeriodLabel(c)}</span>
          <button onclick="deleteFixedCost('${c.id}')" style="background:rgba(239,68,68,0.2); border:none; color:var(--red); padding:3px 8px; border-radius:4px; cursor:pointer;">حذف</button>
        </div>
      </div>
    `).join('') || '<div style="color:var(--text-muted); text-align:center; padding:10px;">لا توجد تكاليف ثابتة مسجلة حالياً.</div>';
  }
}

// EXPENSES LOGIC
function showAddExpenseModal() {
  document.getElementById('expense-type').value = 'رواتب';
  document.getElementById('expense-amount').value = '';
  document.getElementById('expense-notes').value = '';
  openModal('modal-add-expense');
}

function saveExpense() {
  const type = document.getElementById('expense-type').value;
  const amount = parseFloat(document.getElementById('expense-amount').value) || 0;
  const notes = document.getElementById('expense-notes').value;
  
  if (amount <= 0) {
    showToast('الرجاء إدخال مبلغ صحيح', 'error');
    return;
  }
  
  EXPENSES.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type,
    amount,
    notes
  });
  
  closeModal('modal-add-expense');
  logActivity('إضافة مصروف', `تم صرف مبلغ ${amount} دج، نوع: ${type}`);
  renderAdminDashboard();
  showToast('تمت إضافة المصروف بنجاح!', 'success');
}

// SUPPLIERS LOGIC
function showAddSupplierModal() {
  document.getElementById('supplier-name').value = '';
  document.getElementById('supplier-debt').value = '';
  document.getElementById('supplier-paid').value = '';
  openModal('modal-add-supplier');
}

function saveSupplier() {
  const name = document.getElementById('supplier-name').value;
  const debt = parseFloat(document.getElementById('supplier-debt').value) || 0;
  const paid = parseFloat(document.getElementById('supplier-paid').value) || 0;
  
  if (!name) {
    showToast('الرجاء إدخال اسم المورد', 'error');
    return;
  }
  
  const newSup = {
    id: Date.now().toString(),
    name,
    totalDebt: debt,
    paid: paid,
    invoices: [],
    payments: []
  };
  if (debt > 0) {
    newSup.invoices.push({
      id: 'init-' + Date.now(),
      ref: 'رصيد افتتاحي',
      date: new Date().toISOString(),
      totalAmount: debt,
      paidAmount: paid,
      items: [],
      notes: 'رصيد افتتاحي عند إنشاء المورد'
    });
    if (paid > 0) {
      newSup.payments.push({
        id: 'init-pay-' + Date.now(),
        date: new Date().toISOString(),
        amount: paid,
        notes: 'دفعة افتتاحية'
      });
    }
  }
  SUPPLIERS.push(newSup);
  
  closeModal('modal-add-supplier');
  logActivity('إضافة مورد/دين', `مورد جديد: ${name}، الدين: ${debt} دج`);
  renderAdminDashboard();
  showToast('تم حفظ المورد بنجاح!', 'success');
}

function showPaySupplierModal(id) {
  const s = SUPPLIERS.find(x => x.id === id);
  if (!s) return;
  
  const rem = s.totalDebt - s.paid;
  if (rem <= 0) {
    showToast('هذا المورد خالص الديون!', 'info');
    return;
  }
  
  document.getElementById('pay-supplier-id').value = id;
  document.getElementById('pay-supplier-rem').textContent = rem.toFixed(0);
  document.getElementById('pay-supplier-amount').value = '';
  openModal('modal-pay-supplier');
}

function confirmPaySupplier() {
  const id = document.getElementById('pay-supplier-id').value;
  const amount = parseFloat(document.getElementById('pay-supplier-amount').value) || 0;
  
  if (amount <= 0) {
    showToast('الرجاء إدخال مبلغ صحيح', 'error');
    return;
  }
  
  const s = SUPPLIERS.find(x => x.id === id);
  if (!s) return;
  
  const rem = s.totalDebt - s.paid;
  if (amount > rem) {
    showToast('المبلغ المدفوع أكبر من المتبقي!', 'warning');
    return;
  }
  
  s.paid += amount;
  if (!s.payments) s.payments = [];
  s.payments.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    amount: amount,
    notes: 'تسديد دين نقداً'
  });
  
  // Also optionally add to expenses automatically? Let's just consider supplier payments as part of debts, but it IS cash outflow.
  // We will register it as an Expense as well to balance net profit accurately!
  EXPENSES.push({
    id: Date.now().toString(),
    date: new Date().toISOString(),
    type: 'دفع مورد',
    amount: amount,
    notes: `تسديد دفعة للمورد: ${s.name}`
  });
  
  closeModal('modal-pay-supplier');
  logActivity('تسديد دين مورد', `دفع ${amount} دج للمورد: ${s.name}`);
  renderAdminDashboard();
  showToast('تمت إضافة الدفعة بنجاح!', 'success');
}


// ================= MISSING DEVICE MANAGEMENT FUNCTIONS =================

function toggleDeviceDurationField() {
  const typeSelect = document.getElementById('input-dev-pricing-type');
  const durationField = document.getElementById('div-dev-duration');
  const labelPrice = document.getElementById('label-dev-price');
  const labelPrice4 = document.getElementById('label-dev-price4');
  
  if (typeSelect && typeSelect.value === 'match') {
    if (durationField) durationField.style.display = 'none';
    if (labelPrice) labelPrice.textContent = 'مباراة ثنائي (دج)';
    if (labelPrice4) labelPrice4.textContent = 'مباراة رباعي (دج)';
  } else {
    if (durationField) durationField.style.display = 'block';
    if (labelPrice) labelPrice.textContent = 'سعر ثنائي (دج)';
    if (labelPrice4) labelPrice4.textContent = 'سعر رباعي (دج)';
  }
}

function incrementCheckoutMatches() {
  const input = document.getElementById('checkout-match-count');
  if (!input) return;
  let matches = parseInt(input.value) || 1;
  matches++;
  input.value = matches;
  updateCheckoutMatchCost(matches);
}

function decrementCheckoutMatches() {
  const input = document.getElementById('checkout-match-count');
  if (!input) return;
  let matches = parseInt(input.value) || 1;
  if (matches > 1) {
    matches--;
    input.value = matches;
    updateCheckoutMatchCost(matches);
  }
}

function updateCheckoutMatchCost(matches) {
  const dev = DEVICES.find(d => d.id == checkoutSessionId);
  if (!dev) return;
  const sess = sessions[checkoutSessionId];
  if (sess) sess.matchCount = matches;
  const mode = sess ? (sess.playersMode || 'double') : 'double';
  const pricePerMatch = getDeviceHourlyRate(dev, mode, 'match');
  const rawCost = matches * pricePerMatch;
  STATE.checkoutSessionCost = roundToNearest5(rawCost);
  
  const costVal = document.getElementById('checkout-session-cost-val');
  if (costVal) {
    costVal.textContent = STATE.checkoutSessionCost.toFixed(2) + ' دج';
  }
  renderCheckoutBill(STATE.checkoutSessionCost);
}

function setSessionPlayersMode(mode, devId) {
  STATE.selectedPlayersMode = mode;
  renderDeviceDetail(devId);
}

function setSessionPricingType(type, devId) {
  STATE.selectedPricingType = type;
  renderDeviceDetail(devId);
}

function incrementActiveSessionMatches(devId) {
  const sess = sessions[devId];
  if (!sess) return;
  if (!sess.matchCount) sess.matchCount = 1;
  sess.matchCount++;
  renderDeviceDetail(devId);
}

function decrementActiveSessionMatches(devId) {
  const sess = sessions[devId];
  if (!sess) return;
  if (!sess.matchCount) sess.matchCount = 1;
  if (sess.matchCount > 1) {
    sess.matchCount--;
    renderDeviceDetail(devId);
  }
}

function changeCheckoutPlayersMode(mode) {
  const sess = sessions[checkoutSessionId];
  if (!sess) return;
  sess.playersMode = mode;
  endSession(false);
}

function changeCheckoutPricingType(type) {
  const sess = sessions[checkoutSessionId];
  if (!sess) return;
  sess.pricingType = type;
  endSession(false);
}

function openAddDeviceModal() {
  document.getElementById('edit-dev-id').value = '';
  document.getElementById('modal-device-title').innerText = 'إضافة جهاز جديد';
  document.getElementById('modal-device-btn').innerText = 'إضافة الجهاز';
  document.getElementById('input-dev-name').value = '';
  document.getElementById('input-dev-type').value = 'PlayStation';
  document.getElementById('input-dev-zone').value = '';
  document.getElementById('input-dev-price-time-double').value = '';
  document.getElementById('input-dev-price-time-quad').value = '';
  document.getElementById('input-dev-price-match-double').value = '';
  document.getElementById('input-dev-price-match-quad').value = '';
  document.getElementById('input-dev-duration').value = '60';
  openModal('modal-add-device');
}

function saveNewDevice() {
  const editId = document.getElementById('edit-dev-id').value;
  const name = document.getElementById('input-dev-name').value.trim();
  const type = document.getElementById('input-dev-type').value;
  const zone = document.getElementById('input-dev-zone').value.trim() || 'A';
  
  const priceTimeDouble = parseFloat(document.getElementById('input-dev-price-time-double').value) || 0;
  const priceTimeQuad = parseFloat(document.getElementById('input-dev-price-time-quad').value) || 0;
  const priceMatchDouble = parseFloat(document.getElementById('input-dev-price-match-double').value) || 0;
  const priceMatchQuad = parseFloat(document.getElementById('input-dev-price-match-quad').value) || 0;
  const duration = parseInt(document.getElementById('input-dev-duration').value) || 60;
  
  if (!name) {
    showToast('الرجاء إدخال اسم الجهاز', 'error');
    return;
  }
  
  const icons = { 'PlayStation': '🎮', 'PC': '🖥', 'VR': '🥽', 'Billiards': '🎱', 'Nintendo': '🕹' };
  
  if (editId) {
    const dev = DEVICES.find(d => d.id == editId);
    if (dev) {
      dev.name = name;
      dev.type = type;
      dev.zone = zone;
      dev.icon = icons[type] || '🎮';
      dev.priceTimeDouble = priceTimeDouble > 0 ? priceTimeDouble : undefined;
      dev.priceTimeQuad = priceTimeQuad > 0 ? priceTimeQuad : undefined;
      dev.priceMatchDouble = priceMatchDouble > 0 ? priceMatchDouble : undefined;
      dev.priceMatchQuad = priceMatchQuad > 0 ? priceMatchQuad : undefined;
      dev.defaultDuration = duration;
      showToast('تم تحديث الجهاز!', 'success');
    }
  } else {
    const newId = DEVICES.length > 0 ? Math.max(...DEVICES.map(d => parseInt(d.id) || 0)) + 1 : 1;
    DEVICES.push({
      id: newId,
      name: name,
      type: type,
      icon: icons[type] || '🎮',
      zone: zone,
      priceTimeDouble: priceTimeDouble > 0 ? priceTimeDouble : undefined,
      priceTimeQuad: priceTimeQuad > 0 ? priceTimeQuad : undefined,
      priceMatchDouble: priceMatchDouble > 0 ? priceMatchDouble : undefined,
      priceMatchQuad: priceMatchQuad > 0 ? priceMatchQuad : undefined,
      defaultDuration: duration
    });
    logActivity('إضافة جهاز', 'تم إضافة جهاز جديد: ' + name);
    showToast('تم إضافة الجهاز بنجاح!', 'success');
  }
  
  saveData();
  closeModal('modal-add-device');
  renderDevicesGrid();
  renderDevicesManagement();
}

function filterManagementDevices(type, btn) {
  document.querySelectorAll('#tab-devices .filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  
  const container = document.getElementById('devices-management-grid');
  if (!container) return;
  
  const filtered = type === 'all' ? DEVICES : DEVICES.filter(d => d.type === type);
  
  container.innerHTML = filtered.map(dev => {
    const status = getDeviceStatus(dev.id);
    const sess = sessions[dev.id];
    let sBadge = 'available', sText = 'متوفر';
    if (status === 'busy') { sBadge = 'busy'; sText = 'مشغول'; }
    if (status === 'ending') { sBadge = 'ending'; sText = 'يوشك'; }
    return `
      <div class="dev-manage-card">
        <div class="dev-manage-icon">${dev.icon}</div>
        <div class="dev-manage-info">
          <div class="dev-manage-name">${dev.name}</div>
          <div class="dev-manage-type">${dev.type} • منطقة ${dev.zone}</div>
          <span class="dev-manage-status ${sBadge}">⬤ ${sText}${sess ? ' — ' + sess.player + ' (' + getTimerString(dev.id) + ')' : ''}</span>
          <div class="dev-manage-rate">💰 ${dev.pricingType === 'match' ? ((dev.customPrice || 70) + ' دج / مباراة') : (dev.customPrice ? (dev.customPrice + ' دج / ' + (dev.defaultDuration || 60) + ' دقيقة') : (STATE.pricePerHour + ' دج / ساعة'))}</div>
        </div>
      </div>`;
  }).join('');
  
  if (filtered.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted); grid-column: 1/-1;">لا توجد أجهزة من هذا النوع</div>';
  }
}


// ================= ADD PRODUCT FUNCTIONS =================

function openAddItemModal() {
  document.getElementById('edit-prod-id').value = '';
  document.getElementById('modal-product-title').innerText = 'إضافة منتج جديد';
  document.getElementById('modal-product-btn').innerText = 'إضافة المنتج';
  document.getElementById('input-prod-name').value = '';
  document.getElementById('input-prod-cat').value = 'snacks';
  document.getElementById('input-prod-buy-price').value = '';
  document.getElementById('input-prod-price').value = '';
  document.getElementById('input-prod-stock').value = '';
  document.getElementById('input-prod-min-stock').value = '5';
  document.getElementById('input-prod-image').value = '';
  openModal('modal-add-product');
}

async function saveNewProduct() {
  try {
    const editId = document.getElementById('edit-prod-id').value;
    const name = document.getElementById('input-prod-name').value.trim();
    const cat = document.getElementById('input-prod-cat').value;
    const buyPrice = parseFloat(document.getElementById('input-prod-buy-price').value) || 0;
    const price = parseFloat(document.getElementById('input-prod-price').value) || 0;
    const stock = parseInt(document.getElementById('input-prod-stock').value) || 0;
    const minStock = parseInt(document.getElementById('input-prod-min-stock').value) || 5;
    const imageInput = document.getElementById('input-prod-image');
    
    if (!name || price < 0) {
      showToast('الرجاء إدخال اسم المنتج وسعر صالح', 'error');
      return;
    }
    
    let imagePath = '';
    if (editId) {
      const prod = MENU_ITEMS.find(p => p.id == editId);
      if (prod) imagePath = prod.image || '';
    }
    
    const newIdStr = editId || ('m' + Date.now());
    
    // File API via FileReader
    if (imageInput && imageInput.files && imageInput.files[0]) {
      const file = imageInput.files[0];
      const ext = file.name.split('.').pop() || 'png';
      const destName = newIdStr + '.' + ext;
      const destPath = pathNode.join(assetsDir, destName);
      
      try {
        if (file.path) {
          fsNode.copyFileSync(file.path, destPath);
          imagePath = 'assets/' + destName;
        } else {
          // Fallback to FileReader if file.path is not available
          const buffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(Buffer.from(e.target.result));
            reader.onerror = e => reject(e);
            reader.readAsArrayBuffer(file);
          });
          fsNode.writeFileSync(destPath, buffer);
          imagePath = 'assets/' + destName;
        }
      } catch(e) {
        console.error('Image save error:', e);
      }
    }
    
    if (editId) {
      const prod = MENU_ITEMS.find(p => p.id == editId);
      if (prod) {
        prod.name = name; prod.cat = cat; prod.price = price; prod.buyPrice = buyPrice; prod.stock = stock; prod.minStock = minStock;
        if (imagePath) prod.image = imagePath;
        showToast('تم تحديث المنتج!', 'success');
      }
    } else {
      MENU_ITEMS.push({
        id: newIdStr, name: name, price: price, buyPrice: buyPrice, image: imagePath, cat: cat, stock: stock, minStock: minStock
      });
      logActivity('إضافة منتج', 'تم إضافة منتج جديد: ' + name);
      showToast('تم إضافة المنتج بنجاح!', 'success');
    }
    
    saveData();
    closeModal('modal-add-product');
    renderInventoryGrid();
  } catch(e) {
    alert('خطأ في إضافة المنتج: ' + e.message + '\n' + e.stack);
  }
}

function editDevice(id) {
  const dev = DEVICES.find(d => d.id == id);
  if (!dev) return;
  document.getElementById('edit-dev-id').value = dev.id;
  document.getElementById('modal-device-title').innerText = 'تعديل الجهاز';
  document.getElementById('modal-device-btn').innerText = 'حفظ التعديلات';
  document.getElementById('input-dev-name').value = dev.name;
  document.getElementById('input-dev-type').value = dev.type;
  document.getElementById('input-dev-zone').value = dev.zone || '';
  document.getElementById('input-dev-price-time-double').value = dev.priceTimeDouble || dev.customPrice || '';
  document.getElementById('input-dev-price-time-quad').value = dev.priceTimeQuad || dev.price4Players || '';
  document.getElementById('input-dev-price-match-double').value = dev.priceMatchDouble || '';
  document.getElementById('input-dev-price-match-quad').value = dev.priceMatchQuad || '';
  document.getElementById('input-dev-duration').value = dev.defaultDuration || 60;
  openModal('modal-add-device');
}

function deleteDevice(id) {
  if (confirm('هل أنت متأكد من حذف هذا الجهاز؟ لا يمكن التراجع عن هذه العملية.')) {
    DEVICES = DEVICES.filter(d => d.id != id);
    saveData();
    renderDevicesGrid();
    renderDevicesManagement();
    showToast('تم حذف الجهاز', 'success');
  }
}

function editProduct(id) {
  const prod = MENU_ITEMS.find(p => p.id == id);
  if (!prod) return;
  document.getElementById('edit-prod-id').value = prod.id;
  document.getElementById('modal-product-title').innerText = 'تعديل المنتج';
  document.getElementById('modal-product-btn').innerText = 'حفظ التعديلات';
  document.getElementById('input-prod-name').value = prod.name;
  document.getElementById('input-prod-cat').value = prod.cat;
  document.getElementById('input-prod-buy-price').value = prod.buyPrice || 0;
  document.getElementById('input-prod-price').value = prod.price;
  document.getElementById('input-prod-stock').value = prod.stock || 0;
  document.getElementById('input-prod-min-stock').value = prod.minStock || 5;
  document.getElementById('input-prod-image').value = ''; // Cannot prepopulate file input
  openModal('modal-add-product');
}

function deleteProduct(id) {
  if (confirm('هل أنت متأكد من حذف هذا المنتج؟')) {
    MENU_ITEMS = MENU_ITEMS.filter(p => p.id != id);
    saveData();
    renderInventoryGrid();
    showToast('تم حذف المنتج', 'success');
  }
}

function renderDevicesManagement() {
  const container = document.getElementById('devices-management-grid');
  if (!container) return;
  
  if (DEVICES.length === 0) {
    container.innerHTML = '<div style="text-align:center; padding:60px; color:var(--text-muted); grid-column:1/-1; font-size:1.1rem;">لا توجد أجهزة مسجلة. اضغط على "+ إضافة جهاز" لإضافة جهاز جديد.</div>';
    return;
  }
  
  container.innerHTML = DEVICES.map(dev => {
    const status = getDeviceStatus(dev.id);
    const sess = sessions[dev.id];
    let sBadge = 'available', sText = 'متوفر';
    if (status === 'busy') { sBadge = 'busy'; sText = 'مشغول'; }
    if (status === 'ending') { sBadge = 'ending'; sText = 'يوشك'; }
    const timerStr = sess ? ' — ' + (sess.player || '') + ' (' + getTimerString(dev.id) + ')' : '';
    return `
      <div class="dev-manage-card" style="position:relative;">
        <div style="position:absolute; top:10px; left:10px; display:flex; gap:5px; z-index:10;">
          <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; border-radius:4px; border:none; background:rgba(255,255,255,0.1); color:white;" onclick="editDevice('${dev.id}')">✏️</button>
          <button class="btn-danger" style="padding:4px 8px; font-size:0.8rem; border-radius:4px; background:var(--red-dim); color:var(--red); border:none;" onclick="deleteDevice('${dev.id}')">🗑️</button>
        </div>
        <div class="dev-manage-icon">${dev.icon || '🎮'}</div>
        <div class="dev-manage-info">
          <div class="dev-manage-name">${dev.name}</div>
          <div class="dev-manage-type">${dev.type} • منطقة ${dev.zone || 'A'}</div>
          <span class="dev-manage-status ${sBadge}">⬤ ${sText}${timerStr}</span>
          <div class="dev-manage-rate">💰 ${dev.pricingType === 'match' ? ((dev.customPrice || 70) + ' دج / مباراة') : (dev.customPrice ? (dev.customPrice + ' دج / ' + (dev.defaultDuration || 60) + ' دقيقة') : (STATE.pricePerHour + ' دج / ساعة'))}</div>
        </div>
      </div>`;
  }).join('');
  
  if (typeof renderMaintenanceLog === 'function') {
    renderMaintenanceLog();
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast toast-' + type;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'slideOut 0.3s ease-in forwards';
    setTimeout(() => { if(container.contains(toast)) container.removeChild(toast); }, 300);
  }, 3000);
}


// ==================== GLOBAL TIMER LOOP ====================
setInterval(() => {
  if (typeof updateClock === 'function') updateClock();
  
  const activeTab = document.querySelector('.tab-content.active')?.id;
  
  if (activeTab === 'tab-dashboard') {
    if (typeof renderDevicesGrid === 'function') renderDevicesGrid();
    if (typeof STATE !== 'undefined' && STATE.selectedDeviceId && typeof selectDevice === 'function') {
      selectDevice(STATE.selectedDeviceId);
    }
  } else if (activeTab === 'tab-devices') {
    if (typeof renderDevicesManagement === 'function') renderDevicesManagement();
  }
}, 1000);

if (typeof updateClock === 'function') updateClock();


function openDirectSaleModal() {
  const modalHeader = document.querySelector('#modal-order h3');
  if (modalHeader) {
    modalHeader.innerHTML = `🛒 إضافة طلب للبوفيه (بيع مباشر)`;
  }
  STATE.selectedDeviceId = null;
  STATE.isDirectSale = true;
  STATE.currentOrder = {};
  renderMenuGrid('all');
  renderCurrentOrder();
  openModal('modal-order');
}


// ==================== SETTINGS ====================
function renderSettings() {
  const container = document.getElementById('settings-sections');
  if (!container) return;
  
  container.innerHTML = `
    <div class="settings-grid">
      <!-- Right Column: Pricing Settings + Remote Updates -->
      <div style="display: flex; flex-direction: column; gap: 24px; width: 100%;">
        
        <!-- Pricing Settings Card -->
        <div style="background: var(--bg-card); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); width: 100%;">
          <!-- Card Header -->
          <div style="padding: 20px 25px; background: linear-gradient(135deg, rgba(168,85,247,0.15), rgba(6,182,212,0.08)); border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; background:linear-gradient(135deg,var(--purple),#7c3aed); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; box-shadow: 0 4px 10px rgba(168,85,247,0.25);">⚙️</div>
            <div>
              <div style="font-size:1.05rem; font-weight:700; color:#fff;">إعدادات التسعير العامة</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">التحكم في سعر الساعة الافتراضي للعب وتقريب المبالغ</div>
            </div>
          </div>
          <!-- Card Body -->
          <div style="padding: 25px;">
            <div class="form-group" style="margin-bottom: 20px;">
              <label style="display: block; margin-bottom: 8px; color: var(--text-muted); font-weight: 600; font-size: 0.85rem;">سعر الساعة الافتراضي (دج)</label>
              <input type="number" id="input-global-price" class="form-input" value="${STATE.pricePerHour || 200}" style="width: 100%; padding: 12px; font-size: 1.1rem; background: rgba(255,255,255,0.03); border: 1px solid var(--border-color); color: #fff; border-radius: 8px; transition: border-color 0.2s;">
              <div style="font-size: 0.82rem; color: var(--text-muted); margin-top: 8px; line-height: 1.4;">سيتم تطبيق هذا السعر على الأجهزة التي لا تملك تسعيرة خاصة (كالبلياردو أو أجهزة الـ VIP).</div>
            </div>
            
            <div class="form-group" style="margin-bottom: 12px; display: flex; align-items: center; gap: 10px;">
              <input type="checkbox" id="input-global-rounding" style="width: 20px; height: 20px; cursor: pointer; accent-color: var(--purple);" ${ADMIN_SETTINGS.enableRounding ? 'checked' : ''}>
              <label for="input-global-rounding" style="color: #fff; cursor: pointer; font-size: 0.95rem; font-weight: 600; user-select: none;">تفعيل التقريب التلقائي للمبالغ (لأقرب 5 دج)</label>
            </div>
            <div style="font-size: 0.82rem; color: var(--text-muted); margin-bottom: 24px; line-height: 1.4;">سيتم تقريب مبالغ الجلسات تلقائياً لأقرب 5 دج لتسهيل المعاملات النقدية في الجزائر (مثال: 183 دج تصبح 185 دج).</div>
            
            <button class="btn-primary" onclick="saveGlobalSettings()" style="width: 100%; padding: 12px; font-size: 1.1rem; border-radius: 8px; background: linear-gradient(135deg, var(--purple), #7c3aed); border: none; font-weight: 600; cursor: pointer; transition: transform 0.2s; box-shadow: 0 4px 15px rgba(168,85,247,0.3);">💾 حفظ الإعدادات</button>
          </div>
        </div>

        <!-- Remote Update Card -->
        <div style="background: var(--bg-card); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); width: 100%;">
          <!-- Card Header -->
          <div style="padding: 20px 25px; background: linear-gradient(135deg, rgba(99,102,241,0.15), rgba(6,182,212,0.08)); border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:12px;">
            <div style="width:42px; height:42px; background:linear-gradient(135deg,#4f46e5,#6366f1); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; box-shadow: 0 4px 10px rgba(99,102,241,0.25);">🚀</div>
            <div>
              <div style="font-size:1.05rem; font-weight:700; color:#fff;">التحديثات التلقائية وعن بُعد</div>
              <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">تحقق تلقائي • تحديث بضغطة زر • نسخ احتياطي أوتوماتيكي قبل التحديث</div>
            </div>
          </div>
          <!-- Card Body -->
          <div style="padding: 25px;" id="update-section-content">
            <div style="text-align:center; padding:30px; color:var(--text-muted);">جاري تحميل معلومات التحديث...</div>
          </div>
        </div>

      </div>

      <!-- Left Column: Backup & Restore Card -->
      <div style="background: var(--bg-card); border-radius: 16px; overflow: hidden; box-shadow: 0 8px 32px rgba(0,0,0,0.3); border: 1px solid rgba(255,255,255,0.08); width: 100%;">
        <!-- Card Header -->
        <div style="padding: 20px 25px; background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(6,182,212,0.08)); border-bottom: 1px solid rgba(255,255,255,0.08); display:flex; align-items:center; gap:12px;">
          <div style="width:42px; height:42px; background:linear-gradient(135deg,var(--green),#065f46); border-radius:10px; display:flex; align-items:center; justify-content:center; font-size:1.3rem; flex-shrink:0; box-shadow: 0 4px 10px rgba(16,185,129,0.25);">💾</div>
          <div>
            <div style="font-size:1.05rem; font-weight:700; color:#fff;">النسخ الاحتياطي واستعادة البيانات</div>
            <div style="font-size:0.8rem; color:var(--text-muted); margin-top:2px;">حفظ تلقائي كل ساعة • نسخة يومية عند بدء التشغيل • حفظ يدوي فوري</div>
          </div>
        </div>
        <!-- Card Body -->
        <div style="padding: 25px;" id="backup-section-content">
          <div style="text-align:center; padding:30px; color:var(--text-muted);">جاري تحميل بيانات النسخ الاحتياطية...</div>
        </div>
      </div>
    </div>
  `;

  // Populate sections after render
  setTimeout(renderBackupSection, 50);
  setTimeout(renderUpdateSection, 100);
}


function saveGlobalSettings() {
  const price = parseFloat(document.getElementById('input-global-price').value);
  const enableRounding = document.getElementById('input-global-rounding').checked;
  if (!isNaN(price) && price >= 0) {
    STATE.pricePerHour = price;
    ADMIN_SETTINGS.enableRounding = enableRounding;
    saveData();
    showToast('تم حفظ الإعدادات بنجاح!', 'success');
  } else {
    showToast('يرجى إدخال سعر صحيح', 'error');
  }
}

function getDailyFixedCost(c) {
  const period = c.period || 1;
  const amount = c.amount !== undefined ? c.amount : (c.monthlyAmount || 0);
  return amount / (period * 30);
}

function getFixedCostPeriodLabel(c) {
  const period = c.period || 1;
  const amount = c.amount !== undefined ? c.amount : (c.monthlyAmount || 0);
  const dailyShare = getDailyFixedCost(c);
  if (period === 1) return `${amount} دج/شهرياً (حصة اليوم: ${dailyShare.toFixed(0)} دج)`;
  if (period === 3) return `${amount} دج/كل 3 أشهر (حصة اليوم: ${dailyShare.toFixed(0)} دج)`;
  if (period === 6) return `${amount} دج/كل 6 أشهر (حصة اليوم: ${dailyShare.toFixed(0)} دج)`;
  if (period === 12) return `${amount} دج/سنوياً (حصة اليوم: ${dailyShare.toFixed(0)} دج)`;
  return `${amount} دج/كل ${period} أشهر (حصة اليوم: ${dailyShare.toFixed(0)} دج)`;
}

function addFixedCost() {
  const name = document.getElementById('input-fixed-cost-name').value.trim();
  const amount = parseFloat(document.getElementById('input-fixed-cost-amount').value) || 0;
  const period = parseInt(document.getElementById('input-fixed-cost-period').value) || 1;
  
  if (!name || amount <= 0) {
    showToast('يرجى إدخال اسم تكلفة صحيح ومبلغ أكبر من 0', 'error');
    return;
  }
  
  FIXED_COSTS.push({
    id: 'fc' + Date.now(),
    name,
    amount: amount,
    period: period
  });
  
  saveData();
  renderAdminDashboard();
  document.getElementById('input-fixed-cost-name').value = '';
  document.getElementById('input-fixed-cost-amount').value = '';
  document.getElementById('input-fixed-cost-period').value = '1';
  showToast('تم إضافة التكلفة الثابتة بنجاح!', 'success');
}

function deleteFixedCost(id) {
  if (confirm('هل تريد حذف هذه التكلفة الثابتة؟')) {
    FIXED_COSTS = FIXED_COSTS.filter(c => c.id !== id);
    saveData();
    renderAdminDashboard();
    showToast('تم حذف التكلفة الثابتة', 'success');
  }
}


function removeFromOrder(itemId) {
  if (STATE.currentOrder[itemId]) {
    STATE.currentOrder[itemId]--;
    if (STATE.currentOrder[itemId] <= 0) {
      delete STATE.currentOrder[itemId];
    }
    renderMenuGrid(currentMenuFilter);
    renderCurrentOrder();
  }
}


function confirmOrder() {
  const entries = Object.entries(STATE.currentOrder).filter(([,q]) => q > 0);
  if (entries.length === 0) {
    showToast('لم تختر أي منتج', 'warning');
    return;
  }

  let total = 0;
  entries.forEach(([id, qty]) => {
    const item = MENU_ITEMS.find(i => i.id === id);
    if (!item) return;
    
    if (STATE.isDirectSale) {
      // Direct sale: decrement stock and add to daily stats immediately
      if (item.stock !== undefined) {
        item.stock -= qty;
      }
      total += item.price * qty;
      STATE.dailyBuffetOrders += qty;
    } else {
      // Ordered for active session: save to session buffet in-memory
      const sess = sessions[STATE.selectedDeviceId];
      if (sess) {
        if (!sess.buffet) sess.buffet = [];
        const existing = sess.buffet.find(i => i.id === item.id);
        if (existing) {
          existing.qty += qty;
        } else {
          sess.buffet.push({
            id: item.id,
            name: item.name,
            price: item.price,
            qty: qty,
            icon: item.icon || '🍔',
            image: item.image || '',
            cat: item.cat || 'all'
          });
        }
      }
      total += item.price * qty;
    }
  });

  if (STATE.isDirectSale) {
    STATE.dailyRevenue = parseFloat(STATE.dailyRevenue || 0) + parseFloat(total || 0);
    
    let buffetCogs = 0;
    entries.forEach(([id, qty]) => {
      const item = MENU_ITEMS.find(i => i.id === id);
      const buyPrice = item ? (item.buyPrice || 0) : 0;
      buffetCogs += buyPrice * qty;
    });
    
    TRANSACTIONS.unshift({
      id: Date.now().toString(),
      date: new Date().toISOString(),
      type: 'بيع مباشر',
      deviceName: 'بيع مباشر 🛒',
      sessionCost: 0,
      buffetCost: total,
      buffetCogs: buffetCogs,
      total: total,
      details: `بيع مباشر: ${entries.map(([id, qty]) => {
        const item = MENU_ITEMS.find(i => i.id === id);
        return (item ? item.name : id) + ' x' + qty;
      }).join(', ')}`
    });
    logActivity('مبيعات بوفيه مباشرة', `بيع بوفيه مباشر بقيمة: ${total.toFixed(0)} دج`);
  }
  
  STATE.currentOrder  = {};
  closeModal('modal-order');
  
  if (!STATE.isDirectSale) {
    renderDevicesGrid();
    if (STATE.selectedDeviceId) {
      selectDevice(STATE.selectedDeviceId);
    }
    showToast(`🍿 تم إضافة الطلب للجلسة بنجاح — ${total.toFixed(0)} دج`, 'success');
  } else {
    showToast(`🛒 تم البيع المباشر بنجاح — ${total.toFixed(0)} دج`, 'success');
  }
  
  STATE.isDirectSale = false;
  if (typeof renderInventoryGrid === 'function') {
    renderInventoryGrid();
  }
  saveData();
}

function renderInventoryGrid() {
  const container = document.getElementById('inventory-grid');
  if (!container) return;
  container.style.display = 'grid';
  container.style.gridTemplateColumns = 'repeat(auto-fill, minmax(220px, 1fr))';
  container.style.gap = '20px';
  container.innerHTML = MENU_ITEMS.map(item => {
    let stockStatus = '';
    if (item.stock !== undefined) {
      if (item.stock <= (item.minStock || 0)) {
        stockStatus = '<div style="color:var(--red); font-size:0.8rem; font-weight:bold; margin-top:5px;">⚠️ المخزون منخفض: ' + item.stock + '</div>';
      } else {
        stockStatus = '<div style="color:var(--green); font-size:0.8rem; margin-top:5px;">متوفر: ' + item.stock + '</div>';
      }
    }
    
    let imgHtml = '<span style="font-size:3rem; color:var(--text-muted)">🍔</span>';
    if (item.image) {
      const fullPath = pathNode.join(__dirname, item.image);
      if (fsNode.existsSync(fullPath)) {
        imgHtml = '<img src="' + item.image + '?' + Date.now() + '" style="width:100%; height:120px; object-fit:contain; background:#fff; border-radius:8px; margin-bottom:10px;" />';
      }
    } else if (item.icon) {
      imgHtml = '<span style="font-size:3rem;">' + item.icon + '</span>';
    }
    
    return `
      <div class="inventory-card" style="background:var(--bg-card); padding:15px; border-radius:12px; text-align:center; position:relative; border:1px solid var(--border-color); transition:all 0.2s;" onmouseover="this.style.transform='translateY(-3px)'; this.style.borderColor='var(--primary)'" onmouseout="this.style.transform='translateY(0)'; this.style.borderColor='var(--border-color)'">
        <div style="position:absolute; top:10px; left:10px; display:flex; gap:5px; z-index:10;">
          <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; border-radius:4px; border:none; background:rgba(255,255,255,0.15); color:white; cursor:pointer;" onclick="editProduct('${item.id}')">✏️</button>
          <button class="btn-danger" style="padding:4px 8px; font-size:0.8rem; border-radius:4px; background:var(--red-dim); color:var(--red); border:none; cursor:pointer;" onclick="deleteProduct('${item.id}')">🗑️</button>
        </div>
        ${imgHtml}
        <div style="font-weight:bold; margin-top:10px;">${item.name}</div>
        <div style="color:var(--primary); font-weight:bold; margin-top:5px;">${item.price} دج</div>
        ${stockStatus}
      </div>`;
  }).join('');
}


// ==================== MODAL UTILITIES ====================
function openModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.add('open');
  }
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (modal) {
    modal.classList.remove('open');
  }
}


// ==================== PURCHASE INVOICES & SUPPLIER LEDGER ====================

function showAddInvoiceModal() {
  const supplierSelect = document.getElementById('invoice-supplier-select');
  if (!supplierSelect) return;

  // Clear inputs
  document.getElementById('invoice-ref').value = '';
  document.getElementById('invoice-date').value = new Date().toISOString().substring(0, 10);
  document.getElementById('invoice-file').value = '';
  document.getElementById('invoice-amount-paid').value = '0';
  document.getElementById('invoice-total-display').textContent = '0 دج';
  document.getElementById('invoice-status-display').textContent = 'غير مدفوعة';
  document.getElementById('invoice-status-display').style.color = 'var(--warning)';
  
  // Populate suppliers dropdown
  supplierSelect.innerHTML = SUPPLIERS.map(s => `<option value="${s.id}">${s.name}</option>`).join('');
  
  // Reset dynamic rows
  const tbody = document.getElementById('invoice-items-tbody');
  tbody.innerHTML = '';
  addInvoiceItemRow(); // Add one default row
  
  openModal('modal-add-invoice');
}

function addInvoiceItemRow() {
  try {
    const tbody = document.getElementById('invoice-items-tbody');
    if (!tbody) return;
    
    const tr = document.createElement('tr');
    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
    
    // Build product options
    const productOptions = MENU_ITEMS.map(p => `<option value="${p.id}">${p.name}</option>`).join('');
    
    tr.innerHTML = `
      <td style="padding: 12px 8px; vertical-align: middle;">
        <div class="prod-select-wrapper">
          <select class="form-input row-prod-select" onchange="onRowProductChange(this)" style="width: 100%; padding: 8px; font-size: 0.95rem;">
            ${productOptions}
            <option value="new">[ + إضافة منتج جديد غير مسجل ]</option>
          </select>
        </div>
        <div class="prod-name-wrapper" style="display: none; align-items: center; gap: 8px;">
          <input type="text" class="form-input row-new-prod-name" placeholder="اسم المنتج الجديد" style="font-size: 0.95rem; padding: 8px; background: rgba(0,0,0,0.2); border: 1px solid var(--border-color); color: #fff; border-radius: 4px; flex: 1;">
          <button class="btn-secondary" style="padding: 8px; font-size: 0.85rem; border-radius: 4px;" onclick="cancelNewProductRow(this)">رجوع</button>
        </div>
      </td>
      <td style="padding: 12px 8px; vertical-align: middle;">
        <select class="form-input row-new-prod-cat" disabled style="width: 100%; padding: 8px; font-size: 0.95rem; opacity: 0.4;">
          <option value="drinks">مشروبات (Drinks)</option>
          <option value="snacks">مأكولات خفيفة (Snacks)</option>
          <option value="sweets">حلويات (Sweets)</option>
        </select>
      </td>
      <td style="padding: 12px 8px; vertical-align: middle; text-align: center;">
        <input type="number" class="form-input row-prod-qty" value="1" min="1" oninput="calculateInvoiceTotal()" style="width: 80px; text-align: center; padding: 8px;">
      </td>
      <td style="padding: 12px 8px; vertical-align: middle;">
        <input type="number" class="form-input row-prod-price" value="0" min="0" oninput="calculateInvoiceTotal()" style="width: 120px; text-align: left; padding: 8px;">
      </td>
      <td style="padding: 12px 8px; vertical-align: middle; font-weight: bold; text-align: left; color: var(--text-main);" class="row-prod-total">
        0 دج
      </td>
      <td style="padding: 12px 8px; vertical-align: middle; text-align: center;">
        <button class="modal-close" style="color: var(--red); font-size: 1.5rem; background:none; border:none; cursor:pointer;" onclick="removeInvoiceItemRow(this)">×</button>
      </td>
    `;
    
    tbody.appendChild(tr);
    calculateInvoiceTotal();
  } catch(err) {
    console.error('Error in addInvoiceItemRow:', err);
    showToast('خطأ في إضافة سطر للمنتج: ' + err.message, 'error');
  }
}

function onRowProductChange(select) {
  try {
    const row = select.closest('tr');
    const selectWrapper = row.querySelector('.prod-select-wrapper');
    const nameWrapper = row.querySelector('.prod-name-wrapper');
    const catSelect = row.querySelector('.row-new-prod-cat');
    
    if (select.value === 'new') {
      selectWrapper.style.display = 'none';
      nameWrapper.style.display = 'flex';
      catSelect.removeAttribute('disabled');
      catSelect.style.opacity = '1';
      const nameInput = row.querySelector('.row-new-prod-name');
      if (nameInput) nameInput.focus();
      row.classList.add('is-new-product');
    } else {
      row.classList.remove('is-new-product');
    }
    calculateInvoiceTotal();
  } catch(err) {
    console.error('Error in onRowProductChange:', err);
  }
}

function cancelNewProductRow(button) {
  try {
    const row = button.closest('tr');
    const selectWrapper = row.querySelector('.prod-select-wrapper');
    const nameWrapper = row.querySelector('.prod-name-wrapper');
    const select = row.querySelector('.row-prod-select');
    const catSelect = row.querySelector('.row-new-prod-cat');
    
    nameWrapper.style.display = 'none';
    selectWrapper.style.display = 'block';
    
    // Reset select to first option (existing product)
    select.selectedIndex = 0;
    row.classList.remove('is-new-product');
    
    // Disable category select
    catSelect.setAttribute('disabled', 'true');
    catSelect.style.opacity = '0.4';
    
    calculateInvoiceTotal();
  } catch(err) {
    console.error('Error in cancelNewProductRow:', err);
  }
}

function removeInvoiceItemRow(button) {
  const row = button.closest('tr');
  row.remove();
  calculateInvoiceTotal();
}

function calculateInvoiceTotal() {
  try {
    const tbody = document.getElementById('invoice-items-tbody');
    if (!tbody) return;
    const rows = tbody.querySelectorAll('tr');
    let total = 0;
    
    rows.forEach(row => {
      const qtyEl = row.querySelector('.row-prod-qty');
      const priceEl = row.querySelector('.row-prod-price');
      const qty = qtyEl ? parseFloat(qtyEl.value) || 0 : 0;
      const price = priceEl ? parseFloat(priceEl.value) || 0 : 0;
      const rowTotal = qty * price;
      total += rowTotal;
      
      const totalEl = row.querySelector('.row-prod-total');
      if (totalEl) {
        totalEl.textContent = rowTotal.toFixed(0) + ' دج';
      }
    });
    
    const displayEl = document.getElementById('invoice-total-display');
    if (displayEl) {
      displayEl.textContent = total.toFixed(0) + ' دج';
    }
    calculateInvoiceStatus();
  } catch(err) {
    console.error('Error in calculateInvoiceTotal:', err);
  }
}

function calculateInvoiceStatus() {
  const total = parseFloat(document.getElementById('invoice-total-display').textContent) || 0;
  const paid = parseFloat(document.getElementById('invoice-amount-paid').value) || 0;
  const statusEl = document.getElementById('invoice-status-display');
  
  if (total === 0) {
    statusEl.textContent = 'غير مدفوعة';
    statusEl.style.color = 'var(--warning)';
    return;
  }
  
  if (paid >= total) {
    statusEl.textContent = 'مدفوعة بالكامل';
    statusEl.style.color = 'var(--green)';
  } else if (paid > 0) {
    statusEl.textContent = 'مدفوعة جزئياً / تسبيق';
    statusEl.style.color = 'var(--primary)';
  } else {
    statusEl.textContent = 'غير مدفوعة';
    statusEl.style.color = 'var(--warning)';
  }
}

async function saveNewInvoice() {
  try {
    const supplierId = document.getElementById('invoice-supplier-select').value;
    const ref = document.getElementById('invoice-ref').value.trim() || ('INV-' + Date.now());
    const dateStr = document.getElementById('invoice-date').value;
    const fileInput = document.getElementById('invoice-file');
    const amountPaid = parseFloat(document.getElementById('invoice-amount-paid').value) || 0;
    
    const supplier = SUPPLIERS.find(s => s.id === supplierId);
    if (!supplier) {
      showToast('الرجاء اختيار مورد', 'error');
      return;
    }
    
    const tbody = document.getElementById('invoice-items-tbody');
    const rows = tbody.querySelectorAll('tr');
    if (rows.length === 0) {
      showToast('الرجاء إضافة منتج واحد على الأقل للفاتورة', 'warning');
      return;
    }
    
    let totalAmount = 0;
    const items = [];
    
    const rowArray = Array.from(rows);
    for (let row of rowArray) {
      const prodSelect = row.querySelector('.row-prod-select');
      if (!prodSelect) continue;
      
      const prodId = prodSelect.value;
      const qty = parseFloat(row.querySelector('.row-prod-qty').value) || 0;
      const buyPrice = parseFloat(row.querySelector('.row-prod-price').value) || 0;
      
      if (row.classList.contains('is-new-product')) {
        const newNameInput = row.querySelector('.row-new-prod-name');
        const newName = newNameInput ? newNameInput.value.trim() : '';
        const newCatSelect = row.querySelector('.row-new-prod-cat');
        const newCat = newCatSelect ? newCatSelect.value : 'drinks';
        
        if (!newName) {
          showToast('الرجاء إدخال اسم المنتج الجديد', 'error');
          return;
        }
        
        // Generate new ID
        const newId = 'm' + Date.now() + Math.floor(Math.random() * 1000);
        
        // Create new item in inventory (selling price 0 initially)
        const newProduct = {
          id: newId,
          name: newName,
          price: 0,
          buyPrice: buyPrice,
          image: null,
          cat: newCat,
          stock: qty,
          minStock: 5
        };
        MENU_ITEMS.push(newProduct);
        
        items.push({
          productId: newId,
          productName: newName,
          qty: qty,
          buyPrice: buyPrice
        });
        totalAmount += qty * buyPrice;
      } else {
        const product = MENU_ITEMS.find(p => p.id === prodId);
        if (product) {
          product.buyPrice = buyPrice; // Update purchase price in inventory
          items.push({
            productId: prodId,
            productName: product.name,
            qty: qty,
            buyPrice: buyPrice
          });
          totalAmount += qty * buyPrice;
          
          // Auto-update inventory stocks
          if (product.stock !== undefined) {
            product.stock += qty;
          } else {
            product.stock = qty;
          }
        }
      }
    }
    
    // File upload handling
    let invoiceFilePath = '';
    if (fileInput && fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const ext = file.name.split('.').pop() || 'pdf';
      const destName = 'invoice_' + Date.now() + '.' + ext;
      const destPath = pathNode.join(assetsDir, 'invoices', destName);
      
      try {
        if (file.path) {
          fsNode.copyFileSync(file.path, destPath);
          invoiceFilePath = 'assets/invoices/' + destName;
        } else {
          const buffer = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = e => resolve(Buffer.from(e.target.result));
            reader.onerror = e => reject(e);
            reader.readAsArrayBuffer(file);
          });
          fsNode.writeFileSync(destPath, buffer);
          invoiceFilePath = 'assets/invoices/' + destName;
        }
      } catch(err) {
        console.error('Invoice file save error:', err);
      }
    }
    
    // Save to supplier ledger
    if (!supplier.invoices) supplier.invoices = [];
    if (!supplier.payments) supplier.payments = [];
    
    const invoice = {
      id: 'inv-' + Date.now(),
      ref: ref,
      date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
      totalAmount: totalAmount,
      paidAmount: amountPaid,
      items: items,
      filePath: invoiceFilePath
    };
    
    supplier.invoices.push(invoice);
    
    if (amountPaid > 0) {
      supplier.payments.push({
        id: 'pay-' + Date.now(),
        date: dateStr ? new Date(dateStr).toISOString() : new Date().toISOString(),
        amount: amountPaid,
        notes: `دفعة عند الفاتورة: ${ref}`
      });
      
      // Register cash outflow as expense
      EXPENSES.push({
        id: 'exp-' + Date.now(),
        date: invoice.date,
        type: 'مشتريات بضاعة',
        amount: amountPaid,
        notes: `فاتورة شراء ${ref} للمورد ${supplier.name}`,
        filePath: invoiceFilePath
      });
    }
    
    // Update supplier balance totals
    supplier.totalDebt = parseFloat(supplier.totalDebt || 0) + totalAmount;
    supplier.paid = parseFloat(supplier.paid || 0) + amountPaid;
    
    saveData();
    closeModal('modal-add-invoice');
    logActivity('فاتورة شراء', `تم تسجيل فاتورة ${ref} للمورد ${supplier.name} بقيمة ${totalAmount} دج`);
    renderAdminDashboard();
    renderInventoryGrid();
    showToast('تم حفظ الفاتورة وتحديث المخزون بنجاح!', 'success');
    
  } catch(e) {
    alert('خطأ أثناء حفظ الفاتورة: ' + e.message + '\n' + e.stack);
  }
}

function viewSupplierHistory(supplierId) {
  const supplier = SUPPLIERS.find(s => s.id === supplierId);
  if (!supplier) return;
  
  document.getElementById('supplier-history-title').textContent = `سجل معاملات المورد: ${supplier.name}`;
  
  // Calculate summary values
  const totalPurchases = (supplier.invoices || []).reduce((sum, inv) => sum + inv.totalAmount, 0);
  const totalPaid = (supplier.payments || []).reduce((sum, pay) => sum + pay.amount, 0);
  const remainingDebt = supplier.totalDebt - supplier.paid;
  
  document.getElementById('supplier-history-purchases').textContent = totalPurchases.toFixed(0) + ' دج';
  document.getElementById('supplier-history-paid').textContent = totalPaid.toFixed(0) + ' دج';
  document.getElementById('supplier-history-debt').textContent = remainingDebt.toFixed(0) + ' دج';
  
  // Set up pay button click
  const payBtn = document.getElementById('supplier-history-pay-btn');
  payBtn.onclick = () => {
    closeModal('modal-supplier-history');
    showPaySupplierModal(supplierId);
  };
  
  // Compile ledger list chronologically
  const ledger = [];
  
  if (supplier.invoices) {
    supplier.invoices.forEach(inv => {
      ledger.push({
        id: inv.id,
        date: new Date(inv.date),
        type: 'فاتورة شراء',
        ref: inv.ref,
        amount: inv.totalAmount,
        paid: inv.paidAmount,
        rem: inv.totalAmount - inv.paidAmount,
        file: inv.filePath,
        isRealInvoice: !inv.id.startsWith('init')
      });
    });
  }
  
  if (supplier.payments) {
    supplier.payments.forEach(pay => {
      // Exclude payment entries that are tied directly to an invoice to avoid duplicates in timeline
      // Actually let's list them separately so they see where payments went
      ledger.push({
        date: new Date(pay.date),
        type: 'دفع دين',
        ref: pay.notes || 'سند قبض',
        amount: 0,
        paid: pay.amount,
        rem: 0,
        file: ''
      });
    });
  }
  
  // Sort ledger by date descending
  ledger.sort((a, b) => b.date - a.date);
  
  const tbody = document.getElementById('supplier-transactions-tbody');
  if (ledger.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 20px; color:var(--text-muted);">لا توجد أي معاملات مسجلة بعد</td></tr>';
  } else {
    tbody.innerHTML = ledger.map(item => {
      const dateStr = formatCustomDateTime(item.date);
      let actionButtons = '';
      if (item.isRealInvoice) {
        actionButtons += `<button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem; background: var(--primary); margin-left: 5px;" onclick="closeModal('modal-supplier-history'); viewInvoiceDetails('${supplierId}', '${item.id}')">تفاصيل 🔍</button>`;
      }
      if (item.file) {
        actionButtons += `<button class="btn-primary" style="padding: 4px 8px; font-size: 0.75rem;" onclick="openAttachedInvoice('${item.file.replace(/\\/g, '/')}')">ملف 📄</button>`;
      }
      if (!actionButtons) actionButtons = '<span style="color:var(--text-muted)">-</span>';
        
      const typeColor = item.type === 'فاتورة شراء' ? '#fff' : 'var(--green)';
      
      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 12px 10px; direction: ltr; text-align: right; font-size: 0.9rem;">${dateStr}</td>
          <td style="padding: 12px 10px; font-weight: bold; color: ${typeColor};">${item.type}</td>
          <td style="padding: 12px 10px; color: var(--text-muted);">${item.ref}</td>
          <td style="padding: 12px 10px; text-align: left; font-weight: bold;">${item.amount > 0 ? item.amount.toFixed(0) + ' دج' : '-'}</td>
          <td style="padding: 12px 10px; text-align: left; color: var(--green); font-weight: bold;">${item.paid.toFixed(0)} دج</td>
          <td style="padding: 12px 10px; text-align: left; color: var(--warning); font-weight: bold;">${item.amount > 0 ? item.rem.toFixed(0) + ' دج' : '-'}</td>
          <td style="padding: 12px 10px; text-align: center;">${actionButtons}</td>
        </tr>
      `;
    }).join('');
  }
  
  openModal('modal-supplier-history');
}

function openAttachedInvoice(relativeFilePath) {
  try {
    const fullPath = pathNode.join(__dirname, relativeFilePath);
    if (fsNode.existsSync(fullPath)) {
      try {
        const { shell } = require('electron');
        shell.openPath(fullPath);
      } catch(e) {
        // Fallback for custom environment
        require('child_process').exec(`start "" "${fullPath}"`);
      }
      showToast('جاري فتح المستند المرفق...', 'info');
    } else {
      showToast('لم يتم العثور على ملف الفاتورة المرفق!', 'error');
    }
  } catch(e) {
    showToast('خطأ أثناء محاولة فتح الملف', 'error');
  }
}


// ==================== GENERATING & PRINTING PDF INVOICES ====================

function viewInvoiceDetails(supplierId, invoiceId) {
  try {
    const supplier = SUPPLIERS.find(s => s.id === supplierId);
    if (!supplier) return;
    const invoice = (supplier.invoices || []).find(i => i.id === invoiceId);
    if (!invoice) return;

    const d = new Date(invoice.date);
    const dateOnlyStr = formatCustomDate(d);
    const timeOnlyStr = String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
    // Readable date time format to prevent RTL numeric flipping
    const displayDateTime = dateOnlyStr + ' الساعة ' + timeOnlyStr;
    
    let itemsHtml = (invoice.items || []).map(item => {
      const sub = item.qty * item.buyPrice;
      return `
        <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
          <td style="padding: 10px; color: #fff;">${item.productName}</td>
          <td style="padding: 10px; text-align: center;">${item.qty}</td>
          <td style="padding: 10px; text-align: left;">${item.buyPrice.toFixed(0)} دج</td>
          <td style="padding: 10px; text-align: left; font-weight: bold; color: var(--amber);">${sub.toFixed(0)} دج</td>
        </tr>
      `;
    }).join('');

    if ((invoice.items || []).length === 0) {
      itemsHtml = '<tr><td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">لا توجد منتجات مسجلة في هذه الفاتورة (رصيد افتتاحي)</td></tr>';
    }

    const rem = invoice.totalAmount - invoice.paidAmount;

    const container = document.getElementById('view-invoice-body');
    container.innerHTML = `
      <div id="invoice-print-content" style="padding: 15px; direction: rtl; text-align: right; background: #12131a; color: #fff; border-radius: 6px;">
        <div style="text-align: center; margin-bottom: 20px; border-bottom: 2px solid var(--primary); padding-bottom: 15px;">
          <h2 style="color: var(--primary); margin: 0 0 5px 0;">فاتورة شراء بضاعة</h2>
          <div style="font-size: 0.9rem; color: var(--text-muted);">مرجع الفاتورة: ${invoice.ref}</div>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; font-size: 0.95rem; line-height: 1.6;">
          <div>
            <strong style="color: var(--text-muted);">المورد:</strong> ${supplier.name}<br>
            <strong style="color: var(--text-muted);">تاريخ التسجيل:</strong> ${displayDateTime}
          </div>
          <div style="text-align: left;">
            <strong style="color: var(--text-muted);">حالة الدفع:</strong> 
            <span style="font-weight: bold; color: ${invoice.paidAmount >= invoice.totalAmount ? 'var(--green)' : invoice.paidAmount > 0 ? 'var(--primary)' : 'var(--red)'}">
              ${invoice.paidAmount >= invoice.totalAmount ? 'مدفوعة بالكامل' : invoice.paidAmount > 0 ? 'مدفوعة جزئياً' : 'غير مدفوعة'}
            </span>
          </div>
        </div>
        
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
          <thead>
            <tr style="background: var(--bg-dark); color: var(--text-muted); font-size: 0.85rem; border-bottom: 1px solid var(--border-color); text-align: right;">
              <th style="padding: 10px;">المنتج</th>
              <th style="padding: 10px; text-align: center; width: 80px;">الكمية</th>
              <th style="padding: 10px; text-align: left; width: 120px;">سعر الشراء</th>
              <th style="padding: 10px; text-align: left; width: 120px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHtml}
          </tbody>
        </table>
        
        <div style="border-top: 1px solid var(--border-color); padding-top: 15px; display: flex; flex-direction: column; align-items: flex-end; gap: 8px;">
          <div style="display: flex; justify-content: space-between; width: 250px; font-size: 0.95rem;">
            <span style="color: var(--text-muted);">إجمالي الفاتورة:</span>
            <span style="font-weight: bold; color: #fff;">${invoice.totalAmount.toFixed(0)} دج</span>
          </div>
          <div style="display: flex; justify-content: space-between; width: 250px; font-size: 0.95rem;">
            <span style="color: var(--text-muted);">المبلغ المدفوع:</span>
            <span style="font-weight: bold; color: var(--green);">${invoice.paidAmount.toFixed(0)} دج</span>
          </div>
          <div style="display: flex; justify-content: space-between; width: 250px; font-size: 1.1rem; border-top: 1px dashed var(--border-color); padding-top: 8px;">
            <span style="color: var(--text-muted);">المتبقي (الدين):</span>
            <span style="font-weight: bold; color: var(--red);">${rem.toFixed(0)} دج</span>
          </div>
        </div>
      </div>
    `;

    // Attach print event
    document.getElementById('btn-print-invoice').onclick = () => {
      downloadInvoicePDF(supplier, invoice, displayDateTime);
    };

    openModal('modal-view-invoice');
  } catch(err) {
    console.error('Error viewing invoice:', err);
  }
}

function downloadInvoicePDF(supplier, invoice, displayDateTime) {
  try {
    const itemsRows = (invoice.items || []).map(item => {
      const sub = item.qty * item.buyPrice;
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; border: 1px solid #e5e7eb; color: #111; font-weight: 500;">${item.productName}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; color: #333;">${item.qty}</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: left; color: #333;">${item.buyPrice.toFixed(0)} دج</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb; text-align: left; font-weight: bold; color: #111;">${sub.toFixed(0)} دج</td>
        </tr>
      `;
    }).join('');

    const rem = invoice.totalAmount - invoice.paidAmount;
    
    // Create custom designed pristine printable HTML template
    const pdfHtmlString = `
      <div style="font-family: 'Cairo', 'Arial', sans-serif; direction: rtl; text-align: right; padding: 25px; color: #333; line-height: 1.6; background: #fff;">
        <!-- Header -->
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #6366f1; padding-bottom: 15px; margin-bottom: 25px;">
          <div>
            <h1 style="color: #6366f1; margin: 0 0 5px 0; font-size: 2rem; font-weight: 800;">GameZone Manager</h1>
            <span style="color: #666; font-size: 0.95rem;">نظام إدارة صالة الألعاب والمبيعات</span>
          </div>
          <div style="text-align: left;">
            <h2 style="margin: 0 0 5px 0; font-size: 1.5rem; font-weight: 700; color: #333;">فاتورة شراء بضاعة</h2>
            <span style="color: #666; font-size: 0.95rem;">الرقم المرجعي: ${invoice.ref}</span>
          </div>
        </div>

        <!-- Info Card -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; background: #f8f9fa; padding: 15px; border-radius: 8px; border: 1px solid #e5e7eb;">
          <div>
            <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: #4f46e5; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-weight: bold;">معلومات المورد والتسجيل</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <tr>
                <td style="padding: 4px 0; color: #666; width: 90px;">اسم المورد:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #111;">${supplier.name}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">تاريخ الفاتورة:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #111;">${displayDateTime}</td>
              </tr>
            </table>
          </div>
          <div>
            <h3 style="margin: 0 0 10px 0; font-size: 1rem; color: #4f46e5; border-bottom: 1px solid #ddd; padding-bottom: 5px; font-weight: bold;">ملخص الفاتورة والدفع</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
              <tr>
                <td style="padding: 4px 0; color: #666; width: 100px;">حالة الدفع:</td>
                <td style="padding: 4px 0; font-weight: bold; color: ${invoice.paidAmount >= invoice.totalAmount ? '#16a34a' : invoice.paidAmount > 0 ? '#2563eb' : '#dc2626'}">
                  ${invoice.paidAmount >= invoice.totalAmount ? 'مدفوعة بالكامل' : invoice.paidAmount > 0 ? 'مدفوعة جزئياً (تسبيق)' : 'غير مدفوعة'}
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #666;">رقم المرجع:</td>
                <td style="padding: 4px 0; font-weight: bold; color: #111;">${invoice.ref}</td>
              </tr>
            </table>
          </div>
        </div>

        <!-- Items Table -->
        <h3 style="margin: 0 0 10px 0; font-size: 1.1rem; color: #333; font-weight: bold;">المنتجات المشمولة بالفاتورة</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 0.9rem; text-align: right; border: 1px solid #e5e7eb;">
          <thead>
            <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #334155; font-weight: bold;">
              <th style="padding: 10px; border: 1px solid #e5e7eb;">اسم المنتج</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: center; width: 100px;">الكمية</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left; width: 150px;">سعر الوحدة</th>
              <th style="padding: 10px; border: 1px solid #e5e7eb; text-align: left; width: 150px;">الإجمالي</th>
            </tr>
          </thead>
          <tbody>
            ${itemsRows}
          </tbody>
        </table>

        <!-- Summary -->
        <div style="display: flex; justify-content: flex-end;">
          <table style="width: 320px; border-collapse: collapse; font-size: 0.95rem; border: 1px solid #e5e7eb;">
            <tr style="border-bottom: 1px solid #e5e7eb; background: #f8f9fa;">
              <td style="padding: 10px; color: #666;">إجمالي الفاتورة:</td>
              <td style="padding: 10px; text-align: left; font-weight: bold; color: #111;">${invoice.totalAmount.toFixed(0)} دج</td>
            </tr>
            <tr style="border-bottom: 1px solid #e5e7eb;">
              <td style="padding: 10px; color: #666;">المبلغ المدفوع:</td>
              <td style="padding: 10px; text-align: left; font-weight: bold; color: #16a34a;">${invoice.paidAmount.toFixed(0)} دج</td>
            </tr>
            <tr style="background: #fef2f2; border-top: 2px solid #fca5a5;">
              <td style="padding: 10px; color: #b91c1c; font-weight: bold;">المتبقي (الدين):</td>
              <td style="padding: 10px; text-align: left; font-weight: bold; color: #b91c1c; font-size: 1.1rem;">${rem.toFixed(0)} دج</td>
            </tr>
          </table>
        </div>

        <!-- Footer -->
        <div style="text-align: center; margin-top: 50px; padding-top: 15px; border-top: 1px dashed #cbd5e1; color: #94a3b8; font-size: 0.8rem;">
          تم إصدار وتنزيل هذا المستند تلقائياً عبر نظام GameZone Manager
        </div>
      </div>
    `;

    // Render inside a temporary container off-screen
    const tempContainer = document.createElement('div');
    tempContainer.style.position = 'absolute';
    tempContainer.style.left = '-9999px';
    tempContainer.innerHTML = pdfHtmlString;
    document.body.appendChild(tempContainer);

    const opt = {
      margin:       10,
      filename:     `فاتورة_شراء_${invoice.ref}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };
    
    showToast('جاري تحضير ملف PDF للتنزيل...', 'info');
    
    html2pdf().from(tempContainer.firstElementChild).set(opt).save().then(() => {
      tempContainer.remove();
      showToast('تم تحميل الفاتورة بنجاح!', 'success');
    }).catch(err => {
      console.error('PDF generation error:', err);
      showToast('فشل في تحميل ملف PDF', 'error');
      tempContainer.remove();
    });
  } catch(err) {
    console.error('Error generating PDF:', err);
  }
}

function openTransactionsModal() {
  openModal('modal-transactions');
  
  // Set date fields to today by default
  const todayFormatted = new Date().toISOString().split('T')[0];
  document.getElementById('trans-filter-start').value = todayFormatted;
  document.getElementById('trans-filter-end').value = todayFormatted;
  
  filterTransactionsByDateRange();
}

function filterTransactionsByDateRange() {
  const startStr = document.getElementById('trans-filter-start').value;
  const endStr = document.getElementById('trans-filter-end').value;
  
  if (!startStr || !endStr) {
    showToast('يرجى تحديد تاريخ البداية والنهاية', 'error');
    return;
  }
  
  const startDate = new Date(startStr);
  startDate.setHours(0,0,0,0);
  
  const endDate = new Date(endStr);
  endDate.setHours(23,59,59,999);
  
  // Save filter state for PDF generator
  STATE.transFilterStart = startStr;
  STATE.transFilterEnd = endStr;
  
  // Filter lists
  const filteredTransactions = TRANSACTIONS.filter(t => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });
  
  const filteredExpenses = EXPENSES.filter(e => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
  
  // Calculate period statistics
  const totalRevenue = filteredTransactions.reduce((sum, tr) => sum + tr.total, 0);
  const totalExpensesOneOff = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  // Calculate number of calendar days in range to distribute monthly fixed costs
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const periodFixedCostsTotal = FIXED_COSTS.reduce((sum, c) => sum + getDailyFixedCost(c), 0) * diffDays;
  const periodBuffetCogs = filteredTransactions.reduce((sum, tr) => sum + (tr.buffetCogs || 0), 0);
  
  const totalExpensesCombined = totalExpensesOneOff + periodFixedCostsTotal + periodBuffetCogs;
  const netProfit = totalRevenue - totalExpensesCombined;

  // Update Summary cards
  document.getElementById('trans-modal-total-rev').textContent = `${Number(totalRevenue).toFixed(0)} دج`;
  document.getElementById('trans-modal-total-exp').textContent = `${Number(totalExpensesCombined).toFixed(0)} دج`;
  
  const profitValEl = document.getElementById('trans-modal-net-profit');
  const profitCardEl = document.getElementById('trans-modal-profit-card');
  profitValEl.textContent = `${Number(netProfit).toFixed(0)} دج`;
  
  if (netProfit >= 0) {
    profitCardEl.style.background = 'rgba(16,185,129,0.1)';
    profitCardEl.style.borderColor = 'rgba(16,185,129,0.2)';
    profitValEl.style.color = 'var(--green)';
  } else {
    profitCardEl.style.background = 'rgba(239,68,68,0.1)';
    profitCardEl.style.borderColor = 'rgba(239,68,68,0.2)';
    profitValEl.style.color = 'var(--red)';
  }
  
  // Render Operations Table
  const tbody = document.getElementById('transactions-log-rows');
  if (tbody) {
    if (filteredTransactions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="8" style="text-align:center; padding:20px; color:var(--text-muted);">لا توجد أي عمليات مسجلة في هذه الفترة.</td>
        </tr>
      `;
    } else {
      tbody.innerHTML = filteredTransactions.map(tr => {
        const d = new Date(tr.date);
        const datePart = d.getFullYear() + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getDate().toString().padStart(2, '0');
        const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        const buffetProfit = tr.buffetCost - (tr.buffetCogs || 0);
        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 10px; color:var(--text-muted); font-size:0.82rem; vertical-align: top;">
              <div style="font-weight:bold; color:#fff;">${datePart}</div>
              <div style="font-size:0.75rem; margin-top:2px; color:var(--text-muted);">${timeStr}</div>
            </td>
            <td style="padding:8px 10px; font-weight:bold; color:var(--purple); font-size:0.82rem; vertical-align: top;">${tr.type}</td>
            <td style="padding:8px 10px; font-size:0.82rem; vertical-align: top; word-break: break-word;">
              <div style="font-weight:bold; color:white;">${tr.deviceName}</div>
              <div style="font-size:0.75rem; color:var(--text-muted); margin-top:2px; line-height:1.3; white-space: normal;">${tr.details}</div>
            </td>
            <td style="padding:8px 10px; text-align:center; color:var(--cyan); font-size:0.82rem; vertical-align: top;">${tr.sessionCost > 0 ? tr.sessionCost.toFixed(0) + ' دج' : '-'}</td>
            <td style="padding:8px 10px; text-align:center; color:var(--amber); font-size:0.82rem; vertical-align: top;">${tr.buffetCost > 0 ? tr.buffetCost.toFixed(0) + ' دج' : '-'}</td>
            <td style="padding:8px 10px; text-align:center; color:#f43f5e; font-size:0.82rem; vertical-align: top;">${tr.buffetCost > 0 ? (tr.buffetCogs || 0).toFixed(0) + ' دج' : '-'}</td>
            <td style="padding:8px 10px; text-align:center; color:var(--green); font-size:0.82rem; vertical-align: top;">${tr.buffetCost > 0 ? buffetProfit.toFixed(0) + ' دج' : '-'}</td>
            <td style="padding:8px 10px; text-align:left; font-weight:bold; color:var(--green); font-size:0.85rem; vertical-align: top;">${tr.total.toFixed(0)} دج</td>
          </tr>
        `;
      }).join('');
    }
  }

  // Render Expenses Table
  const expTbody = document.getElementById('transactions-expenses-rows');
  if (expTbody) {
    let expHTML = '';
    
    // Add period distributed fixed costs
    if (periodFixedCostsTotal > 0) {
      expHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(168,85,247,0.03);">
          <td style="padding:8px 10px; color:var(--text-muted); font-size:0.82rem; vertical-align: top;">00:00</td>
          <td style="padding:8px 10px; font-weight:bold; color:var(--purple); font-size:0.82rem; vertical-align: top;">تكاليف ثابتة (موزعة)</td>
          <td style="padding:8px 10px; color:var(--text-main); font-size:0.82rem; vertical-align: top; white-space: normal; word-break: break-word;">حصة ${diffDays} يوم من التكاليف الثابتة (${FIXED_COSTS.map(c => c.name).join(', ')})</td>
          <td style="padding:8px 10px; text-align:left; font-weight:bold; color:var(--red); font-size:0.82rem; vertical-align: top;">${periodFixedCostsTotal.toFixed(0)} دج</td>
        </tr>
      `;
    }
    
    // Add period buffet COGS
    if (periodBuffetCogs > 0) {
      expHTML += `
        <tr style="border-bottom:1px solid rgba(255,255,255,0.05); background:rgba(251,191,36,0.03);">
          <td style="padding:8px 10px; color:var(--text-muted); font-size:0.82rem; vertical-align: top;">00:00</td>
          <td style="padding:8px 10px; font-weight:bold; color:var(--amber); font-size:0.82rem; vertical-align: top;">تكلفة البضاعة المبيعة (COGS)</td>
          <td style="padding:8px 10px; color:var(--text-main); font-size:0.82rem; vertical-align: top; white-space: normal; word-break: break-word;">سعر شراء المنتجات المستهلكة من البوفيه للفترة المحددة</td>
          <td style="padding:8px 10px; text-align:left; font-weight:bold; color:var(--red); font-size:0.82rem; vertical-align: top;">${periodBuffetCogs.toFixed(0)} دج</td>
        </tr>
      `;
    }
    
    if (filteredExpenses.length === 0 && periodFixedCostsTotal === 0 && periodBuffetCogs === 0) {
      expTbody.innerHTML = `
        <tr>
          <td colspan="4" style="text-align:center; padding:15px; color:var(--text-muted);">لا توجد مصاريف مسجلة في هذه الفترة.</td>
        </tr>
      `;
    } else {
      expHTML += filteredExpenses.map(e => {
        const d = new Date(e.date);
        const datePart = d.getFullYear() + '/' + (d.getMonth() + 1).toString().padStart(2, '0') + '/' + d.getDate().toString().padStart(2, '0');
        const timeStr = d.getHours().toString().padStart(2, '0') + ':' + d.getMinutes().toString().padStart(2, '0');
        return `
          <tr style="border-bottom:1px solid rgba(255,255,255,0.05);">
            <td style="padding:8px 10px; color:var(--text-muted); font-size:0.82rem; vertical-align: top;">
              <div style="font-weight:bold; color:#fff;">${datePart}</div>
              <div style="font-size:0.75rem; margin-top:2px; color:var(--text-muted);">${timeStr}</div>
            </td>
            <td style="padding:8px 10px; font-weight:bold; color:var(--purple); font-size:0.82rem; vertical-align: top;">${e.type}</td>
            <td style="padding:8px 10px; color:var(--text-main); font-size:0.82rem; vertical-align: top; white-space: normal; word-break: break-word;">${e.notes || '-'}</td>
            <td style="padding:8px 10px; text-align:left; font-weight:bold; color:var(--red); font-size:0.82rem; vertical-align: top;">${e.amount.toFixed(0)} دج</td>
          </tr>
        `;
      }).join('');
      expTbody.innerHTML = expHTML;
    }
  }
}

function resetTransactionsDateFilter() {
  const todayFormatted = new Date().toISOString().split('T')[0];
  document.getElementById('trans-filter-start').value = todayFormatted;
  document.getElementById('trans-filter-end').value = todayFormatted;
  filterTransactionsByDateRange();
}

function downloadTransactionsPDF() {
  const startStr = STATE.transFilterStart || new Date().toISOString().split('T')[0];
  const endStr = STATE.transFilterEnd || new Date().toISOString().split('T')[0];
  
  const startDate = new Date(startStr);
  startDate.setHours(0,0,0,0);
  
  const endDate = new Date(endStr);
  endDate.setHours(23,59,59,999);
  
  const dateRangeDisplay = startStr === endStr 
    ? startStr.replace(/-/g, '/')
    : `من ${startStr.replace(/-/g, '/')} إلى ${endStr.replace(/-/g, '/')}`;
  
  const filteredTransactions = TRANSACTIONS.filter(t => {
    const d = new Date(t.date);
    return d >= startDate && d <= endDate;
  });
  
  const filteredExpenses = EXPENSES.filter(e => {
    const d = new Date(e.date);
    return d >= startDate && d <= endDate;
  });
  
  const totalRevenue = filteredTransactions.reduce((sum, tr) => sum + tr.total, 0);
  const totalExpensesOneOff = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
  
  const diffTime = Math.abs(endDate - startDate);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  const periodFixedCostsTotal = FIXED_COSTS.reduce((sum, c) => sum + getDailyFixedCost(c), 0) * diffDays;
  const periodBuffetCogs = filteredTransactions.reduce((sum, tr) => sum + (tr.buffetCogs || 0), 0);
  
  const totalExpensesCombined = totalExpensesOneOff + periodFixedCostsTotal + periodBuffetCogs;
  const netProfit = totalRevenue - totalExpensesCombined;

  let pdfExpensesRowsHTML = '';
  if (periodFixedCostsTotal > 0) {
    pdfExpensesRowsHTML += `
      <tr style="border-bottom: 1px solid #e5e7eb; background: #faf5ff;">
        <td style="padding: 10px; color: #666; text-align: right;">00:00</td>
        <td style="padding: 10px; font-weight: bold; color: #7c3aed; text-align: right;">تكاليف ثابتة (موزعة)</td>
        <td style="padding: 10px; text-align: right; color: #333;">حصة ${diffDays} يوم من التكاليف الثابتة (${FIXED_COSTS.map(c => c.name).join(', ')})</td>
        <td style="padding: 10px; text-align: left; font-weight: bold; color: #dc2626;">${periodFixedCostsTotal.toFixed(0)} دج</td>
      </tr>
    `;
  }
  if (periodBuffetCogs > 0) {
    pdfExpensesRowsHTML += `
      <tr style="border-bottom: 1px solid #e5e7eb; background: #fffbeb;">
        <td style="padding: 10px; color: #666; text-align: right;">00:00</td>
        <td style="padding: 10px; font-weight: bold; color: #d97706; text-align: right;">تكلفة البضاعة المبيعة (COGS)</td>
        <td style="padding: 10px; text-align: right; color: #333;">سعر شراء المنتجات المستهلكة من البوفيه للفترة المحددة</td>
        <td style="padding: 10px; text-align: left; font-weight: bold; color: #dc2626;">${periodBuffetCogs.toFixed(0)} دج</td>
      </tr>
    `;
  }
  if (filteredExpenses.length > 0) {
    pdfExpensesRowsHTML += filteredExpenses.map(e => {
      const trD = new Date(e.date);
      const datePart = trD.getFullYear() + '/' + (trD.getMonth() + 1).toString().padStart(2, '0') + '/' + trD.getDate().toString().padStart(2, '0');
      const timeStr = trD.getHours().toString().padStart(2, '0') + ':' + trD.getMinutes().toString().padStart(2, '0');
      return `
        <tr style="border-bottom: 1px solid #e5e7eb;">
          <td style="padding: 10px; color: #666; text-align: right;">
            <div>${datePart}</div>
            <div style="font-size:0.75rem; margin-top:2px;">${timeStr}</div>
          </td>
          <td style="padding: 10px; font-weight: bold; color: #b91c1c; text-align: right;">${e.type}</td>
          <td style="padding: 10px; text-align: right; color: #333;">${e.notes || '-'}</td>
          <td style="padding: 10px; text-align: left; font-weight: bold; color: #dc2626;">${e.amount.toFixed(0)} دج</td>
        </tr>
      `;
    }).join('');
  }
  if (pdfExpensesRowsHTML === '') {
    pdfExpensesRowsHTML = `
      <tr>
        <td colspan="4" style="padding: 20px; text-align: center; color: #888;">لا توجد مصاريف مسجلة للفترة المحددة.</td>
      </tr>
    `;
  }

  const reportHTML = `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 25px; color: #333; background: #fff; direction: rtl; text-align: right;">
      <div style="text-align: center; margin-bottom: 25px; border-bottom: 2px solid #a855f7; padding-bottom: 15px;">
        <h1 style="margin: 0; font-size: 2rem; color: #111;">التقرير المالي للأرباح والخسائر</h1>
        <div style="font-size: 1.1rem; color: #666; margin-top: 8px;">صالة الألعاب: GameZone • الفترة: ${dateRangeDisplay}</div>
      </div>
      
      <!-- Summary Grid -->
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 30px;">
        <div style="background: #f0fdf4; border: 1px solid #bbf7d0; padding: 15px; border-radius: 8px; text-align: center;">
          <span style="display: block; font-size: 0.85rem; color: #166534; margin-bottom: 5px; font-weight: bold;">إجمالي الإيرادات 💰</span>
          <strong style="font-size: 1.5rem; color: #16a34a;">${Number(totalRevenue).toFixed(0)} دج</strong>
        </div>
        <div style="background: #fef2f2; border: 1px solid #fecaca; padding: 15px; border-radius: 8px; text-align: center;">
          <span style="display: block; font-size: 0.85rem; color: #991b1b; margin-bottom: 5px; font-weight: bold;">إجمالي المصاريف 💸</span>
          <strong style="font-size: 1.5rem; color: #dc2626;">${Number(totalExpensesCombined).toFixed(0)} دج</strong>
        </div>
        <div style="background: ${netProfit >= 0 ? '#f0fdf4' : '#fef2f2'}; border: 1px solid ${netProfit >= 0 ? '#bbf7d0' : '#fecaca'}; padding: 15px; border-radius: 8px; text-align: center;">
          <span style="display: block; font-size: 0.85rem; color: ${netProfit >= 0 ? '#166534' : '#991b1b'}; margin-bottom: 5px; font-weight: bold;">صافي الأرباح 📈</span>
          <strong style="font-size: 1.5rem; color: ${netProfit >= 0 ? '#16a34a' : '#dc2626'};">${Number(netProfit).toFixed(0)} دج</strong>
        </div>
      </div>
      
      <h3 style="margin-bottom: 12px; color: #111; border-bottom: 2px solid #eee; padding-bottom: 8px; font-size: 1.15rem;">📋 سجل العمليات والمبيعات للفترة المحددة</h3>
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.85rem; margin-bottom: 30px;">
        <thead>
          <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px; font-weight: 700; width: 15%; text-align: right;">التاريخ والوقت</th>
            <th style="padding: 10px; font-weight: 700; width: 15%; text-align: right;">نوع العملية</th>
            <th style="padding: 10px; font-weight: 700; width: 25%; text-align: right;">البيان والتفاصيل</th>
            <th style="padding: 10px; font-weight: 700; width: 10%; text-align: center;">اللعب</th>
            <th style="padding: 10px; font-weight: 700; width: 10%; text-align: center;">مبيعات البوفيه</th>
            <th style="padding: 10px; font-weight: 700; width: 10%; text-align: center;">تكلفة البوفيه (الشراء)</th>
            <th style="padding: 10px; font-weight: 700; width: 10%; text-align: center;">فائدة البوفيه (الربح)</th>
            <th style="padding: 10px; font-weight: 700; width: 10%; text-align: left;">المجموع</th>
          </tr>
        </thead>
        <tbody>
          ${filteredTransactions.length === 0 ? `
            <tr>
              <td colspan="8" style="padding: 20px; text-align: center; color: #888;">لا توجد أي عمليات مسجلة في هذه الفترة.</td>
            </tr>
          ` : filteredTransactions.map(tr => {
            const trD = new Date(tr.date);
            const datePart = trD.getFullYear() + '/' + (trD.getMonth() + 1).toString().padStart(2, '0') + '/' + trD.getDate().toString().padStart(2, '0');
            const timeStr = trD.getHours().toString().padStart(2, '0') + ':' + trD.getMinutes().toString().padStart(2, '0');
            const buffetProfit = tr.buffetCost - (tr.buffetCogs || 0);
            return `
              <tr style="border-bottom: 1px solid #e5e7eb;">
                <td style="padding: 10px; color: #666; text-align: right;">
                  <div>${datePart}</div>
                  <div style="font-size:0.75rem; margin-top:2px;">${timeStr}</div>
                </td>
                <td style="padding: 10px; font-weight: bold; color: #7c3aed; text-align: right;">${tr.type}</td>
                <td style="padding: 10px; text-align: right;">
                  <strong style="color: #111;">${tr.deviceName}</strong>
                  <div style="font-size: 0.75rem; color: #666; margin-top: 2px;">${tr.details}</div>
                </td>
                <td style="padding: 10px; text-align: center; color: #0284c7;">${tr.sessionCost > 0 ? tr.sessionCost.toFixed(0) + ' دج' : '-'}</td>
                <td style="padding: 10px; text-align: center; color: #d97706;">${tr.buffetCost > 0 ? tr.buffetCost.toFixed(0) + ' دج' : '-'}</td>
                <td style="padding: 10px; text-align: center; color: #dc2626;">${tr.buffetCost > 0 ? (tr.buffetCogs || 0).toFixed(0) + ' دج' : '-'}</td>
                <td style="padding: 10px; text-align: center; color: #16a34a;">${tr.buffetCost > 0 ? buffetProfit.toFixed(0) + ' دج' : '-'}</td>
                <td style="padding: 10px; text-align: left; font-weight: bold; color: #16a34a;">${tr.total.toFixed(0)} دج</td>
              </tr>
            `;
          }).join('')}
        </tbody>
      </table>
      
      <h3 style="margin-bottom: 12px; color: #111; border-bottom: 2px solid #eee; padding-bottom: 8px; font-size: 1.15rem;">💸 تفاصيل مصاريف الفترة المحددة</h3>
      <table style="width: 100%; border-collapse: collapse; text-align: right; font-size: 0.85rem; margin-bottom: 20px;">
        <thead>
          <tr style="background: #f3f4f6; border-bottom: 2px solid #e5e7eb;">
            <th style="padding: 10px; font-weight: 700; width: 20%; text-align: right;">التاريخ والوقت</th>
            <th style="padding: 10px; font-weight: 700; width: 20%; text-align: right;">النوع</th>
            <th style="padding: 10px; font-weight: 700; width: 45%; text-align: right;">البيان / ملاحظات</th>
            <th style="padding: 10px; font-weight: 700; width: 15%; text-align: left;">المبلغ</th>
          </tr>
        </thead>
        <tbody>
          ${pdfExpensesRowsHTML}
        </tbody>
      </table>
      
      <div style="margin-top: 40px; text-align: center; font-size: 0.85rem; color: #999; border-top: 1px solid #eee; padding-top: 15px;">
        تم توليد هذا التقرير المالي تلقائياً عبر نظام GameZone Manager
      </div>
    </div>
  `;
  
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.left = '-9999px';
  wrapper.innerHTML = reportHTML;
  document.body.appendChild(wrapper);
  
  const filename = startStr === endStr 
    ? `التقرير_المالي_اليومي_${startStr}.pdf` 
    : `التقرير_المالي_من_${startStr}_إلى_${endStr}.pdf`;
    
  const opt = {
    margin:       10,
    filename:     filename,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  
  showToast('جاري تحضير ملف PDF للتقرير المالي...', 'info');
  
  html2pdf().from(wrapper.firstElementChild).set(opt).save().then(() => {
    wrapper.remove();
    showToast('تم تحميل التقرير بنجاح!', 'success');
  }).catch(err => {
    console.error('PDF generation error:', err);
    showToast('فشل في تحميل ملف PDF', 'error');
    wrapper.remove();
  });
}


// ==================== HARDWARE MAINTENANCE LOG ====================
function renderMaintenanceLog() {
  const tbody = document.getElementById('maintenance-list');
  if (!tbody) return;

  if (!MAINTENANCE_LOG || MAINTENANCE_LOG.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" style="text-align: center; padding: 25px; color: var(--text-muted);">لا توجد عمليات صيانة مسجلة حالياً.</td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = MAINTENANCE_LOG.map(m => {
    const dev = DEVICES.find(d => d.id == m.deviceId);
    const devName = dev ? dev.name : (m.deviceName || 'آخر / قطعة عامة');
    
    let statusClass = 'pending';
    let statusText = 'قيد الانتظار';
    if (m.status === 'in-repair') { statusClass = 'ending'; statusText = 'قيد الإصلاح'; }
    else if (m.status === 'fixed') { statusClass = 'available'; statusText = 'تم الإصلاح'; }
    else if (m.status === 'scrapped') { statusClass = 'busy'; statusText = 'خارج الخدمة'; }

    const costVal = parseFloat(m.cost || 0);
    const dateStr = m.reportedAt ? new Date(m.reportedAt).toLocaleDateString('ar-DZ') : 'غير محدد';

    return `
      <tr style="border-bottom: 1px solid var(--border-color); hover: background: rgba(255,255,255,0.01);">
        <td style="padding: 12px 10px; font-size: 0.9rem; color: var(--text-muted);">${dateStr}</td>
        <td style="padding: 12px 10px; font-weight: bold; color: #fff;">${devName}</td>
        <td style="padding: 12px 10px; color: var(--text-main);">${m.partName}</td>
        <td style="padding: 12px 10px; font-size: 0.9rem; color: var(--text-muted); max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${m.issue}">${m.issue}</td>
        <td style="padding: 12px 10px; font-weight: bold; color: var(--green);">${costVal.toFixed(0)} دج</td>
        <td style="padding: 12px 10px;">
          <span class="dev-manage-status ${statusClass}" style="display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: bold; text-align: center;">⬤ ${statusText}</span>
        </td>
        <td style="padding: 12px 10px; text-align: center; display: flex; gap: 6px; justify-content: center;">
          <button class="btn-primary" onclick="showEditMaintenanceModal('${m.id}')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 4px; border: none; background: rgba(255,255,255,0.1); color: #fff; cursor: pointer;">✏️ تعديل</button>
          <button class="btn-danger" onclick="deleteMaintenance('${m.id}')" style="padding: 4px 8px; font-size: 0.8rem; border-radius: 4px; border: none; background: rgba(239, 68, 68, 0.2); color: var(--red); cursor: pointer;">🗑️ حذف</button>
        </td>
      </tr>
    `;
  }).join('');
}

function showAddMaintenanceModal() {
  document.getElementById('maintenance-modal-title').textContent = '🔧 تسجيل عملية صيانة جديد';
  document.getElementById('maintenance-id').value = '';
  document.getElementById('maint-part-input').value = '';
  document.getElementById('maint-issue-input').value = '';
  document.getElementById('maint-cost-input').value = '0';
  document.getElementById('maint-is-expense').checked = false;
  document.getElementById('maint-expense-checkbox-container').style.display = 'flex';
  document.getElementById('maint-notes-textarea').value = '';
  document.getElementById('maint-status-select').value = 'pending';

  // Populate devices dropdown
  const select = document.getElementById('maint-device-select');
  if (select) {
    let options = '<option value="general">آخر / قطعة عامة ⚙️</option>';
    DEVICES.forEach(dev => {
      options += `<option value="${dev.id}">${dev.name} (${dev.type})</option>`;
    });
    select.innerHTML = options;
  }

  openModal('modal-maintenance');
}

function showEditMaintenanceModal(maintId) {
  const m = MAINTENANCE_LOG.find(i => i.id === maintId);
  if (!m) return;

  document.getElementById('maintenance-modal-title').textContent = '🔧 تعديل عملية صيانة';
  document.getElementById('maintenance-id').value = m.id;
  document.getElementById('maint-part-input').value = m.partName || '';
  document.getElementById('maint-issue-input').value = m.issue || '';
  document.getElementById('maint-cost-input').value = m.cost || 0;
  
  // Hide expense checkbox on edit to prevent double-spending
  document.getElementById('maint-is-expense').checked = false;
  document.getElementById('maint-expense-checkbox-container').style.display = 'none';
  
  document.getElementById('maint-notes-textarea').value = m.notes || '';
  document.getElementById('maint-status-select').value = m.status || 'pending';

  // Populate devices dropdown and select active
  const select = document.getElementById('maint-device-select');
  if (select) {
    let options = '<option value="general">آخر / قطعة عامة ⚙️</option>';
    DEVICES.forEach(dev => {
      options += `<option value="${dev.id}" ${dev.id == m.deviceId ? 'selected' : ''}>${dev.name} (${dev.type})</option>`;
    });
    select.innerHTML = options;
    if (!m.deviceId || m.deviceId === 'general') {
      select.value = 'general';
    }
  }

  openModal('modal-maintenance');
}

function saveMaintenance(event) {
  event.preventDefault();

  const id = document.getElementById('maintenance-id').value;
  const deviceSelectVal = document.getElementById('maint-device-select').value;
  const partName = document.getElementById('maint-part-input').value.trim();
  const issue = document.getElementById('maint-issue-input').value.trim();
  const status = document.getElementById('maint-status-select').value;
  const cost = parseFloat(document.getElementById('maint-cost-input').value) || 0;
  const isExpense = document.getElementById('maint-is-expense').checked;
  const notes = document.getElementById('maint-notes-textarea').value.trim();

  const isGeneral = deviceSelectVal === 'general';
  const deviceId = isGeneral ? null : parseInt(deviceSelectVal);
  const devObj = isGeneral ? null : DEVICES.find(d => d.id == deviceId);
  const deviceName = devObj ? devObj.name : 'آخر / قطعة عامة';

  if (!id) {
    // Add new
    const newId = 'maint_' + Date.now();
    const newEntry = {
      id: newId,
      deviceId,
      deviceName,
      partName,
      issue,
      status,
      cost,
      reportedAt: new Date().toISOString(),
      fixedAt: status === 'fixed' ? new Date().toISOString() : null,
      notes
    };
    
    MAINTENANCE_LOG.unshift(newEntry);
    logActivity('سجل صيانة جديد', `تم تسجيل صيانة لـ ${partName} (${deviceName}): ${issue} بتكلفة ${cost} دج`);
    
    // Register as expense if checked
    if (isExpense && cost > 0) {
      EXPENSES.unshift({
        id: Date.now().toString(),
        date: new Date().toISOString(),
        type: 'صيانة',
        amount: cost,
        notes: `تكلفة صيانة ${partName} (${deviceName})`
      });
      logActivity('تسجيل مصروف صيانة', `تم تسجيل مصروف صيانة بقيمة ${cost} دج`);
    }
  } else {
    // Edit existing
    const idx = MAINTENANCE_LOG.findIndex(i => i.id === id);
    if (idx > -1) {
      const oldStatus = MAINTENANCE_LOG[idx].status;
      
      MAINTENANCE_LOG[idx].deviceId = deviceId;
      MAINTENANCE_LOG[idx].deviceName = deviceName;
      MAINTENANCE_LOG[idx].partName = partName;
      MAINTENANCE_LOG[idx].issue = issue;
      MAINTENANCE_LOG[idx].status = status;
      MAINTENANCE_LOG[idx].cost = cost;
      MAINTENANCE_LOG[idx].notes = notes;
      
      if (status === 'fixed' && oldStatus !== 'fixed') {
        MAINTENANCE_LOG[idx].fixedAt = new Date().toISOString();
      } else if (status !== 'fixed') {
        MAINTENANCE_LOG[idx].fixedAt = null;
      }
      
      logActivity('تعديل سجل صيانة', `تم تعديل صيانة لـ ${partName} (${deviceName})`);
    }
  }

  saveData();
  closeModal('modal-maintenance');
  renderMaintenanceLog();
  
  if (typeof renderAdminDashboard === 'function') {
    renderAdminDashboard(); // Refresh expenses log if updated
  }
}

function deleteMaintenance(maintId) {
  if (confirm('هل أنت متأكد من حذف عملية الصيانة هذه؟')) {
    const m = MAINTENANCE_LOG.find(i => i.id === maintId);
    const detailStr = m ? `${m.partName} (${m.deviceName})` : maintId;
    
    MAINTENANCE_LOG = MAINTENANCE_LOG.filter(i => i.id !== maintId);
    saveData();
    renderMaintenanceLog();
    logActivity('حذف سجل صيانة', `تم حذف سجل صيانة ${detailStr}`);
    showToast('تم حذف سجل الصيانة', 'success');
  }
}
