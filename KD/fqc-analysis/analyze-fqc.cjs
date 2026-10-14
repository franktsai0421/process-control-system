/**
 * FQC Specification Analysis & Cross-Reference Tool
 * Project: PROCESS OS (D:\中控系統)
 * Target Excel: data-import/FQC/FQC標準 FQC-C TRIL 1.xlsx
 *
 * Reproducible script that inspects sheets, merged cells, columns, Vietnamese strings,
 * coding rules, cross-references against Canonical master data, and generates structured analysis JSON.
 */

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');

const ROOT_DIR = path.resolve(__dirname, '../..');
const EXCEL_PATH = path.join(ROOT_DIR, 'data-import/FQC/FQC標準 FQC-C TRIL 1.xlsx');
const CANONICAL_DIR = path.join(ROOT_DIR, 'data/canonical');
const VENDOR_XLSX = path.join(ROOT_DIR, 'public/process/vendor/xlsx.full.min.js');

// 1. Calculate File Hash
const excelBuffer = fs.readFileSync(EXCEL_PATH);
const excelSha256 = crypto.createHash('sha256').update(excelBuffer).digest('hex').toUpperCase();

// 2. Load XLSX parser from vendor bundle
const sandbox = { window: {} };
sandbox.window = sandbox;
vm.createContext(sandbox);
vm.runInContext(fs.readFileSync(VENDOR_XLSX, 'utf8'), sandbox);
const XLSX = sandbox.XLSX;

const workbook = XLSX.read(excelBuffer, { type: 'buffer' });

// 3. Load Canonical Master Data
const canonicalCats = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'categories.json'), 'utf8')).records;
const canonicalProds = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'products.json'), 'utf8')).records;
const canonicalParts = JSON.parse(fs.readFileSync(path.join(CANONICAL_DIR, 'parts.json'), 'utf8')).records;

const cCatMap = new Map();
canonicalCats.forEach(c => cCatMap.set(c.data.name, c.data));

const cProdMap = new Map();
canonicalProds.forEach(p => cProdMap.set(p.data.code, p.data));

const cPartMap = new Map();
canonicalParts.forEach(p => cPartMap.set(p.data.code, p.data));

// 4. Parse Sheet 2: 產品類別
const s2 = workbook.Sheets['產品類別'];
const s2Rows = XLSX.utils.sheet_to_json(s2, { header: 1, defval: '' });
const sheet2Categories = [];
for (let i = 1; i < s2Rows.length; i++) {
  const line = String(s2Rows[i][0] || '').trim();
  const category = String(s2Rows[i][1] || '').trim();
  const extraJson = String(s2Rows[i][2] || '').trim();
  if (category) {
    sheet2Categories.push({ row: i + 1, line, category, extraJson });
  }
}

// 5. Parse Sheet 1: 產品資料 with Merge Unrolling
const s1 = workbook.Sheets['產品資料'];
const s1Rows = XLSX.utils.sheet_to_json(s1, { header: 1, defval: '' });
const s1Merges = s1['!merges'] || [];

const headerRow = s1Rows[0].map(h => String(h || '').trim());

let curCategory = '';
let curErrorCode = '';
let curErrorName = '';

const checkItems = [];
const anomalies = [];

for (let i = 1; i < s1Rows.length; i++) {
  const r = s1Rows[i];
  const rowNum = i + 1; // 1-based Excel row

  if (r[0]) curCategory = String(r[0]).trim();
  if (r[1]) curErrorCode = String(r[1]).trim();
  if (r[2]) curErrorName = String(r[2]).trim();

  const checkNo = String(r[3] || '').trim();
  const checkItemName = String(r[4] || '').trim();
  const checkDesc = String(r[5] || '').trim();
  const checkPhotos = String(r[6] || '').trim();
  const tool = String(r[7] || '').trim();
  const quarterCheck = String(r[8] || '').trim().toUpperCase() === 'YES';
  const productsRaw = String(r[9] || '').trim();
  const isEnabled = String(r[10] || '').trim().toUpperCase() === 'YES';
  const version = String(r[11] || '').trim();
  const versionDateRaw = r[12];
  const versionDate = versionDateRaw ? XLSX.SSF.format('yyyy-mm-dd', versionDateRaw) : '';
  const versionReason = String(r[13] || '').trim();
  const creator = String(r[14] || '').trim();
  const note = String(r[15] || '').trim();
  const col16 = String(r[16] || '').trim();
  const col17 = String(r[17] || '').trim();

  const productCodes = productsRaw
    ? productsRaw.split(/[,，\n\r]+/).map(c => c.trim()).filter(Boolean)
    : [];

  // Check product code recognition against Canonical
  const unrecognizedCodes = [];
  productCodes.forEach(code => {
    if (!cProdMap.has(code)) {
      unrecognizedCodes.push(code);
      const isPart = cPartMap.has(code);
      anomalies.push({
        type: 'UNRECOGNIZED_PRODUCT_CODE',
        sheet: '產品資料',
        row: rowNum,
        category: curCategory,
        checkNo,
        rawValue: code,
        reason: isPart
          ? `產品編號在 canonical products.json 找不到，但存在於 parts.json (kind: ${cPartMap.get(code).kind})`
          : '產品編號在 canonical products.json 及 parts.json 皆不存在',
        decisionRequired: '需決定是否在匯入前將半成品/缺少產品補入產品主資料，或在覆蓋矩陣中納入顯示'
      });
    }
  });

  // Check coding convention
  const expectedPrefix = curCategory + '-FQC-L';
  if (!curErrorCode.startsWith(expectedPrefix)) {
    anomalies.push({
      type: 'ERROR_CODE_PREFIX_DEVIATION',
      sheet: '產品資料',
      row: rowNum,
      category: curCategory,
      errorCode: curErrorCode,
      rawValue: curErrorCode,
      reason: `錯誤代碼前綴與類別名稱不完全一致 (預期 ${expectedPrefix}XX，實際為 ${curErrorCode})`,
      decisionRequired: '保留來源合法編碼，後端唯讀自動接續時需依該類別既有前綴規則'
    });
  }

  checkItems.push({
    row: rowNum,
    category: curCategory,
    errorCode: curErrorCode,
    errorName: curErrorName,
    checkNo,
    checkItemName,
    checkDesc,
    checkPhotos,
    tool,
    monthCheck: false, // Default unchecked as column is absent in Excel
    quarterCheck,
    products: productCodes,
    isEnabled,
    version,
    versionDate,
    versionReason,
    creator,
    note,
    col16,
    col17
  });
}

// 6. Aggregations and Validation
const categorySummary = new Map();
const errorCodeSummary = new Map();
const checkNoSet = new Set();
const duplicateCheckNos = [];

checkItems.forEach(item => {
  if (checkNoSet.has(item.checkNo)) {
    duplicateCheckNos.push(item.checkNo);
    anomalies.push({
      type: 'DUPLICATE_CHECK_NO',
      sheet: '產品資料',
      row: item.row,
      checkNo: item.checkNo,
      rawValue: item.checkNo,
      reason: 'FQC檢查編號重複',
      decisionRequired: '檢查編號必須全域唯一，需人工或系統校正'
    });
  } else {
    checkNoSet.add(item.checkNo);
  }

  if (!categorySummary.has(item.category)) {
    categorySummary.set(item.category, {
      category: item.category,
      errorCodes: new Map(),
      productSet: new Set(),
      checkItemCount: 0
    });
  }
  const cat = categorySummary.get(item.category);
  cat.checkItemCount++;
  item.products.forEach(p => cat.productSet.add(p));

  if (!cat.errorCodes.has(item.errorCode)) {
    cat.errorCodes.set(item.errorCode, {
      code: item.errorCode,
      names: new Set(),
      itemsCount: 0,
      rows: []
    });
  }
  const err = cat.errorCodes.get(item.errorCode);
  err.names.add(item.errorName);
  err.itemsCount++;
  err.rows.push(item.row);
});

// Check error code conflicts
for (const [catName, catData] of categorySummary.entries()) {
  for (const [errCode, errData] of catData.errorCodes.entries()) {
    if (errData.names.size > 1) {
      anomalies.push({
        type: 'ERROR_CODE_NAME_CONFLICT',
        sheet: '產品資料',
        category: catName,
        errorCode: errCode,
        rawValue: Array.from(errData.names),
        reason: `同一錯誤代碼具有多個不同名稱: ${Array.from(errData.names).join(' vs ')}`,
        decisionRequired: '同一代碼名稱衝突需人工確認統一'
      });
    }
  }
}

// Check categories in Sheet 2 with 0 check items in Sheet 1
const s1CatSet = new Set(categorySummary.keys());
sheet2Categories.forEach(s2Cat => {
  if (!s1CatSet.has(s2Cat.category)) {
    anomalies.push({
      type: 'EMPTY_CATEGORY_IN_SHEET1',
      sheet: '產品類別',
      row: s2Cat.row,
      category: s2Cat.category,
      rawValue: s2Cat.category,
      reason: `類別存在於工作表「產品類別」，但在「產品資料」中無任何檢查項目`,
      decisionRequired: '需作為無項目的空類別保留於主資料中，待後續維護 FQC 標準'
    });
  }
});

// 7. Calculate Matrix Coverage per Category against Canonical
const canonicalProdsByCat = new Map();
canonicalProds.forEach(p => {
  const cat = p.data.category;
  if (!canonicalProdsByCat.has(cat)) canonicalProdsByCat.set(cat, []);
  canonicalProdsByCat.get(cat).push({
    code: p.data.code,
    name: p.data.name,
    specification: p.data.specification || ''
  });
});

const coverageMatrix = [];
for (const [catName, catData] of categorySummary.entries()) {
  const cProds = canonicalProdsByCat.get(catName) || [];
  const covered = [];
  const uncovered = [];

  cProds.forEach(cp => {
    if (catData.productSet.has(cp.code)) {
      covered.push(cp);
    } else {
      uncovered.push(cp);
    }
  });

  const externalCodes = Array.from(catData.productSet).filter(
    code => !cProds.some(cp => cp.code === code)
  );

  coverageMatrix.push({
    category: catName,
    canonicalProductCount: cProds.length,
    coveredProductCount: covered.length,
    uncoveredProductCount: uncovered.length,
    uncoveredProducts: uncovered,
    externalProductCodes: externalCodes
  });
}

// 8. Output results
const summary = {
  analyzedAt: new Date().toISOString(),
  excelFile: {
    path: path.relative(ROOT_DIR, EXCEL_PATH),
    sizeBytes: excelBuffer.length,
    sha256: excelSha256
  },
  sheets: {
    '產品資料': {
      rowCount: s1Rows.length,
      dataRowCount: s1Rows.length - 1,
      mergesCount: s1Merges.length,
      columnsCount: headerRow.length,
      headers: headerRow
    },
    '產品類別': {
      rowCount: s2Rows.length,
      dataRowCount: s2Rows.length - 1,
      categoriesCount: sheet2Categories.length
    }
  },
  statistics: {
    totalCategoriesInSheet1: categorySummary.size,
    totalCategoriesInSheet2: sheet2Categories.length,
    totalErrorCodes: Array.from(categorySummary.values()).reduce((sum, c) => sum + c.errorCodes.size, 0),
    totalCheckItems: checkItems.length,
    uniqueCheckNos: checkNoSet.size,
    duplicateCheckNosCount: duplicateCheckNos.length,
    embeddedImagesCount: 0, // Inspected zip entries: 0 in xl/media/
    distinctToolsCount: new Set(checkItems.map(i => i.tool)).size,
    distinctProductCodesReferenced: new Set(checkItems.flatMap(i => i.products)).size
  }
};

const fieldMapping = {
  description: 'FQC Excel 欄位與系統資料模型對應定義',
  excelSheet: '產品資料',
  mappings: [
    { colIndex: 0, header: '產品類別\nLoại sản phẩm', modelField: 'category', mergeGroup: true, note: '垂直合併分組，向後繼承' },
    { colIndex: 1, header: '錯誤代碼 Mã lỗi', modelField: 'errorCode', mergeGroup: true, note: '垂直合併分組，代碼不可連帶刪除' },
    { colIndex: 2, header: '錯誤代碼名稱 Tên mã lỗi', modelField: 'errorName', mergeGroup: true, note: '垂直合併分組' },
    { colIndex: 3, header: 'FQC檢查編號\nMã kiểm tra FQC', modelField: 'checkNo', mergeGroup: false, note: '每列唯一，格式 <類別前綴>-FQC-L<L號>-<2位序號>' },
    { colIndex: 4, header: '檢查項目\nHạng mục kiểm tra', modelField: 'checkItemName', mergeGroup: false, note: '越文原文保留' },
    { colIndex: 5, header: '檢查方式敘述 Mô tả các phương pháp kiểm tra', modelField: 'checkDesc', mergeGroup: false, note: '來源目前全空白，保留欄位' },
    { colIndex: 6, header: '檢查方式圖片 Hình ảnh phương pháp kiểm tra', modelField: 'checkPhotos', mergeGroup: false, note: '來源目前無內嵌圖片，保留關聯結構' },
    { colIndex: 7, header: '檢查工具(照片)\nCông cụ kiểm tra (Photo)', modelField: 'tool', mergeGroup: false, note: '越文原文保留，不另建工具管理' },
    { colIndex: 8, header: '是否加入季檢查列表\nCó đưa vào danh sách kiểm tra hàng quý không', modelField: 'isQuarterly', mergeGroup: false, note: 'YES/NO 轉為布林值' },
    { colIndex: 9, header: '包含產品\nSản phẩm áp dụng', modelField: 'productCodes', mergeGroup: false, note: '逗號分隔字串轉為字串陣列' },
    { colIndex: 10, header: '是否啟用\nCó kích hoạt không', modelField: 'isEnabled', mergeGroup: false, note: 'YES/NO 轉為布林值，預設啟用' },
    { colIndex: 11, header: '版本\nPhiên bản', modelField: 'version', mergeGroup: false, note: '來源固定 V1.0' },
    { colIndex: 12, header: '版本變更時間 Thời gian thay đổi phiên bản', modelField: 'versionDate', mergeGroup: false, note: 'Excel 數值 46283 -> 2026-09-18' },
    { colIndex: 13, header: '版本變更原因Lý do thay đổi phiên bản', modelField: 'versionReason', mergeGroup: false, note: '來源為 Mới thành lập' },
    { colIndex: 14, header: 'Người tạo\n建立者', modelField: 'creator', mergeGroup: false, note: '來源全空白，系統由當前登入者帶入' },
    { colIndex: 15, header: '備註 GHI CHÚ', modelField: 'note', mergeGroup: false, note: '選填字串' },
    { colIndex: 16, header: '未建立產品 Chưa có sản phẩm nào được thành lập.', modelField: '_unestablishedProducts', mergeGroup: true, note: '來源全空白' },
    { colIndex: 17, header: 'FQC錯誤代碼使用比例 Tỷ lệ sử dụng mã lỗi FQC', modelField: '_usageRatioFormula', mergeGroup: true, note: '說明文字，不寫入主業務實體' }
  ],
  systemGeneratedFields: [
    { field: 'isMonthly', default: false, note: 'Excel 中無此欄位，依規格預設未勾' },
    { field: 'draftReason', default: '', note: '草稿變更理由，每次儲存變動時依規格記錄' }
  ]
};

// Write output files
fs.writeFileSync(path.join(__dirname, 'fqc-analysis-summary.json'), JSON.stringify(summary, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, 'fqc-anomalies.json'), JSON.stringify(anomalies, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, 'fqc-field-mapping.json'), JSON.stringify(fieldMapping, null, 2), 'utf8');
fs.writeFileSync(path.join(__dirname, 'fqc-coverage-matrix.json'), JSON.stringify(coverageMatrix, null, 2), 'utf8');

console.log('FQC Analysis completed successfully:');
console.log(`- File SHA256: ${excelSha256}`);
console.log(`- Total Categories in Sheet 1: ${categorySummary.size}`);
console.log(`- Total Error Codes: ${summary.statistics.totalErrorCodes}`);
console.log(`- Total Check Items: ${checkItems.length}`);
console.log(`- Total Anomalies detected: ${anomalies.length}`);
