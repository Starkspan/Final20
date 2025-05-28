
const express = require("express");
const fileUpload = require("express-fileupload");
const vision = require("@google-cloud/vision");
const fs = require("fs");
const path = require("path");
const { PDFImage } = require("pdf-image");

const app = express();
const port = process.env.PORT || 3000;

// Middleware
app.use(fileUpload());
app.use(express.json());

// Google Vision Client
const client = new vision.ImageAnnotatorClient({
  keyFilename: "starkspan-ocr-45e31c6a347b.json"
});

app.post("/analyze", async (req, res) => {
  if (!req.files || !req.files.pdf) {
    return res.status(400).send("No file uploaded.");
  }

  const pdf = req.files.pdf;
  const tempPath = path.join(__dirname, "temp.pdf");
  await pdf.mv(tempPath);

  const pdfImage = new PDFImage(tempPath, {
    convertOptions: {
      "-density": "300",
      "-quality": "100"
    }
  });

  try {
    const imagePath = await pdfImage.convertPage(0);
    const [result] = await client.textDetection(imagePath);
    const detections = result.textAnnotations;
    const fullText = detections.length ? detections[0].description : "";

    const text = fullText.toLowerCase();
    const analysis = {
      bohrungen: (text.match(/ø|⌀|loch|durchmesser/g) || []).length,
      gewinde: (text.match(/m[0-9]/g) || []).length,
      toleranzen: (text.match(/±|toleranz|it[0-9]/g) || []).length,
      passungen: (text.match(/h[0-9]|js[0-9]/g) || []).length,
      nuten: (text.match(/nut|nuten/g) || []).length,
      oberflächen: (text.match(/ra|r[0-9]|μm|µm/g) || []).length
    };

    const gesamtminuten =
      analysis.bohrungen * 2 +
      analysis.gewinde * 3 +
      analysis.toleranzen * 2 +
      analysis.passungen * 1.5 +
      analysis.nuten * 3 +
      analysis.oberflächen * 4;

    res.json({
      ocrText: fullText,
      bearbeitungszeit_min: Math.round(gesamtminuten),
      merkmale: analysis
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("OCR processing failed.");
  }
});

app.listen(port, () => {
  console.log(`OCR Backend läuft auf Port ${port}`);
});
