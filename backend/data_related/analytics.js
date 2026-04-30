const xlsx = require('xlsx');
const fs = require('fs');

// Function to read Excel file and convert it to JSON
function readExcelFile(filePath) {
  const workbook = xlsx.readFile(filePath);
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];
  const jsonData = xlsx.utils.sheet_to_json(worksheet);
  return jsonData;
}

// Function to find records in data1 that are missing in data2
function findMissingRecords(data1, data2, key) {
  const data2Set = new Set(data2.map(item => item[key]));
  const missingRecords = data1.filter(item => !data2Set.has(item[key]));
  return missingRecords;
}

// Function to save records to a new Excel file
function saveToExcel(data, filePath) {
  const worksheet = xlsx.utils.json_to_sheet(data);
  const workbook = xlsx.utils.book_new();
  xlsx.utils.book_append_sheet(workbook, worksheet, 'MissingRecords');
  xlsx.writeFile(workbook, filePath);
}

async function main() {
  const filePath1 = './gst_txp_dtls.xlsx';
  const filePath2 = './all_businesses.xlsx';
  const key = 'gstin'; // Change this to the key you want to compare

  const data1 = readExcelFile(filePath1);
  const data2 = readExcelFile(filePath2);

  console.log(`File 1 has ${data1.length} records.`);
  console.log(`File 2 has ${data2.length} records.`);

  const missingRecords = findMissingRecords(data1, data2, key);

  console.log(`Missing records count: ${missingRecords.length}`);

  // Save missing records to a new Excel file
  saveToExcel(missingRecords, './missing_records.xlsx');
  console.log('Missing records saved to missing_records.xlsx');
}

main();
