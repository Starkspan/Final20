const express = require('express');
const fileUpload = require('express-fileupload');
const vision = require('@google-cloud/vision');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(cors());
app.use(express.json());
app.use(fileUpload());

const client = new vision.ImageAnnotatorClient({
  keyFilename: '/etc/secrets/google-ocr-key.json',
});

app.post('/analyze', async (req, res) => {
  try {
    if (!req.files || !req.files.file) {
      return res.status(400).send('No file uploaded.');
    }

    const uploadedFile = req.files.file;
    const filePath = path.join(__dirname, 'upload.pdf');
    await uploadedFile.mv(filePath);

    const [result] = await client.documentTextDetection(filePath);
    const fullTextAnnotation = result.fullTextAnnotation;
    const text = fullTextAnnotation ? fullTextAnnotation.text : '';

    const features = {
      bohrungen: (text.match(/ø|⌀/gi) || []).length,
      gewinde: (text.match(/gewinde/gi) || []).length,
      toleranzen: (text.match(/±|toleranz/gi) || []).length,
      passungen: (text.match(/H7|H6|P6|P7|js/gi) || []).length,
      nuten: (text.match(/nut|keil/gi) || []).length,
      oberflächen: (text.match(/ra|rauheit|politur/gi) || []).length,
    };

    const bearbeitungszeit = features.bohrungen * 0.5 +
                              features.gewinde * 1.5 +
                              features.toleranzen * 1.0 +
                              features.passungen * 0.8 +
                              features.nuten * 0.7 +
                              features.oberflächen * 0.6;

    fs.unlinkSync(filePath);

    res.json({
      text,
      merkmale: features,
      bearbeitungszeit: Math.round(bearbeitungszeit)
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Fehler bei der Analyse.');
  }
});

app.listen(PORT, () => {
  console.log(`OCR Backend läuft auf Port ${PORT}`);
});