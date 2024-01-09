const express = require("express");
const app = express();
const cors = require("cors");
const multer = require("multer");
const tf = require("@tensorflow/tfjs-node");
const sharp = require("sharp");
const { MongoClient } = require('mongodb');
const bodyParser = require('body-parser');
app.use(bodyParser.json());
////////////////////////////////////////////////////////////////////
const mongoose = require("mongoose")
const windowsHostIP='192.168.42.158';
const mongoDBURI = 'mongodb+srv://sathwikpusapati6868:kbx9kGfxwXzvoBEr@reports.wevbdzp.mongodb.net/?retryWrites=true&w=majority';

// const mongoose = require("mongoose");
async function connectToDatabase() {
  try {
    await mongoose.connect(mongoDBURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected to the database");
  } catch (error) {
    console.error("Error connecting to the database:", error.message);
  }
}


const reports = mongoose.Schema({
  registration_number:String,
  Phone_number:String,
  imageName:String,
  label:String,

})
const Reports = mongoose.model("reports",reports); 
////////////////////////////////////////////////////////////////////
let model;
const modelPath = "model.js/model.json";

async function loadModel() {
  try {
    model = await tf.loadLayersModel(`file://${modelPath}`);
    console.log("Model loaded");
  } catch (error) {
    console.error("Error loading the model:", error);
  }
}
/////////////////////////////////////////////////////////////////////
loadModel();
connectToDatabase();
/////////////////////////////////////////////////////////////////////
app.use(cors());
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "uploads");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  },  
});
const upload = multer({ storage: storage });

app.get("/", function (req, res) {
  console.log("got a GET request for the home page");
  res.send("Welcome to Home page");
});
// app.post('/uploads',function(req,res){
//     console.log()
//     res.send("recived an image")
// })
app.post("/uploads", upload.single("image"), async (req, res) => {
  // console.log(req)
  console.log("post req recived");
  console.log(req.file);
//   res.send("Received an image");
  try {
  console.log(req.file);
  console.log(req.file.path);
  console.log(req.body)
    const processedImage = await sharp(req.file.path)
      .resize({ width: 128, height: 128 })
      .toBuffer();
      console.log('Image processed successfully.');
    //   res.json({ message: 'Image processed successfully.' });
    const inputTensor = tf.node.decodeImage(processedImage);
    const expandedTensor = inputTensor.expandDims();
    const normalizedTensor = expandedTensor.div(255.0);
    const reshapedTensor = normalizedTensor.reshape([1, 128, 128, 3]);
    const predictions = model.predict(reshapedTensor);
    const label = predictions.dataSync()[0] > 0.5 ? 'normal' : 'cracked';
    console.log({ label, confidence: predictions.dataSync()[0] * 100 });
    // res.send({ label, confidence: predictions.dataSync()[0] * 100 });
    const imageName = req.file.filename;
    const phoneNumber = req.body.Pn;
    const regNumber = req.body.Rn;
    // console.log(name)
    console.log(phoneNumber)
    console.log(regNumber)
    console.log(imageName)
    const saveToDb = new Reports({
      registration_number:regNumber,
      Phone_number:phoneNumber,
      imageName:imageName,
      label:label,
    });
    saveToDb.save().then(()=>{
      console.log("save to db")
    }).catch((e)=>{
      console.log("error cannot save to db")
    })

  } catch (error) { 
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Error processing image" });
  }

});
/////////////////////////////////////////////////////////
app.get("/getdb", async (req, res) => {
  console.log("got a get req");

  try {
    const data = await Reports.find();
    console.log("Data from the database:", data);
    res.json(data);
  } catch (error) {
    console.error('Error fetching data:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});
/////////////////////////////////////////////////////////

/////////////////////////////////////////////////////////

app.post('/search', (req, res) => {
  const { registrationNumber } = req.body;

  // Log the registration number (you can replace this with your desired logging mechanism)
  console.log('Received registration number:', registrationNumber);

  // Send a response back to the client
  res.json({ message: 'Registration number received successfully' });
});

/////////////////////////////////////////////////////////

async function startServer() {
  await loadModel();
  await connectToDatabase();
  const server = app.listen(8000, () => {
    console.log("Server is listening on port 8000");
  });
}

startServer();