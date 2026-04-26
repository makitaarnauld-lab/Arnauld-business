require('dotenv').config();

const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');

const app = express();
const port = 3000;

// Middleware AVANT
app.use(cors());
app.use(express.json());

// Route test
app.get('/', (req, res) => {
  res.send('serveur fonctionne');
});

// Route email
app.post('/send-email', async (req, res) => {
  const { email } = req.body;

  let transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  let mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Confirmation",
    text: "Merci pour votre inscription !"
  };

  try {
    await transporter.sendMail(mailOptions);
    res.send("Email envoyé !");
  } catch (error) {
    console.error(error);
    res.status(500).send("Erreur : " + error);
  }
});

// Lancer serveur à la FIN
app.listen(port, () => {
  console.log(`Serveur lancé sur http://localhost:${port}`);
});