const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const axios = require("axios");
const bodyParser = require("body-parser");
const nodemailer = require('nodemailer');
const { error } = require("console");
const { ifError } = require("assert");
// const puppeteer = require("puppeteer");
const pdf = require('html-pdf');
const path = require('path');



require("dotenv").config();


const app = express();
app.use(express.json());
app.use(express.urlencoded({
    extended: false
}));
app.use(cors());
app.use(bodyParser.urlencoded({
    extended: false
}));
// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'static')));



let salt_key = process.env.SALT_KEY
let merchant_id = process.env.MERCHANT_ID
let sender_name = '';
let sender_email = ''

async function generateReportPdf(utr, trans_id, amount, merchent_id, paymentType) {
    const reportHtml = `<!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Document</title>
        <style>
            *{
                box-sizing: border-box;
            }
            body{
                border-style: solid none solid none;
                border-width: 9px;
                padding: 10px;
                margin: 0;
                border-color: #004aad;
                font-family: 'Gill Sans', 'Gill Sans MT', Calibri, 'Trebuchet MS', sans-serif;
                background-color: white;
            }
            #top{
                font-size: x-large;
                font-weight: bolder;
                font-family: 'Courier New', Courier, monospace;
                display: flex;
                align-items: center;
            }
            #top2{
                display: flex;
                align-items: center;
                gap: 10px;
            }
            #top3{
                font-weight: 600;
                padding-bottom: 15px;
            }
            #top4{
                padding-top: 25px;
            }
            #last{
                background-color: #aed0ff;
                padding: 10px;
                border: solid #9bcbff 2px;
            }
            hr{
                width: 100%;
                height: 7px;
                background-color: #004aad;
                margin: 0;
                padding: 0;
                
            }
        </style>
    </head>
    <body>
        <div id="top">
            <img src="./static/logo.jpg" alt="" srcset="" height="100px">YUVA SANYUKTHA FOUNDATION
        </div>
        <div id="top2">
            <hr> Date: ${new Date().toLocaleDateString()}
        </div>
        <div id="top3">
            Thanku For Being Part of Our family
        </div>
        <hr>
        <div id="top4">
            <b>Dear</b> : ${sender_name} <br><br>
            <b>Thank you very much for contributing to YUVA SANYUKTHA FOUNDATION.</b><br><br>
            I (President) and members of Yuva Sanyuktha Foundation express our gratitude for the
    thoughtful and compassionate gesture on your part. The valuable contribution will help us in
    spreading love and growing our community. <br>
            <hr style="height: 2px; margin: 10px 0;">
            <b>
                President <br>
    Yuva Sanyuktha Foundation
            </b>
        </div><br><br>
        <div id="last">
            Received with thanks from : <b>${sender_name}</b>
            <hr style="height: 0px; margin: 8px 0; border-top: 2.5px dotted; background-color: transparent; border-bottom: none;">
            The Sum of <b>INR ₹ ${amount}</b> 
        </div>
    </body>
    </html>`;
    pdf.create(reportHtml).toFile('receipt.pdf', (err, res) => {
        if (err) return console.log(err);
        console.log('PDF generated successfully:', res);
    });
}

// Call the function to generate a report PDF and send email
async function sendMail(amount, paymentType, authorizationCode, transactionId, merchent_id) {
    await generateReportPdf(authorizationCode, transactionId, amount, merchent_id, paymentType);
    const thanksHtml = `<html>

    <head>
        <title>Sample Report</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                margin: 20px;
                background-color: white;
            }
    
            h1 {
                color: #333;
            }
    
            p {
                color: #555;
                margin-bottom: 10px;
            }
    
            table {
                width: 100%;
                border-collapse: collapse;
                margin-top: 20px;
            }
    
            th,
            td {
                border: 1px solid #ddd;
                padding: 8px;
                text-align: left;
            }
    
            th {
                background-color: #f2f2f2;
            }
        </style>
    </head>
    
    <body>
        <h1>Transaction Receipt</h1>
        <p style="margin: 0;">Date: ${new Date().toLocaleDateString()}</p>
        <p style="margin: 0;">Time: ${new Date().toLocaleTimeString()}</p>
    
        <table>
            <thead>
                <tr>
                    <th>Name</th>
                    <th>${sender_name}</th>
                </tr>
            </thead>
            <tbody>
                <tr>
                    <td>UTR</td>
                    <td>${authorizationCode}</td>
                </tr>
                <tr>
                    <td>Transaction ID</td>
                    <td>${transactionId}</td>
                </tr>
                <tr>
                    <td>Merchent ID</td>
                    <td>${merchent_id}</td>
                </tr>
                <tr>
                    <td>Payment Type</td>
                    <td>${paymentType}</td>
                </tr>
            </tbody>
        </table>
        <p>Total Transferred: Rs ${amount}</p>
    </body>
    
    </html>`
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        secure: true,
        auth: {
            user: process.env.SENDER_EMAIL,
            pass: process.env.SENDER_PASS
        }
    });

    const mailOptions = {
        from: process.env.SENDER_EMAIL,
        to: sender_email,
        subject: 'Transaction Receipt',
        text: `Amount Paid: Amount - ${amount}, Payment Type - ${paymentType}, Authorization Code - ${authorizationCode}`,
        html: thanksHtml,
        attachments: [
            {
                filename: 'receipt.pdf',
                path: path.join(__dirname, 'receipt.pdf'),
                contentType: 'application/pdf'
            }
        ]
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            console.error('Error sending email:', error);
        } else {
            console.log('Email sent successfully:', info.response);
        }
    });
}
app.get("/", (req, res) => {
    res.send("server is running");
})


app.post("/order", async (req, res) => {

    try {
        console.log(req.body)

        const merchantTransactionId = req.body.transactionId;
        sender_name = req.body.name;
        sender_email = req.body.email;
        const data = {
            merchantId: merchant_id,
            merchantTransactionId: merchantTransactionId,
            merchantUserId: req.body.MUID,
            name: sender_name,
            amount: req.body.amount * 100,
            redirectUrl: `http://localhost:8000/status/?id=${merchantTransactionId}`,
            redirectMode: 'POST',
            mobileNumber: req.body.number,
            paymentInstrument: {
                type: 'PAY_PAGE'
            }
        };
        const payload = JSON.stringify(data);
        const payloadMain = Buffer.from(payload).toString('base64');
        const keyIndex = 1;
        const string = payloadMain + '/pg/v1/pay' + salt_key;
        const sha256 = crypto.createHash('sha256').update(string).digest('hex');
        const checksum = sha256 + '###' + keyIndex;

        const prod_URL = "https://api.phonepe.com/apis/hermes/pg/v1/pay"
        // const prod_URL = "https://api-preprod.phonepe.com/apis/pg-sandbox/pg/v1/pay"

        const options = {
            method: 'POST',
            url: prod_URL,
            headers: {
                accept: 'application/json',
                'Content-Type': 'application/json',
                'X-VERIFY': checksum
            },
            data: {
                request: payloadMain
            }
        };
        console.log(salt_key + " " + merchant_id)
        axios.request(options).then(function (response) {
            console.log(response.data)

            return res.json(response.data)
        }).catch(function (error) {
            console.error(error);
        });

    } catch (error) {
        res.status(500).send({
            message: error.message,
            success: false
        })
    }

})


app.post("/status", async (req, res) => {

    // res.send('thisis')
    const merchantTransactionId = req.query.id
    // res.send(merchantTransactionId);
    const merchantId = merchant_id

    const keyIndex = 1;
    const string = `/pg/v1/status/${merchantId}/${merchantTransactionId}` + salt_key;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    const checksum = sha256 + "###" + keyIndex;

    const options = {
        method: 'GET',
        url: `https://api.phonepe.com/apis/hermes/pg/v1/status/${merchantId}/${merchantTransactionId}`,
        headers: {
            accept: 'application/json',
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': `${merchantId}`
        }
    };

    // CHECK PAYMENT STATUS
    axios.request(options).then(async (response) => {

        // res.json(response.data);
        if (response.data.success === true) {
            let amount = response.data.data.amount / 100;
            let paymentType = response.data.data.paymentInstrument.type;
            let authorizationCode = response.data.data.paymentInstrument.utr;
            let name = sender_name;
            let transactionId = response.data.data.transactionId;
            let merchantId = response.data.data.merchantTransactionId;
            sendMail(amount, paymentType, authorizationCode, transactionId, merchantId);

            res.send(`
            <!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01//EN" "http://www.w3.org/TR/html4/strict.dtd">
            <html
                style="-moz-osx-font-smoothing: grayscale; -webkit-font-smoothing: antialiased; background-color: #464646; margin: 0; padding: 0;">
            
            <head>
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
                <meta name="format-detection" content="telephone=no">
                <title>Sucess paymnet</title>
            
            </head>
            
            <body bgcolor="#d7d7d7" class="generic-template"
                style="-moz-osx-font-smoothing: grayscale; -webkit-font-smoothing: antialiased; background-color: #d7d7d7; margin: 0; padding: 0;">
                <!-- Header Start -->
                <div class="bg-white header" bgcolor="#ffffff" style="background-color: white; width: 100%;">
                    <table align="center" bgcolor="#ffffff"
                        style="border-left: 10px solid white; border-right: 10px solid white; max-width: 600px; width: 100%;">
                        <tr height="80">
                            <td align="left" class="vertical-align-middle"
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: middle;">
                                <a href="/index.html"
                                    style="-webkit-text-decoration-color: #F16522; color: #F16522; text-decoration: none; text-decoration-color: #F16522; font-size: xx-large; font-weight: bold;">
                                    Yuva Sanyuktha
                                </a>
                            </td>
                        </tr>
                    </table>
                </div>
                <!-- Header End -->
            
                <!-- Content Start -->
                <table cellpadding="0" cellspacing="0" cols="1" bgcolor="#d7d7d7" align="center" style="max-width: 600px;">
                    <tr bgcolor="#d7d7d7">
                        <td height="50"
                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                        </td>
                    </tr>
            
                    <!-- This encapsulation is required to ensure correct rendering on Windows 10 Mail app. -->
                    <tr bgcolor="#d7d7d7">
                        <td
                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                            <!-- Seperator Start -->
                            <table cellpadding="0" cellspacing="0" cols="1" bgcolor="#d7d7d7" align="center"
                                style="max-width: 600px; width: 100%;">
                                <tr bgcolor="#d7d7d7">
                                    <td height="30"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                            </table>
                            <!-- Seperator End -->
            
                            <!-- Generic Pod Left Aligned with Price breakdown Start -->
                            <table align="center" cellpadding="0" cellspacing="0" cols="3" bgcolor="white"
                                class="bordered-left-right"
                                style="border-left: 10px solid #d7d7d7; border-right: 10px solid #d7d7d7; max-width: 600px; width: 100%;">
                                <tr height="50">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr align="center">
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td class="text-primary"
                                        style="color: #F16522; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                        <img src="http://dgtlmrktng.s3.amazonaws.com/go/emails/generic-email-template/tick.png"
                                            alt="GO" width="50"
                                            style="border: 0; font-size: 0; margin: 0; max-width: 100%; padding: 0;">
                                    </td>
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr height="17">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr align="center">
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td class="text-primary"
                                        style="color: #F16522; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                        <h1
                                            style="color: #F16522; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 30px; font-weight: 700; line-height: 34px; margin-bottom: 0; margin-top: 0;">
                                            Thank You !</h1>
                                    </td>
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr height="30">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr align="left">
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                            Thanks ${name}, for you Kind Help
                                        </p>
                                    </td>
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr height="10">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr align="left">
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                            Your transaction was successful!</p>
                                        <br>
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0; ">
                                            <strong>Payment Details:</strong><br />
            
                                            Amount: ${amount}₹ <br />
                                            Type: ${paymentType}.<br /></p>
                                        <br>
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                            We advise to keep the email we send for future reference.&nbsp;&nbsp;&nbsp;&nbsp;<br /></p>
                                    </td>
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr height="30">
                                    <td
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td
                                        style="border-bottom: 1px solid #D3D1D1; color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr height="30">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                                <tr align="center">
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                    <td
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                            <strong>Transaction reference: ${authorizationCode}</strong></p>
                                        <p
                                            style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                        </p>
                                    </td>
                                    <td width="36"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
            
                                <tr height="50">
                                    <td colspan="3"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
            
                            </table>
                            <!-- Generic Pod Left Aligned with Price breakdown End -->
            
                            <!-- Seperator Start -->
                            <table cellpadding="0" cellspacing="0" cols="1" bgcolor="#d7d7d7" align="center"
                                style="max-width: 600px; width: 100%;">
                                <tr bgcolor="#d7d7d7">
                                    <td height="50"
                                        style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                    </td>
                                </tr>
                            </table>
                            <!-- Seperator End -->
            
                        </td>
                    </tr>
                </table>
                <!-- Content End -->
            
                <!-- Footer Start -->
                <div class="bg-gray-dark footer" bgcolor="#464646" height="165" style="background-color: #464646; width: 100%;">
                    <table align="center" bgcolor="#464646" style="max-width: 600px; width: 100%;">
            
                        <tr height="15">
                            <td
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                            </td>
                        </tr>
            
                        <tr>
                            <td align="center"
                                style="color: white !important; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top; font-size: xx-large;">
                                <a href="/index.html" style="color: white;">🏠︎<br><br></a>
                            </td>
                        </tr>
            
                        <tr height="2">
                            <td
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                            </td>
                        </tr>
            
                        <tr>
                            <td align="center"
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                                <p class="text-white"
                                    style="color: white; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                    Copyright © Yuva Sanyuktha. All rights reserved. </p>
                                <p class="text-primary"
                                    style="color: #F16522; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 22px; margin: 0;">
                                </p>
                            </td>
                        </tr>
            
                        <tr height="15">
                            <td
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                            </td>
                        </tr>
            
                        
                        <tr height="10">
                            <td
                                style="color: #464646; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; font-size: 14px; line-height: 16px; vertical-align: top;">
                            </td>
                        </tr>
            
                    </table>
                </div>
                <!-- Footer End -->
            </body>
            
            </html>
            `)
        } else {
            console.log(false)
            const url = `http://localhost:5173/failure`
            return res.redirect(url)
        }
    })
        .catch((error) => {
            console.error(error);
        });

})

// app.get("/status", (req, res) => {

// });
app.listen(process.env.PORT, () => {
    console.log(`Server is running on port ${process.env.PORT}`);
    // console.log(__dirname)
    // sendMail("amount", "paymentType", "authorizationCode")
})