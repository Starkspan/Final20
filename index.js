const express = require('express');
const fileUpload = require('express-fileupload');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const pdf = require('pdf2pic');
const app = express();
const port = process.env.PORT || 10000;

app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.post('/analyze', async (req, res) => {
  if (!req.files || !req.files.file) {
    return res.status(400).send('No file uploaded.');
  }

  const uploadedFile = req.files.file;
  const fileName = `${Date.now()}_${uploadedFile.name}`;
  const pdfPath = `./${fileName}`;
  await uploadedFile.mv(pdfPath);

  const outputPath = `out/${Date.now()}.jpg`;

  const converter = new pdf.default({
    density: 300,
    saveFilename: 'preview',
    savePath: './out',
    format: 'jpg',
    width: 1654,
    height: 2339,
  });

  const convert = await converter.convertBulk(pdfPath, [1]);

  const client = new vision.ImageAnnotatorClient();
  const [result] = await client.textDetection(outputPath);
  const detections = result.textAnnotations;

  const text = detections.length > 0 ? detections[0].description : '';

  res.json({
    text: text,
    merkmale: {
      bohrungen: (text.match(/ø|bohr/i) || []).length,
      gewinde: (text.match(/gewinde/i) || []).length,
      toleranzen: (text.match(/[±]/i) || []).length,
      passungen: (text.match(/H7|g6|f7/i) || []).length,
      nuten: (text.match(/nut/i) || []).length,
      oberflächen: (text.match(/ra|rauheit/i) || []).length,
    },
    bearbeitungszeit: 0
  });

  fs.unlinkSync(pdfPath);
});

app.listen(port, () => {
  console.log(`OCR Backend läuft auf Port ${port}`);
});