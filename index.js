const express = require('express');
const fileUpload = require('express-fileupload');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const app = express();
const port = process.env.PORT || 10000;

app.use(fileUpload());
app.use(express.json());
app.use(express.static('public'));

const client = new vision.ImageAnnotatorClient({
  keyFilename: './google-credentials.json'
});

app.post('/analyze', async (req, res) => {
  try {
    const file = req.files.file;
    const buffer = file.data;

    const [result] = await client.textDetection({ image: { content: buffer } });
    const detections = result.textAnnotations;
    const text = detections.length > 0 ? detections[0].description : '';

    const merkmale = {
      bohrungen: (text.match(/ø|Ø|\bD\d+/g) || []).length,
      gewinde: (text.match(/M\d+/g) || []).length,
      toleranzen: (text.match(/±|H7|h6|f7/g) || []).length,
      passungen: (text.match(/H7|h6|g6|f8|js/g) || []).length,
      nuten: (text.match(/Nute|Nut|Keil|Feder/g) || []).length,
      oberflächen: (text.match(/Ra|Rz|Rmax/g) || []).length,
    };

    const bearbeitungszeit = Object.values(merkmale).reduce((a, b) => a + b, 0) * 4;

    res.json({ text, merkmale, bearbeitungszeit });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Fehler bei der Analyse' });
  }
});

app.listen(port, () => {
  console.log(`OCR Backend läuft auf Port ${port}`);
});