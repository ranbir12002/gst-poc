const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const inputDir = './scripts_data'; // Directory where your files are located
const outputFilePath = './combined_file.xlsx'; // Path to the output file

let combinedData = [];

// Function to read and process each file
function processFile(filePath, fileName) {
  return new Promise((resolve, reject) => {
    try {
      const workbook = XLSX.readFile(filePath);
      const sheetName = workbook.SheetNames[0];
      const worksheet = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);

      const results = worksheet.map((data) => {
        const combinedAddress = `${data.street || ''} ${data.buildingNo || ''} ${data.flatNo || ''} ${data.buildingName || ''} ${data.district || ''} ${data.stateCode || ''} ${data.pincode || ''}`.trim();
        const circleName = path.parse(fileName).name;
        return {
          gstin: data.gstin,
          address: combinedAddress,
          circle_name: circleName
        };
      });

      resolve(results);
    } catch (error) {
      reject(error);
    }
  });
}

// Function to process all files in the directory
async function processAllFiles() {
  try {
    const files = fs.readdirSync(inputDir);
    for (const file of files) {
      const filePath = path.join(inputDir, file);
      const fileData = await processFile(filePath, file);
      combinedData = combinedData.concat(fileData);
    }
    saveCombinedData();
  } catch (error) {
    console.error('Error processing files:', error);
  }
}

// Function to save the combined data to an Excel file
function saveCombinedData() {
  const worksheet = XLSX.utils.json_to_sheet(combinedData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Combined Data');
  XLSX.writeFile(workbook, outputFilePath);
}

processAllFiles();
