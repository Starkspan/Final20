const express = require("express");
const multer = require("multer");
const vision = require("@google-cloud/vision");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const app = express();
const port = process.env.PORT || 10000;
app.use(cors());
app.use(express.json());

const upload = multer({ dest: "uploads/" });

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, "google-ocr-key.json")
});

app.post("/analyze", upload.single("file"), async (req, res) => {
  try {
    const [result] = await client.textDetection(req.file.path);
    const detections = result.textAnnotations;
    const fullText = detections.length ? detections[0].description : "";
    fs.unlinkSync(req.file.path);
    res.json({ text: fullText });
  } catch (error) {
    console.error("OCR error:", error.message);
    res.status(500).json({ error: "OCR failed" });
  }
});

app.listen(port, () => {
  console.log(`OCR Backend läuft auf Port ${port}`);
});