const express = require("express");
const multer = require("multer");
const fs = require("fs");
const { fromPath } = require("pdf2pic");
const vision = require("@google-cloud/vision");

const app = express();
const port = process.env.PORT || 10000;
const upload = multer({ dest: "uploads/" });

const client = new vision.ImageAnnotatorClient({
  keyFilename: "/etc/secrets/google-ocr-key.json",
});

app.use(express.static("public"));
app.use(express.json());

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const pdfPath = req.file.path;
    const outputPath = \`out/\${Date.now()}.jpg\`;

    const converter = fromPath(pdfPath, {
      density: 300,
      saveFilename: Path.basename(outputPath, ".jpg"),
      savePath: "out",
      format: "jpg",
      width: 1654,
      height: 2339,
    });

    const result = await converter(1);
    const image = fs.readFileSync(result.path);
    const base64Image = image.toString("base64");

    const [ocrResult] = await client.textDetection(result.path);
    const text = ocrResult.fullTextAnnotation?.text || "";

    // Analyse simuliert
    const merkmale = {
      bohrungen: text.includes("ø") ? 1 : 0,
      gewinde: text.toLowerCase().includes("m") ? 1 : 0,
      toleranzen: text.includes("±") ? 1 : 0,
      passungen: text.includes("H7") ? 1 : 0,
      nuten: text.includes("nut") ? 1 : 0,
      oberflächen: text.includes("ra") ? 1 : 0,
    };

    const bearbeitungszeit =
      merkmale.bohrungen +
      merkmale.gewinde +
      merkmale.toleranzen +
      merkmale.passungen +
      merkmale.nuten +
      merkmale.oberflächen;

    res.json({
      image: \`data:image/jpeg;base64,\${base64Image}\`,
      text,
      merkmale,
      bearbeitungszeit,
    });

    fs.unlinkSync(result.path);
    fs.unlinkSync(pdfPath);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Analyse fehlgeschlagen" });
  }
});

app.listen(port, () => {
  console.log("OCR Backend läuft auf Port", port);
});